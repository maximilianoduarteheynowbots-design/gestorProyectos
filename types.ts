
export interface WorkItemReference {
    id: number;
    url: string;
}

export interface WiqlResponse {
    workItems: WorkItemReference[];
}

export interface WorkItem {
    id: number;
    fields: {
        [key: string]: any;
        'System.Title': string;
        'System.State': string;
        'System.WorkItemType': string;
        'System.AssignedTo'?: {
            displayName: string;
            uniqueName: string;
        };
        'System.Parent'?: number;
        'System.Tags'?: string;
        'Custom.FechadeIngreso'?: string;
        'Custom.Fechadeentregaestimada'?: string;
    };
    relations?: WorkItemRelation[];
    url: string;
}

export interface WorkItemBatchResponse {
    count: number;
    value: WorkItem[];
}

export interface WorkItemRelation {
    rel: string;
    url: string;
    attributes: {
        isLocked: boolean;
        name: string;
    };
}

export interface NavigationLevel {
    id: number; // 0 for root, otherwise parent work item ID
    title: string;
}

export interface Filters {
    type: string;
    state: string;
    assignee: string;
    tag: string;
}

export interface ChildTaskFilters {
    client: string;
    assignee: string;
    createdDateStart: string;
    createdDateEnd: string;
    targetDateStart: string;
    targetDateEnd: string;
}

export interface TaskSummary {
    estimated: number;
    invested: number;
    discrepancy?: boolean;
    ownEstimated?: number;
    childEstimatedSum?: number;
}

export interface Comment {
    id: number;
    text: string;
    renderedText?: string;
    createdBy: {
        displayName: string;
        imageUrl?: string;
    };
    createdDate: string;
}

export interface CommentsResponse {
    count: number;
    comments: Comment[];
}

export interface DashboardFilters {
    states: string[];
    tags: string[];
}

export interface DashboardSort {
    field: 'createdDate' | 'targetDate' | 'title' | 'id';
    direction: 'asc' | 'desc';
}

export interface WorkloadPlan {
    // Key is week index (0, 1, ...), value is an object
    // where key is project ID and value is assigned hours.
    [weekIndex: string]: {
        [projectId: string]: number;
    };
}

// --- Tipos para el Perfil de Usuario ---
export interface ProfileAttribute {
    value: any;
    descriptor: string;
}

export interface ProfileAvatar {
    value: {
        value: string; // Base64
        timeStamp: string;
    };
    descriptor: string;
}

export interface Profile {
    id: string;
    coreAttributes: {
        DisplayName: ProfileAttribute;
        Avatar: ProfileAvatar;
    };
}

// --- Tipos para la Calculadora de Rentabilidad ---
export interface ProfitabilityResult {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
}