

import React from 'react';
// FIX: Aliased imported type to avoid name collision with the component.
import { type ChildTaskFilters as ChildTaskFiltersType } from '../types';

interface ChildTaskFiltersProps {
    filters: ChildTaskFiltersType;
    onFilterChange: (filterKey: keyof ChildTaskFiltersType, value: string) => void;
    availableClients: string[];
    availableAssignees: string[];
    onReset: () => void;
}

export const ChildTaskFilters: React.FC<ChildTaskFiltersProps> = ({
    filters,
    onFilterChange,
    availableClients,
    availableAssignees,
    onReset
}) => {
    
    return (
        <div className="p-4 mb-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Client Filter */}
                <div>
                    <label htmlFor="client-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cliente
                    </label>
                    <select
                        id="client-filter"
                        value={filters.client}
                        onChange={(e) => onFilterChange('client', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                        <option value="all">Todos</option>
                        {availableClients.map(client => (
                            <option key={client} value={client}>{client}</option>
                        ))}
                    </select>
                </div>

                {/* Assignee Filter */}
                <div>
                    <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Asignado a
                    </label>
                    <select
                        id="assignee-filter"
                        value={filters.assignee}
                        onChange={(e) => onFilterChange('assignee', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                        <option value="all">Todos</option>
                        {availableAssignees.map(assignee => (
                            <option key={assignee} value={assignee}>{assignee}</option>
                        ))}
                    </select>
                </div>
                
                {/* Created Date Filter */}
                <div className="md:col-span-1">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de Creación
                    </label>
                    <div className="flex gap-2">
                         <input
                            type="date"
                            aria-label="Fecha de creación desde"
                            value={filters.createdDateStart}
                            onChange={(e) => onFilterChange('createdDateStart', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                         <input
                            type="date"
                            aria-label="Fecha de creación hasta"
                            value={filters.createdDateEnd}
                            onChange={(e) => onFilterChange('createdDateEnd', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                </div>

                 {/* Target Date Filter */}
                <div className="md:col-span-1">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de Entrega
                    </label>
                    <div className="flex gap-2">
                         <input
                            type="date"
                            aria-label="Fecha de entrega desde"
                            value={filters.targetDateStart}
                            onChange={(e) => onFilterChange('targetDateStart', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                         <input
                            type="date"
                            aria-label="Fecha de entrega hasta"
                            value={filters.targetDateEnd}
                            onChange={(e) => onFilterChange('targetDateEnd', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                </div>
            </div>
             <div className="flex justify-end">
                <button
                    onClick={onReset}
                    className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    Limpiar Filtros
                </button>
            </div>
        </div>
    );
};
