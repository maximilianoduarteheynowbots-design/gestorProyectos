
import React from 'react';
import { type DashboardFilters, type DashboardSort } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { ModernMultiSelect } from './ModernMultiSelect';
import { ModernSelect } from './ModernSelect';

interface DashboardProjectFiltersProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    
    filters: DashboardFilters;
    onFilterChange: (filterKey: keyof DashboardFilters, value: string[]) => void;
    
    sort: DashboardSort;
    onSortChange: (field: DashboardSort['field'], direction: DashboardSort['direction']) => void;

    availableStates: string[];
    availableTags: string[];

    includeCompleted: boolean;
    onIncludeCompletedChange: (checked: boolean) => void;
}

export const DashboardProjectFilters: React.FC<DashboardProjectFiltersProps> = ({
    searchTerm, 
    onSearchChange,
    filters, 
    onFilterChange,
    sort, 
    onSortChange,
    availableStates, 
    availableTags,
    includeCompleted,
    onIncludeCompletedChange
}) => {
    
    const handleSortChange = (value: string) => {
        const [field, direction] = value.split('-') as [DashboardSort['field'], DashboardSort['direction']];
        onSortChange(field, direction);
    };

    const baseInputClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary";
    
    const stateOptions = availableStates.map(s => ({ value: s, label: s }));
    const tagOptions = availableTags.map(t => ({ value: t, label: t }));
    
    const sortOptions = [
        { value: 'id-desc', label: 'ID (Más nuevos)' },
        { value: 'id-asc', label: 'ID (Más antiguos)' },
        { value: 'createdDate-desc', label: 'F. Ingreso (Desc)' },
        { value: 'createdDate-asc', label: 'F. Ingreso (Asc)' },
        { value: 'targetDate-desc', label: 'F. Entrega (Desc)' },
        { value: 'targetDate-asc', label: 'F. Entrega (Asc)' },
        { value: 'title-asc', label: 'Título (A-Z)' },
        { value: 'title-desc', label: 'Título (Z-A)' },
    ];

    return (
         <CollapsibleSection title="Filtros y Orden de la Vista">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                 <div className="lg:col-span-2">
                    <label htmlFor="dashboard-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Búsqueda Rápida
                    </label>
                     <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                             <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input 
                            id="dashboard-search"
                            type="search"
                            placeholder="Buscar por ID o título..."
                            value={searchTerm}
                            onChange={e => onSearchChange(e.target.value)}
                            className={`${baseInputClasses} pl-10`}
                        />
                    </div>
                </div>

                <ModernSelect
                    label="Ordenar por"
                    options={sortOptions}
                    selected={`${sort.field}-${sort.direction}`}
                    onChange={handleSortChange}
                />
                
                <div className="flex flex-col justify-end h-full">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={includeCompleted} onChange={e => onIncludeCompletedChange(e.target.checked)} />
                            <div className={`block w-14 h-8 rounded-full transition ${includeCompleted ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${includeCompleted ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Incluir Tareas Finalizadas
                        </div>
                    </label>
                 </div>

                 <ModernMultiSelect
                    label="Estado"
                    options={stateOptions}
                    selected={filters.states}
                    onChange={(selected) => onFilterChange('states', selected)}
                    onSelectAll={() => onFilterChange('states', availableStates)}
                    onDeselectAll={() => onFilterChange('states', [])}
                />
                 
                 <ModernMultiSelect
                    label="Tags (O)"
                    options={tagOptions}
                    selected={filters.tags}
                    onChange={(selected) => onFilterChange('tags', selected)}
                    onSelectAll={() => onFilterChange('tags', availableTags)}
                    onDeselectAll={() => onFilterChange('tags', [])}
                />
            </div>
        </CollapsibleSection>
    );
};
