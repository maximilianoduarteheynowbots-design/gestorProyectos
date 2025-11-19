

import React, { useMemo } from 'react';
import { type WorkItem, type ChildTaskFilters, type TaskSummary } from '../types';
import { WorkItemList } from './WorkItemList';
import { ChildTaskFilters as FiltersComponent } from './ChildTaskFilters';

interface AllChildTasksViewerProps {
    tasks: WorkItem[];
    isLoading: boolean;
    filters: ChildTaskFilters;
    onFilterChange: (filterKey: keyof ChildTaskFilters, value: string) => void;
    onShowDetails: (item: WorkItem) => void;
    onNavigateToChildren: (item: WorkItem) => void;
    rootItems: WorkItem[];
    taskSummaries: Map<number, TaskSummary>;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-10">
        <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const NoItemsMessage: React.FC<{ totalItemsCount: number }> = ({ totalItemsCount }) => {
    const message = totalItemsCount > 0 
        ? "Ninguna tarea coincide con los filtros actuales." 
        : "No hay tareas para los proyectos mostrados.";
    const subMessage = totalItemsCount > 0 
        ? "Intenta ajustar o limpiar los filtros."
        : "";

    return (
        <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{message}</h3>
            {subMessage && <p className="mt-2 text-gray-500 dark:text-gray-400">{subMessage}</p>}
        </div>
    );
};

export const AllChildTasksViewer: React.FC<AllChildTasksViewerProps> = ({ tasks, isLoading, filters, onFilterChange, onShowDetails, onNavigateToChildren, rootItems, taskSummaries }) => {

    const availableClients = useMemo(() => {
        const clients = new Set(tasks.map(task => task.fields['Custom.Cliente']).filter(Boolean));
        return Array.from(clients).sort();
    }, [tasks]);

    const availableAssignees = useMemo(() => {
        const assignees = new Set(tasks.map(task => task.fields['System.AssignedTo']?.displayName).filter(Boolean));
        return Array.from(assignees as Set<string>).sort();
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Client filter
            const clientMatch = filters.client === 'all' || task.fields['Custom.Cliente'] === filters.client;
            if (!clientMatch) return false;

            // Assignee filter
            const assigneeMatch = filters.assignee === 'all' || task.fields['System.AssignedTo']?.displayName === filters.assignee;
            if (!assigneeMatch) return false;

            // Created Date Filter
            const createdDate = new Date(task.fields['System.CreatedDate']);
            if (filters.createdDateStart) {
                if (createdDate < new Date(filters.createdDateStart)) return false;
            }
            if (filters.createdDateEnd) {
                // Add 1 day to end date to make it inclusive
                const endDate = new Date(filters.createdDateEnd);
                endDate.setDate(endDate.getDate() + 1);
                if (createdDate >= endDate) return false;
            }
            
            // Target Date Filter
            const targetDateStr = task.fields['Microsoft.VSTS.Scheduling.TargetDate'];
            if (filters.targetDateStart && !targetDateStr) return false;
            if (targetDateStr) {
                const targetDate = new Date(targetDateStr);
                 if (filters.targetDateStart) {
                    if (targetDate < new Date(filters.targetDateStart)) return false;
                }
                if (filters.targetDateEnd) {
                    const endDate = new Date(filters.targetDateEnd);
                    endDate.setDate(endDate.getDate() + 1);
                    if (targetDate >= endDate) return false;
                }
            }


            return true;
        });
    }, [tasks, filters]);
    
    const handleResetFilters = () => {
        onFilterChange('client', 'all');
        onFilterChange('assignee', 'all');
        onFilterChange('createdDateStart', '');
        onFilterChange('createdDateEnd', '');
        onFilterChange('targetDateStart', '');
        onFilterChange('targetDateEnd', '');
    };

    return (
         <div className="animate-fade-in">
             <FiltersComponent 
                filters={filters}
                onFilterChange={onFilterChange}
                availableClients={availableClients}
                availableAssignees={availableAssignees}
                onReset={handleResetFilters}
             />
              {isLoading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {filteredTasks.length === 0 ? (
                         <NoItemsMessage totalItemsCount={tasks.length} />
                    ) : (
                        <WorkItemList 
                            items={filteredTasks} 
                            onShowDetails={onShowDetails} 
                            onNavigateToChildren={onNavigateToChildren}
                            taskSummaries={taskSummaries} 
                            rootItems={rootItems}
                        />
                    )}
                </>
            )}
         </div>
    );
};