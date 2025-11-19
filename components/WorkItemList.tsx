

import React, { useMemo } from 'react';
import { type WorkItem, type TaskSummary } from '../types';

interface WorkItemListProps {
    items: WorkItem[];
    onShowDetails: (item: WorkItem) => void;
    onNavigateToChildren: (item: WorkItem) => void;
    taskSummaries: Map<number, TaskSummary>;
    rootItems?: WorkItem[];
    isLoadingSummaries?: boolean;
    taskToPbiTitleMap?: Map<number, string>;
}

const getWorkItemTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
        case 'product backlog item':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'task':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'bug':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case 'feature':
             return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case 'linea':
             return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getWorkItemStateColor = (state: string) => {
    switch (state.toLowerCase()) {
        case 'new':
        case 'proposed':
            return 'border-gray-500';
        case 'active':
        case 'in progress':
             return 'border-blue-500';
        case 'resolved':
        case 'done':
            return 'border-green-500';
        case 'closed':
            return 'border-purple-500';
        default:
            return 'border-gray-500';
    }
}

const getWorkItemStateChipColor = (state: string) => {
    switch (state.toLowerCase()) {
        case 'new':
        case 'to do':
        case 'proposed':
            return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        case 'active':
        case 'in progress':
             return 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'resolved':
        case 'done':
            return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'closed':
            return 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'removed':
            return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200';
        default:
            return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
};

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Sin Fecha';
    try {
        const date = new Date(dateString);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};


const tagColors = [
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
];

const getTagColor = (index: number) => tagColors[index % tagColors.length];

const InfoPill: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <div className="text-sm font-semibold truncate" title={typeof children === 'string' ? children : ''}>
            {children}
        </div>
    </div>
);


export const WorkItemList: React.FC<WorkItemListProps> = ({ items, onShowDetails, onNavigateToChildren, taskSummaries, rootItems, isLoadingSummaries, taskToPbiTitleMap }) => {
    
    const parentPbiMap = useMemo(() => {
        if (!rootItems || rootItems.length === 0) {
            return null;
        }
        return new Map(rootItems.map(item => [item.id, item.fields['System.Title']]));
    }, [rootItems]);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
                const hasChildren = item.relations?.some(rel => rel.rel === 'System.LinkTypes.Hierarchy-Forward') || false;
                const summary = taskSummaries.get(item.id);
                const tags = item.fields['System.Tags']?.split('; ').filter(Boolean) || [];
                const isLinea = item.fields['System.WorkItemType'].toLowerCase() === 'linea';

                const itemType = item.fields['System.WorkItemType'];
                const state = item.fields['System.State'];
                const boardColumn = item.fields['System.BoardColumn'] as string | undefined;

                let parentTitle: string | null | undefined = null;
                if (taskToPbiTitleMap) {
                    parentTitle = taskToPbiTitleMap.get(item.id);
                } else {
                    const parentId = item.fields['System.Parent'];
                    parentTitle = parentId && parentPbiMap ? parentPbiMap.get(parentId) : null;
                }

                const borderColorClass = itemType.toLowerCase() === 'product backlog item' 
                    ? 'border-blue-500' 
                    : getWorkItemStateColor(state);

                const cardBaseClasses = `bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4 flex flex-col justify-between transition-all duration-200 border-l-4 ${borderColorClass}`;
                const cardInteractiveClasses = hasChildren ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : "";
                
                const chipText = boardColumn || state;
                
                const estimated = summary?.estimated ?? 0;
                const invested = summary?.invested ?? 0;
                const percentage = estimated > 0 ? Math.min(Math.round((invested / estimated) * 100), 100) : 0;
                
                const isPbi = item.fields['System.WorkItemType'].toLowerCase() === 'product backlog item';
                const projectedHours = (item.fields['Custom.HorasPropuesta'] as number) || 0;

                const handleCardClick = () => {
                    if (hasChildren) {
                        onNavigateToChildren(item);
                    }
                };

                const handleDetailClick = (e: React.MouseEvent) => {
                    e.stopPropagation(); 
                    onShowDetails(item);
                };

                const handleCardKeyPress = (e: React.KeyboardEvent) => {
                    if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
                        onNavigateToChildren(item);
                    }
                };

                return (
                    <div
                        key={item.id}
                        onClick={handleCardClick}
                        className={`${cardBaseClasses} ${cardInteractiveClasses}`}
                        role={hasChildren ? "button" : "article"}
                        tabIndex={hasChildren ? 0 : -1}
                        onKeyPress={handleCardKeyPress}
                        aria-label={hasChildren ? `Navegar a los hijos de ${item.fields['System.Title']}` : item.fields['System.Title']}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full ${getWorkItemStateChipColor(state)}`}>
                                    {chipText}
                                </span>
                                {hasChildren && (
                                    <div className="flex items-center text-xs text-gray-400" title="Contiene tareas hijas">
                                        <span className="mr-1">Hijos</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <p className="font-bold text-gray-800 dark:text-gray-100 mb-3">{`#${item.id} - ${item.fields['System.Title']}`}</p>
                            
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {tags.map((tag, index) => (
                                        <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTagColor(index)}`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-3">
                                {parentTitle && (
                                    <InfoPill label="Proyecto Padre">
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                            </svg>
                                            <span className="truncate" title={parentTitle}>{parentTitle}</span>
                                        </div>
                                    </InfoPill>
                                )}
                                <InfoPill label="Desarrollador">{item.fields['System.AssignedTo']?.displayName || 'Sin Asignar'}</InfoPill>
                                
                                {isLinea ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoPill label="Fecha (Línea)">{formatDate(item.fields['Custom.Fechalinea'])}</InfoPill>
                                        <InfoPill label="Horas">{`${item.fields['Custom.Horas'] ?? 0}h`}</InfoPill>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                             <InfoPill label="Fecha de ingreso">{formatDate(item.fields['Custom.FechadeIngreso'])}</InfoPill>
                                             <InfoPill label="Entrega estimada">{formatDate(item.fields['Custom.Fechadeentregaestimada'])}</InfoPill>
                                        </div>
                                         {isPbi ? (
                                            <div className="grid grid-cols-3 gap-3 p-2 bg-light-bg dark:bg-dark-bg/50 rounded-md">
                                                <InfoPill label="H. Proyectadas">
                                                    <span>{`${projectedHours}h`}</span>
                                                </InfoPill>
                                                <InfoPill label="H. Planificadas">
                                                   {isLoadingSummaries ? '...' : <span>{`${summary?.estimated ?? 0}h`}</span>}
                                                </InfoPill>
                                                <InfoPill label="H. Invertidas">
                                                   {isLoadingSummaries ? '...' : <span>{`${summary?.invested ?? 0}h`}</span>}
                                                </InfoPill>
                                            </div>
                                         ) : (
                                            <div className="grid grid-cols-2 gap-3 p-2 bg-light-bg dark:bg-dark-bg/50 rounded-md">
                                                 <InfoPill label="H. Planificadas">
                                                    {isLoadingSummaries ? '...' : <span>{`${summary?.estimated ?? 0}h`}</span>}
                                                 </InfoPill>
                                                 <InfoPill label="H. Invertidas">
                                                    {isLoadingSummaries ? '...' : <span>{`${summary?.invested ?? 0}h`}</span>}
                                                 </InfoPill>
                                            </div>
                                         )}
                                    </>
                                )}
                            </div>
                            
                            {!isLinea && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1 text-xs">
                                        <span className="font-semibold text-gray-600 dark:text-gray-300">Progreso de Horas (Planificadas)</span>
                                        <span className={`font-bold ${invested > estimated ? 'text-red-500' : ''}`}>{percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div 
                                            className={`${invested > estimated ? 'bg-red-500' : 'bg-green-500'} h-2.5 rounded-full transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="mt-4 flex justify-end items-center gap-2">
                             <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 -m-2 rounded-full text-gray-400 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label={`Abrir en Azure DevOps: ${item.fields['System.Title']}`}
                                title="Abrir en Azure DevOps"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                </svg>
                            </a>
                            <button
                                onClick={handleDetailClick}
                                className="flex items-center text-sm text-brand-primary font-semibold p-2 -m-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors"
                                aria-label={`Ver detalles de ${item.fields['System.Title']}`}
                            >
                                Ver detalles
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
