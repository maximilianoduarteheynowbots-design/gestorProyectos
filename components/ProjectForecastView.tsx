
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { type WorkItem } from '../types';
import { calculateProjectedEndDate } from '../utils/dateCalculator';
import { MiniCalendar } from './MiniCalendar';

interface ProjectForecastViewProps {
    workItems: WorkItem[];
}

interface Filters {
    dev: string;
    name: string;
    state: string;
}

const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export const ProjectForecastView: React.FC<ProjectForecastViewProps> = ({ workItems }) => {
    const [filters, setFilters] = useState<Filters>({ dev: 'all', name: '', state: 'all' });
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [editedHours, setEditedHours] = useState<{ pending: number, weekly: number } | null>(null);
    
    const availableDevs = useMemo(() => {
        const devs = new Set<string>();
        workItems.forEach(item => {
            if (item.fields['System.AssignedTo']?.displayName) {
                devs.add(item.fields['System.AssignedTo'].displayName);
            }
        });
        return [...devs].sort();
    }, [workItems]);

    const availableStates = useMemo(() => {
        const states = new Set<string>();
        workItems.forEach(item => {
            if (item.fields['System.BoardColumn']) {
                states.add(item.fields['System.BoardColumn']);
            }
        });
        return [...states].sort();
    }, [workItems]);
    
    const filteredProjects = useMemo(() => {
        return workItems.filter(item => {
            const devMatch = filters.dev === 'all' || item.fields['System.AssignedTo']?.displayName === filters.dev;
            const stateMatch = filters.state === 'all' || item.fields['System.BoardColumn'] === filters.state;
            const nameMatch = filters.name === '' || 
                              item.fields['System.Title'].toLowerCase().includes(filters.name.toLowerCase()) ||
                              item.id.toString().includes(filters.name);
            return devMatch && stateMatch && nameMatch;
        });
    }, [workItems, filters]);
    
    const handleFilterChange = (filterKey: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterKey]: value }));
    };

    const handleProjectSelect = (item: WorkItem) => {
        setSelectedProjectId(item.id);
        setEditedHours({
            pending: (item.fields['Custom.Hspendientes'] as number) || 0,
            weekly: (item.fields['Custom.Cargasemanal'] as number) || 0,
        });
    };
    
    const handleHoursChange = (type: 'pending' | 'weekly', value: string) => {
        if (!editedHours) return;
        const numericValue = parseInt(value, 10);
        if (!isNaN(numericValue) && numericValue >= 0) {
            setEditedHours(prev => ({ ...prev!, [type]: numericValue }));
        } else if (value === '') {
             setEditedHours(prev => ({ ...prev!, [type]: 0 }));
        }
    };
    
    const selectedProject = useMemo(() => {
        return workItems.find(p => p.id === selectedProjectId) || null;
    }, [workItems, selectedProjectId]);

    const projectionResult = useMemo(() => {
        if (!editedHours) return { endDate: null, workDays: 0 };
        return calculateProjectedEndDate(editedHours.pending, editedHours.weekly);
    }, [editedHours]);

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <input
                        type="search"
                        placeholder="Buscar por ID o título..."
                        value={filters.name}
                        onChange={e => handleFilterChange('name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-primary"
                     />
                     <select value={filters.dev} onChange={e => handleFilterChange('dev', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary">
                        <option value="all">Todos los Desarrolladores</option>
                        {availableDevs.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                    </select>
                     <select value={filters.state} onChange={e => handleFilterChange('state', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary">
                        <option value="all">Todos los Estados</option>
                        {availableStates.map(state => <option key={state} value={state}>{state}</option>)}
                    </select>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md max-h-[70vh] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-3">Proyectos</h2>
                     <table className="w-full text-left text-sm">
                         <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                             <tr>
                                <th className="p-2">Proyecto</th>
                                <th className="p-2">Asignado a</th>
                                <th className="p-2">Estado</th>
                                <th className="p-2">Fin Proyectado</th>
                             </tr>
                         </thead>
                         <tbody>
                            {filteredProjects.map(item => {
                                const projection = calculateProjectedEndDate(
                                    (item.fields['Custom.Hspendientes'] as number) || 0,
                                    (item.fields['Custom.Cargasemanal'] as number) || 0
                                );
                                return (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleProjectSelect(item)}
                                        className={`cursor-pointer hover:bg-light-bg dark:hover:bg-dark-bg/50 rounded-lg transition-colors ${selectedProjectId === item.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                                    >
                                        <td className="p-2 font-medium truncate" title={item.fields['System.Title']}>{`#${item.id} - ${item.fields['System.Title']}`}</td>
                                        <td className="p-2 truncate">{item.fields['System.AssignedTo']?.displayName || 'N/A'}</td>
                                        <td className="p-2">{item.fields['System.BoardColumn'] || 'N/A'}</td>
                                        <td className="p-2 font-semibold">{formatDate(projection.endDate)}</td>
                                    </tr>
                                );
                            })}
                         </tbody>
                     </table>
                </div>

                <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md">
                     {selectedProject ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Calculadora de Proyección</h2>
                            <h3 className="text-md font-medium text-brand-primary -mt-2 truncate" title={selectedProject.fields['System.Title']}>{`#${selectedProject.id} - ${selectedProject.fields['System.Title']}`}</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="pending-hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Horas Pendientes</label>
                                    <input 
                                        id="pending-hours"
                                        type="number"
                                        min="0"
                                        value={editedHours?.pending || 0}
                                        onChange={e => handleHoursChange('pending', e.target.value)}
                                        className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="weekly-load" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Carga Semanal (hs)</label>
                                    <input 
                                        id="weekly-load"
                                        type="number"
                                        min="0"
                                        value={editedHours?.weekly || 0}
                                        onChange={e => handleHoursChange('weekly', e.target.value)}
                                        className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    />
                                </div>
                            </div>
                            
                            <div className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg text-center">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Finalización Proyectada</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{formatDate(projectionResult.endDate)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">({projectionResult.workDays} días hábiles restantes)</p>
                            </div>

                            {projectionResult.endDate && <MiniCalendar highlightDate={projectionResult.endDate} />}
                        </div>
                     ) : (
                        <div className="flex items-center justify-center h-full text-center">
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Seleccione un proyecto</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Haga clic en un proyecto de la lista para ver y editar la proyección.</p>
                             </div>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};
