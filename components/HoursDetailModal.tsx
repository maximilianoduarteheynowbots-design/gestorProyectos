
import React, { useEffect, useState } from 'react';
import { getWorkItemDetails } from '../services/azureDevopsService';
import { WorkItem } from '../types';

interface DetailItem {
    id: number;
    title: string;
    hours: number;
    date: string;
    parentId?: number;
}

interface ItemInfo {
    id: number;
    title: string;
    parentId?: number;
    estimatedHours?: number;
    state?: string;
}

interface HoursDetailModalProps {
    developerName: string;
    items: DetailItem[];
    pat: string;
    orgName: string;
    projectName: string;
    onClose: () => void;
}

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    } catch {
        return dateString;
    }
};

const translateState = (state: string = ''): string => {
    const s = state.toLowerCase();
    if (['new', 'to do', 'proposed', 'new'].includes(s)) return 'Por Hacer';
    if (['active', 'in progress', 'committed'].includes(s)) return 'En Progreso';
    if (['resolved', 'done', 'closed', 'completed'].includes(s)) return 'Finalizado';
    if (s === 'removed') return 'Eliminado';
    return state;
};

const getStateColorClass = (state: string = ''): string => {
    const s = state.toLowerCase();
    if (['new', 'to do', 'proposed', 'new'].includes(s)) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600';
    if (['active', 'in progress', 'committed'].includes(s)) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800';
    if (['resolved', 'done', 'closed', 'completed'].includes(s)) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800';
    if (s === 'removed') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800';
    return 'bg-gray-50 text-gray-600 border border-gray-200';
};

export const HoursDetailModal: React.FC<HoursDetailModalProps> = ({ developerName, items, pat, orgName, projectName, onClose }) => {
    // Mapas para almacenar la información de cada nivel jerárquico por ID
    const [parentsMap, setParentsMap] = useState<Map<number, ItemInfo>>(new Map());         // Nivel 1 (Padre/Tarea)
    const [grandParentsMap, setGrandParentsMap] = useState<Map<number, ItemInfo>>(new Map()); // Nivel 2 (Abuelo/PBI)
    const [greatGrandParentsMap, setGreatGrandParentsMap] = useState<Map<number, ItemInfo>>(new Map()); // Nivel 3 (Bisabuelo/Feature)
    
    const [isLoading, setIsLoading] = useState(true);

    // Filtrar items que tengan padre y ordenarlos por fecha descendente
    const validItems = items.filter(item => !!item.parentId);
    const sortedItems = [...validItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalHours = validItems.reduce((sum, item) => sum + item.hours, 0);

    // Helper to build the visualstudio.com URL
    const buildItemUrl = (id: number) => `https://${orgName}.visualstudio.com/${projectName}/_workitems/edit/${id}`;

    useEffect(() => {
        const fetchHierarchy = async () => {
            setIsLoading(true);
            
            try {
                // 1. Nivel 1: Tareas Padres
                // Usamos items original aquí, el filtro de map elimina los que no tienen ID de todos modos,
                // pero lógicamente estamos procesando solo los que mostraremos.
                const parentIds: number[] = Array.from(new Set(validItems.map(i => i.parentId).filter((id): id is number => !!id)));
                
                if (parentIds.length === 0) {
                    setIsLoading(false);
                    return;
                }

                // Solicitamos 'Custom.Horasestimadasdetarea' para mostrar la proyección y 'System.State' para el estado
                const parents = await getWorkItemDetails(pat, `https://dev.azure.com/${orgName}`, parentIds, ['System.Title', 'System.Parent', 'Custom.Horasestimadasdetarea', 'System.State']);
                const pMap = new Map<number, ItemInfo>();
                const grandParentIdsSet = new Set<number>();

                parents.forEach(p => {
                    pMap.set(p.id, { 
                        id: p.id,
                        title: p.fields['System.Title'],
                        parentId: p.fields['System.Parent'],
                        estimatedHours: p.fields['Custom.Horasestimadasdetarea'],
                        state: p.fields['System.State']
                    });
                    if (p.fields['System.Parent']) {
                        grandParentIdsSet.add(p.fields['System.Parent']);
                    }
                });
                setParentsMap(pMap);

                // 2. Nivel 2: Abuelos (PBIs)
                const grandParentIds = Array.from(grandParentIdsSet);
                if (grandParentIds.length === 0) {
                    setIsLoading(false);
                    return;
                }

                const grandParents = await getWorkItemDetails(pat, `https://dev.azure.com/${orgName}`, grandParentIds, ['System.Title', 'System.Parent']);
                const gpMap = new Map<number, ItemInfo>();
                const greatGrandParentIdsSet = new Set<number>();

                grandParents.forEach(gp => {
                    gpMap.set(gp.id, {
                        id: gp.id,
                        title: gp.fields['System.Title'],
                        parentId: gp.fields['System.Parent']
                    });
                    if (gp.fields['System.Parent']) {
                        greatGrandParentIdsSet.add(gp.fields['System.Parent']);
                    }
                });
                setGrandParentsMap(gpMap);

                // 3. Nivel 3: Bisabuelos (Features/Proyectos)
                const greatGrandParentIds = Array.from(greatGrandParentIdsSet);
                if (greatGrandParentIds.length > 0) {
                    const greatGrandParents = await getWorkItemDetails(pat, `https://dev.azure.com/${orgName}`, greatGrandParentIds, ['System.Title']);
                    const ggpMap = new Map<number, ItemInfo>();
                    
                    greatGrandParents.forEach(ggp => {
                        ggpMap.set(ggp.id, {
                            id: ggp.id,
                            title: ggp.fields['System.Title']
                            // No necesitamos subir más niveles por ahora
                        });
                    });
                    setGreatGrandParentsMap(ggpMap);
                }

            } catch (error) {
                console.error("Error fetching hierarchy details", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (validItems.length > 0) {
            fetchHierarchy();
        } else {
            setIsLoading(false);
        }
    }, [items, pat, orgName, projectName]); // Dependemos de 'items' (prop) para reiniciar si cambia

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-light-card dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            Detalle de Horas: <span className="text-brand-primary">{developerName}</span>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total seleccionado: <span className="font-semibold text-gray-800 dark:text-gray-200">{totalHours}h</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : sortedItems.length === 0 ? (
                         <div className="text-center py-10 px-6">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Sin detalles válidos</h3>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">Las horas registradas no tienen tareas padre asociadas.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Fecha</th>
                                    <th className="px-4 py-3">Proyecto</th>
                                    <th className="px-4 py-3">Tarea</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-center">Estimado (Tarea)</th>
                                    <th className="px-4 py-3 text-right rounded-tr-lg">Horas (Reg.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.map((item) => {
                                    // Resolver Jerarquía
                                    const parent = item.parentId ? parentsMap.get(item.parentId) : undefined;
                                    const grandParent = parent?.parentId ? grandParentsMap.get(parent.parentId) : undefined;
                                    const greatGrandParent = grandParent?.parentId ? greatGrandParentsMap.get(grandParent.parentId) : undefined;

                                    // Determinar qué mostrar en la columna "Proyecto" (Bisabuelo > Abuelo)
                                    const contextItem = greatGrandParent || grandParent;
                                    const contextTitle = contextItem ? contextItem.title : '-';
                                    const contextId = contextItem ? contextItem.id : undefined;

                                    return (
                                        <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-900 dark:text-white align-middle">
                                                {formatDate(item.date)}
                                            </td>
                                            <td className="px-4 py-3 max-w-xs truncate text-gray-600 dark:text-gray-300 align-middle" title={contextTitle}>
                                                {contextId ? (
                                                     <a 
                                                        href={buildItemUrl(contextId)}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="font-bold text-brand-primary hover:underline block truncate"
                                                    >
                                                        {contextTitle}
                                                    </a>
                                                ) : (
                                                    <span className="italic text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 max-w-xs text-gray-600 dark:text-gray-300 align-middle" title={parent?.title || 'Sin padre'}>
                                                {parent ? (
                                                    <a 
                                                        href={buildItemUrl(parent.id)}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="hover:text-brand-primary hover:underline font-medium leading-tight truncate w-full block"
                                                    >
                                                        {parent.title}
                                                    </a>
                                                ) : (
                                                    <span className="italic text-gray-400">Sin Tarea Padre</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center align-middle">
                                                 {parent && parent.state && (
                                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${getStateColorClass(parent.state)}`}>
                                                        {translateState(parent.state)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 align-middle">
                                                {parent?.estimatedHours !== undefined ? (
                                                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                        {parent.estimatedHours}h
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-200 align-middle">
                                                {item.hours}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg text-xs text-gray-500 dark:text-gray-400 text-center">
                    Jerarquía analizada: Línea &rarr; Tarea &rarr; PBI &rarr; Proyecto.
                </div>
            </div>
        </div>
    );
};
