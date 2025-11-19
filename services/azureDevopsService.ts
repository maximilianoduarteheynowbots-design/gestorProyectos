
import { type WiqlResponse, type WorkItemBatchResponse, type WorkItem, type CommentsResponse, type Comment, type Profile } from '../types';

interface WiqlLinkResponse {
    workItemRelations: {
        target: { id: number; };
    }[];
}

const fetchAzureApi = async <T,>(url: string, pat: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Basic ${btoa(`:${pat}`)}`);
    if (options.method === 'POST' || options.method === 'PATCH') {
        headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(
                'La solicitud de red falló (Error: Failed to fetch). Esto suele ocurrir por un problema de CORS (Cross-Origin Resource Sharing) o de conectividad. ' +
                'Asegúrate de tener conexión a internet y que ninguna extensión del navegador (como un bloqueador de anuncios) esté impidiendo la comunicación con dev.azure.com.'
            );
        }
        // Re-throw unexpected errors
        throw error;
    }

    // Lee la respuesta como texto primero, ya que podría ser JSON o HTML.
    const responseText = await response.text();

    if (!response.ok) {
        let errorMessage = `Error de API: ${response.status} ${response.statusText}`;
        if (response.status === 401) {
            errorMessage = 'Falló la autenticación (Error 401). Por favor, verifica tu Token de Acceso Personal (PAT). Puede que sea inválido o haya expirado.';
        } else if (responseText) {
             try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || `Error de API: ${response.status} - ${errorData.typeName || 'Error desconocido'}`;
             } catch (e) {
                const lowerResponse = responseText.trim().toLowerCase();
                if (lowerResponse.startsWith('<!doctype') || lowerResponse.startsWith('<html')) {
                     errorMessage = `Se recibió una respuesta de error inesperada (HTML) del servidor (Estado: ${response.status}). Esto puede ser causado por un PAT inválido/expirado, permisos insuficientes, o una URL incorrecta.`;
                } else {
                    errorMessage = `Error de API: ${response.status} ${response.statusText}. La respuesta del servidor no fue JSON.`;
                }
             }
        }
        throw new Error(errorMessage);
    }
    
    if (!responseText) {
        return null as T;
    }
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse JSON response despite a 2xx status:", e);
        console.error("Response text snippet:", responseText.substring(0, 500));

        const lowerResponse = responseText.trim().toLowerCase();
        // Comprobación más amplia para detectar DOCTYPEs de HTML5 o XHTML (que es lo que devuelve la página de login de Azure)
        if (lowerResponse.startsWith('<!doctype') || lowerResponse.startsWith('<html')) {
             throw new Error(
                'Se recibió una respuesta inesperada (HTML) del servidor en lugar de JSON, a pesar de un código de estado exitoso. ' +
                'Esto suele ocurrir si la URL de la organización/proyecto es incorrecta o si el PAT no es válido, lo que provoca una redirección a la página de inicio de sesión de Azure DevOps.'
             );
        }

        throw new Error(`La respuesta del servidor no es un JSON válido. La respuesta comenzó con: "${responseText.substring(0, 50)}..."`);
    }
};


export const getInitialWorkItems = async (pat: string, orgUrl: string, projectName: string): Promise<WorkItem[]> => {
    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    const query = {
        query: "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Product Backlog Item' ORDER BY [System.Id] DESC"
    };

    const wiqlResult = await fetchAzureApi<WiqlResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(query)
    });

    if (!wiqlResult || !wiqlResult.workItems || wiqlResult.workItems.length === 0) {
        return [];
    }

    const ids = wiqlResult.workItems.map(item => item.id);
    return getWorkItemDetails(pat, orgUrl, ids);
};

export const getAnalyzableWorkItemsForProject = async (pat: string, orgUrl: string, projectName: string): Promise<WorkItem[]> => {
    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    const query = {
        query: "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] IN ('Task', 'Linea') ORDER BY [System.Id] DESC"
    };

    const wiqlResult = await fetchAzureApi<WiqlResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(query)
    });

    if (!wiqlResult || !wiqlResult.workItems || wiqlResult.workItems.length === 0) {
        return [];
    }

    const ids = wiqlResult.workItems.map(item => item.id);
    return getWorkItemDetails(pat, orgUrl, ids);
};

export const getWorkItemDetails = async (pat: string, orgUrl: string, ids: number[], fields?: string[]): Promise<WorkItem[]> => {
    if (ids.length === 0) return [];

    const BATCH_SIZE = 200; // Límite de la API de Azure DevOps
    const idChunks: number[][] = [];
    const uniqueIds = [...new Set(ids)];

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
        idChunks.push(uniqueIds.slice(i, i + BATCH_SIZE));
    }

    const fetchPromises = idChunks.map(async (chunk) => {
        const idsString = chunk.join(',');
        let detailsUrl: string;

        if (fields) {
            detailsUrl = `${orgUrl}/_apis/wit/workitems?ids=${idsString}&fields=${fields.join(',')}&api-version=7.1-preview.3`;
        } else {
            detailsUrl = `${orgUrl}/_apis/wit/workitems?ids=${idsString}&$expand=relations&api-version=7.1-preview.3`;
        }

        const detailsResult = await fetchAzureApi<WorkItemBatchResponse>(detailsUrl, pat, {
            method: 'GET'
        });

        return detailsResult?.value || [];
    });

    const resultsArrays = await Promise.all(fetchPromises);
    return resultsArrays.flat();
};

export const getDirectChildWorkItems = async (pat: string, orgUrl: string, projectName: string, parentIds: number[]): Promise<WorkItem[]> => {
    if (parentIds.length === 0) {
        return [];
    }

    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    const query = {
        query: `
            SELECT [System.Id]
            FROM WorkItemLinks
            WHERE
                Source.[System.Id] IN (${parentIds.join(',')})
                AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
            MODE (MustContain)
        `
    };

    const linkResult = await fetchAzureApi<WiqlLinkResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(query)
    });

    if (!linkResult || !linkResult.workItemRelations || linkResult.workItemRelations.length === 0) {
        return [];
    }

    const childIds = [...new Set(linkResult.workItemRelations.map(rel => rel.target.id))];
    
    // Fetch full details to ensure relations are expanded for navigation checks.
    // Specifying a list of fields prevents the API from returning the 'relations' data,
    // which is needed to know if a task has its own children.
    return getWorkItemDetails(pat, orgUrl, childIds);
};


export const getDescendantHourSummary = async (
    pat: string, 
    orgUrl: string,
    projectName: string,
    rootItemIds: number[],
    dateRange?: { startDate?: string; endDate?: string }
): Promise<{ estimated: number; invested: number }> => {
    if (rootItemIds.length === 0) {
        return { estimated: 0, invested: 0 };
    }

    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    const query = {
        query: `
            SELECT [System.Id]
            FROM WorkItemLinks
            WHERE
                Source.[System.Id] IN (${rootItemIds.join(',')})
                AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
                AND Target.[System.WorkItemType] IN ('Task', 'Linea')
            MODE (Recursive)
        `
    };

    const linkResult = await fetchAzureApi<WiqlLinkResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(query)
    });

    // FIX: Corrected comparison from `!array.length === 0` to `array.length === 0`.
    if (!linkResult || !linkResult.workItemRelations || linkResult.workItemRelations.length === 0) {
        return { estimated: 0, invested: 0 };
    }

    const descendantIds = [...new Set(linkResult.workItemRelations.map(rel => rel.target.id))];

    const useDateFilter = dateRange && (dateRange.startDate || dateRange.endDate);

    if (!useDateFilter) {
        // Original logic for global hours
        const hourDetails = await getWorkItemDetails(pat, orgUrl, descendantIds, [
            'System.WorkItemType',
            'Custom.Horasestimadasdetarea',
            'Custom.Horas'
        ]);

        let estimated = 0;
        let invested = 0;
        for (const item of hourDetails) {
            if (item.fields['System.WorkItemType'] === 'Task' && typeof item.fields['Custom.Horasestimadasdetarea'] === 'number') {
                estimated += item.fields['Custom.Horasestimadasdetarea'];
            }
            if (item.fields['System.WorkItemType'].toLowerCase() === 'linea' && typeof item.fields['Custom.Horas'] === 'number') {
                invested += item.fields['Custom.Horas'];
            }
        }
        return { estimated: Math.round(estimated), invested: Math.round(invested) };
    }

    // New logic with date filtering
    const allDetails = await getWorkItemDetails(pat, orgUrl, descendantIds, [
        'System.WorkItemType',
        'System.CreatedDate',
        'System.Parent',
        'Custom.Horasestimadasdetarea',
        'Custom.Horas',
        'Custom.Fechalinea'
    ]);

    let invested = 0;
    const relevantTaskIds = new Set<number>();

    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);

    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    // 1. Calculate invested hours and find related parent tasks
    for (const item of allDetails) {
        if (item.fields['System.WorkItemType'].toLowerCase() === 'linea') {
            const lineaDateStr = item.fields['Custom.Fechalinea'];
            if (lineaDateStr && typeof item.fields['Custom.Horas'] === 'number') {
                const lineaDate = new Date(lineaDateStr);
                const inRange = (!startDate || lineaDate >= startDate) && (!endDate || lineaDate <= endDate);
                if (inRange) {
                    invested += item.fields['Custom.Horas'];
                    if (item.fields['System.Parent']) {
                        relevantTaskIds.add(item.fields['System.Parent']);
                    }
                }
            }
        }
    }

    // 2. Find tasks that were created in the date range
    for (const item of allDetails) {
        if (item.fields['System.WorkItemType'] === 'Task') {
            const createdDate = new Date(item.fields['System.CreatedDate']);
            const inRange = (!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate);
            if (inRange) {
                relevantTaskIds.add(item.id);
            }
        }
    }
    
    // 3. Sum estimated hours from all relevant tasks
    let estimated = 0;
    for (const item of allDetails) {
        if (item.fields['System.WorkItemType'] === 'Task' && relevantTaskIds.has(item.id)) {
            if (typeof item.fields['Custom.Horasestimadasdetarea'] === 'number') {
                estimated += item.fields['Custom.Horasestimadasdetarea'];
            }
        }
    }
    
    return { estimated: Math.round(estimated), invested: Math.round(invested) };
};

export const getDescendantLineas = async (pat: string, orgUrl: string, projectName: string, rootItemId: number): Promise<WorkItem[]> => {
    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    const query = {
        query: `
            SELECT [System.Id]
            FROM WorkItemLinks
            WHERE
                Source.[System.Id] = ${rootItemId}
                AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
                AND Target.[System.WorkItemType] = 'Linea'
            MODE (Recursive)
        `
    };

    const linkResult = await fetchAzureApi<WiqlLinkResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(query)
    });

    if (!linkResult || !linkResult.workItemRelations || linkResult.workItemRelations.length === 0) {
        return [];
    }

    const descendantIds = [...new Set(linkResult.workItemRelations.map(rel => rel.target.id))];

    if (descendantIds.length === 0) {
        return [];
    }

    return getWorkItemDetails(pat, orgUrl, descendantIds, [
        'System.AssignedTo',
        'Custom.Horas'
    ]);
};

export const getSingleTaskDescendantHourSummary = async (pat: string, orgUrl: string, projectName: string, rootTaskId: number): Promise<{ estimated: number; invested: number }> => {
    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    const query = {
        query: `
            SELECT [System.Id]
            FROM WorkItemLinks
            WHERE
                Source.[System.Id] = ${rootTaskId}
                AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
                AND Target.[System.WorkItemType] IN ('Task', 'Linea')
            MODE (Recursive)
        `
    };

    const linkResult = await fetchAzureApi<WiqlLinkResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(query)
    });

    // FIX: Corrected comparison from `!array.length === 0` to `array.length === 0`.
    if (!linkResult || !linkResult.workItemRelations || linkResult.workItemRelations.length === 0) {
        return { estimated: 0, invested: 0 };
    }

    const descendantIds = [...new Set(linkResult.workItemRelations.map(rel => rel.target.id))];

    if (descendantIds.length === 0) {
        return { estimated: 0, invested: 0 };
    }

    const hourDetails = await getWorkItemDetails(pat, orgUrl, descendantIds, [
        'System.WorkItemType',
        'Custom.Horasestimadasdetarea',
        'Custom.Horas'
    ]);

    let estimated = 0;
    let invested = 0;
    for (const item of hourDetails) {
        if (item.fields['System.WorkItemType'] === 'Task' && typeof item.fields['Custom.Horasestimadasdetarea'] === 'number') {
            estimated += item.fields['Custom.Horasestimadasdetarea'];
        }
        if (item.fields['System.WorkItemType'].toLowerCase() === 'linea' && typeof item.fields['Custom.Horas'] === 'number') {
            invested += item.fields['Custom.Horas'];
        }
    }
    
    return { estimated: Math.round(estimated), invested: Math.round(invested) };
};


export const getWorkItemComments = async (pat: string, orgUrl: string, projectName: string, workItemId: number): Promise<Comment[]> => {
    const commentsUrl = `${orgUrl}/${projectName}/_apis/wit/workitems/${workItemId}/comments?$expand=renderedText&api-version=7.1-preview.3`;
    const result = await fetchAzureApi<CommentsResponse>(commentsUrl, pat);
    return result?.comments || [];
};

export const getUserProfile = async (pat: string, orgName: string): Promise<{ displayName: string; avatar: string; }> => {
    const profileUrl = `https://vssps.dev.azure.com/${orgName}/_apis/profile/profiles/me?api-version=7.1-preview.1`;
    const profileData = await fetchAzureApi<Profile>(profileUrl, pat);

    const displayName = profileData?.coreAttributes?.DisplayName?.value || 'Usuario';
    const avatarBase64 = profileData?.coreAttributes?.Avatar?.value?.value || '';
    
    return {
        displayName,
        avatar: avatarBase64 ? `data:image/png;base64,${avatarBase64}` : ''
    };
};
