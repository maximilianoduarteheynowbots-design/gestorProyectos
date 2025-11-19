import React from 'react';
import { ModernMultiSelect } from './ModernMultiSelect';
import { CollapsibleSection } from './CollapsibleSection';

interface GlobalFiltersProps {
    devOptions: { value: string; label: string }[];
    selectedDevs: string[];
    onDevsChange: (devs: string[]) => void;
    onSelectAllDevs: () => void;
    onDeselectAllDevs: () => void;
    
    pbiOptions: { value: string; label: string }[];
    selectedPbis: string[];
    onPbisChange: (pbis: string[]) => void;
    onSelectAllPbis: () => void;
    onDeselectAllPbis: () => void;
    
    dateRange: { startDate: string; endDate: string };
    onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
}


export const GlobalFilters: React.FC<GlobalFiltersProps> = ({
    devOptions,
    selectedDevs,
    onDevsChange,
    onSelectAllDevs,
    onDeselectAllDevs,
    pbiOptions,
    selectedPbis,
    onPbisChange,
    onSelectAllPbis,
    onDeselectAllPbis,
    dateRange,
    onDateChange
}) => {
    return (
        <CollapsibleSection title="Filtros Globales" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <ModernMultiSelect
                    label="Desarrollador"
                    options={devOptions}
                    selected={selectedDevs}
                    onChange={onDevsChange}
                    onSelectAll={onSelectAllDevs}
                    onDeselectAll={onDeselectAllDevs}
                />
                <ModernMultiSelect
                    label="Proyecto (PBI)"
                    options={pbiOptions}
                    selected={selectedPbis}
                    onChange={onPbisChange}
                    onSelectAll={onSelectAllPbis}
                    onDeselectAll={onDeselectAllPbis}
                />
                <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rango de Fechas
                    </label>
                    <div className="space-y-2">
                        <div>
                             <label htmlFor="start-date" className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                             <input
                                id="start-date"
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => onDateChange('startDate', e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            />
                        </div>
                        <div>
                             <label htmlFor="end-date" className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                             <input
                                id="end-date"
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => onDateChange('endDate', e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );
};
