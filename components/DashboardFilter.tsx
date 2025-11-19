import React, { useState, useMemo } from 'react';
import { type WorkItem } from '../types';

interface DashboardFilterProps {
    rootWorkItems: WorkItem[];
    selectedIds: number[];
    onSelectionChange: (ids: number[]) => void;
    dateRange: { startDate: string; endDate: string };
    onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
    onDateReset: () => void;
}

export const DashboardFilter: React.FC<DashboardFilterProps> = ({ 
    rootWorkItems, 
    selectedIds, 
    onSelectionChange,
    dateRange,
    onDateChange,
    onDateReset
}) => {
    const [pbiSearchTerm, setPbiSearchTerm] = useState('');

    const filteredPbis = useMemo(() => {
        if (!pbiSearchTerm) {
            return rootWorkItems;
        }
        const lowercasedFilter = pbiSearchTerm.toLowerCase();
        return rootWorkItems.filter(item =>
            item.id.toString().includes(lowercasedFilter) ||
            item.fields['System.Title'].toLowerCase().includes(lowercasedFilter)
        );
    }, [rootWorkItems, pbiSearchTerm]);
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedOptions = Array.from(e.target.selectedOptions).map((option: HTMLOptionElement) => parseInt(option.value, 10));
        onSelectionChange(selectedOptions);
    };

    const handleSelectAll = () => {
        onSelectionChange(filteredPbis.map(pbi => pbi.id));
    };

    const handleDeselectAll = () => {
        onSelectionChange([]);
    };

    const buttonClasses = "text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-1 px-3 rounded-md transition-colors";

    return (
        <div className="p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm space-y-4">
            <div>
                <label htmlFor="pbi-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar Dashboard por PBI
                </label>
                
                <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        placeholder="Buscar PBI por ID o título..."
                        value={pbiSearchTerm}
                        onChange={(e) => setPbiSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                </div>

                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {filteredPbis.length} de {rootWorkItems.length} PBI mostrados.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={handleSelectAll} className={buttonClasses}>
                            Seleccionar Todos
                        </button>
                        <button onClick={handleDeselectAll} className={buttonClasses}>
                            Quitar Selección
                        </button>
                    </div>
                </div>

                <select
                    id="pbi-filter"
                    multiple
                    value={selectedIds.map(String)}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary h-32"
                    aria-label="Lista de Product Backlog Items"
                >
                    {filteredPbis.map(item => (
                        <option key={item.id} value={item.id}>
                            {`#${item.id} - ${item.fields['System.Title']}`}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usa Ctrl/Cmd + Click para selección múltiple.</p>

            </div>
             <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar Horas por Rango de Fechas (deja en blanco para ver el total)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                         <label htmlFor="start-date" className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                         <input
                            id="start-date"
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => onDateChange('startDate', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="sm:col-span-1">
                         <label htmlFor="end-date" className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                         <input
                            id="end-date"
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => onDateChange('endDate', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="sm:col-span-1">
                         <button
                            onClick={onDateReset}
                            className="w-full text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            Limpiar Fechas
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};