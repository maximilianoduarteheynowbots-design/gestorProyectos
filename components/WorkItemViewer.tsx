import React from 'react';
import { type WorkItem, type NavigationLevel, type Filters, type TaskSummary } from '../types';
import { WorkItemList } from './WorkItemList';
import { Breadcrumbs } from './Breadcrumbs';
import { WorkItemFilters } from './WorkItemFilters';
import { Pagination } from './Pagination';

interface WorkItemViewerProps {
    isLoading: boolean;
    error: string | null;
    workItems: WorkItem[];
    totalItemsCount: number;
    navigationStack: NavigationLevel[];
    onShowDetails: (item: WorkItem) => void;
    onNavigateToChildren: (item: WorkItem) => void;
    onBreadcrumbClick: (levelIndex: number) => void;
    filters: Filters;
    onFilterChange: (filterKey: keyof Filters, value: string) => void;
    availableTypes: string[];
    availableStates: string[];
    availableAssignees: string[];
    taskSummaries: Map<number, TaskSummary>;
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    availableTags?: string[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-10">
        <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const NoItemsMessage: React.FC<{ totalItemsCount: number, isRootLevel: boolean }> = ({ totalItemsCount, isRootLevel }) => {
    let message: string;
    let subMessage: string;

    if (totalItemsCount > 0) {
        message = "Ningún elemento coincide con los filtros actuales.";
        subMessage = "Intenta ajustar o limpiar los filtros para ver más resultados.";
    } else if (isRootLevel) {
        message = "No se encontraron 'Product Backlog Items'.";
        subMessage = "";
    } else {
        message = "No hay elementos en este nivel.";
        subMessage = "";
    }


    return (
        <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{message}</h3>
            {subMessage && <p className="mt-2 text-gray-500 dark:text-gray-400">{subMessage}</p>}
        </div>
    );
};


export const WorkItemViewer: React.FC<WorkItemViewerProps> = ({
    isLoading,
    error,
    workItems,
    totalItemsCount,
    navigationStack,
    onShowDetails,
    onNavigateToChildren,
    onBreadcrumbClick,
    filters,
    onFilterChange,
    availableTypes,
    availableStates,
    availableAssignees,
    taskSummaries,
    searchTerm,
    onSearchChange,
    availableTags,
    currentPage,
    totalPages,
    onPageChange,
}) => {
    const isRootLevel = navigationStack.length === 1;
    const showFilters = !isLoading && (
        isRootLevel ||
        availableTypes.length > 0 || 
        availableStates.length > 0 || 
        availableAssignees.length > 0 ||
        availableTags.length > 0
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumbs stack={navigationStack} onNavigate={onBreadcrumbClick} />
            
            {showFilters && (
                <WorkItemFilters
                    filters={filters}
                    onFilterChange={onFilterChange}
                    availableTypes={availableTypes}
                    availableStates={availableStates}
                    availableAssignees={availableAssignees}
                    availableTags={availableTags || []}
                    searchTerm={searchTerm ?? ''}
                    onSearchChange={onSearchChange ?? (() => {})}
                    isRootLevel={isRootLevel}
                />
            )}

            {error && (
                <div className="my-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {workItems.length === 0 && !error ? (
                         <NoItemsMessage totalItemsCount={totalItemsCount} isRootLevel={isRootLevel} />
                    ) : (
                        <WorkItemList 
                            items={workItems} 
                            onShowDetails={onShowDetails} 
                            onNavigateToChildren={onNavigateToChildren} 
                            taskSummaries={taskSummaries} 
                        />
                    )}
                     {isRootLevel && workItems.length > 0 && currentPage && totalPages && onPageChange && totalPages > 1 && (
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={onPageChange}
                        />
                    )}
                </>
            )}
        </div>
    );
};