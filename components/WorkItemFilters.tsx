import React from 'react';
import { type Filters } from '../types';

interface WorkItemFiltersProps {
    filters: Filters;
    onFilterChange: (filterKey: keyof Filters, value: string) => void;
    availableTypes: string[];
    availableStates: string[];
    availableAssignees: string[];
    availableTags: string[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    isRootLevel: boolean;
}

export const WorkItemFilters: React.FC<WorkItemFiltersProps> = ({
    filters,
    onFilterChange,
    availableTypes,
    availableStates,
    availableAssignees,
    availableTags,
    searchTerm,
    onSearchChange,
    isRootLevel,
}) => {
    const renderSelect = (
        id: keyof Filters,
        label: string,
        options: string[]
    ) => (
        <div className="flex-1 min-w-[150px]">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <select
                id={id}
                name={id}
                value={filters[id]}
                onChange={(e) => onFilterChange(id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
                <option value="all">Todos</option>
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="p-4 mb-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm">
             {isRootLevel && (
                 <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por ID, título o tag..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
             )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {availableTypes.length > 0 && renderSelect('type', 'Tipo', availableTypes)}
                {availableStates.length > 0 && renderSelect('state', 'Estado', availableStates)}
                {availableAssignees.length > 0 && renderSelect('assignee', 'Asignado a', availableAssignees)}
                {availableTags.length > 0 && renderSelect('tag', 'Tag', availableTags)}
            </div>
        </div>
    );
};