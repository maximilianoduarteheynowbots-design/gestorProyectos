
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { type WorkItem, type TaskSummary, type DashboardFilters, type DashboardSort } from '../types';
import { WorkItemList } from './WorkItemList';
import { AnimatedCounter } from './AnimatedCounter';
import { DashboardProjectFilters } from './DashboardProjectFilters';
import { Pagination } from './Pagination';
import { GlobalFilters } from './GlobalFilters';
import { PieChart, type PieChartData } from './PieChart';


interface DashboardProps {
    workItems: WorkItem[];
    selectedDevs: string[];
    onSelectedDevsChange: (devs: string[]) => void;
    selectedPbis: number[];
    onSelectedPbisChange: (pbis: number[]) => void;
    dateRange: { startDate: string; endDate: string };
    onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
    pbiSummaries: Map<number, TaskSummary>;
    isSummariesLoading: boolean;
    onShowDetails: (item: WorkItem) => void;
    onNavigateToChildren: (item: WorkItem) => void;
    dashboardSearchTerm: string;
    onDashboardSearchChange: (term: string) => void;
    dashboardFilters: DashboardFilters;
    onDashboardFilterChange: (filterKey: keyof DashboardFilters, value: string[]) => void;
    dashboardSort: DashboardSort;
    onDashboardSortChange: (field: DashboardSort['field'], direction: DashboardSort['direction']) => void;
    includeCompleted: boolean;
    onIncludeCompletedChange: (checked: boolean) => void;
    orgName: string;
    projectName: string;
}

const SummaryCard: React.FC<{ title: string; value: number; unit: string; isLoading: boolean; colorClass?: string; smallerText?: boolean; }> = ({ title, value, unit, isLoading, colorClass = 'text-gray-800 dark:text-gray-200', smallerText = false }) => (
    <div className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg h-full flex flex-col justify-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate" title={title}>{title}</p>
        {isLoading ? (
            <div className={`h-9 mt-1 flex items-center ${smallerText ? 'justify-start' : 'justify-center'}`}>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800 dark:border-gray-200"></div>
            </div>
        ) : (
            <p className={`${smallerText ? 'text-2xl' : 'text-3xl'} font-bold mt-1 ${colorClass}`}>
                <AnimatedCounter value={value} />{unit}
            </p>
        )}
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({
    workItems,
    selectedDevs,
    onSelectedDevsChange,
    selectedPbis,
    onSelectedPbisChange,
    dateRange,
    onDateChange,
    pbiSummaries,
    isSummariesLoading,
    onShowDetails,
    onNavigateToChildren,
    dashboardSearchTerm,
    onDashboardSearchChange,
    dashboardFilters,
    onDashboardFilterChange,
    dashboardSort,
    onDashboardSortChange,
    includeCompleted,
    onIncludeCompletedChange,
    orgName,
    projectName,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 9;

    const COMPLETED_STATES = useMemo(() => ['Done', 'Closed', 'Resolved', 'Removed'], []);

    const filteredWorkItems = useMemo(() => {
        if (includeCompleted) {
            return workItems;
        }
        return workItems.filter(item => !COMPLETED_STATES.includes(item.fields['System.State']));
    }, [workItems, includeCompleted, COMPLETED_STATES]);


    // PRIMARY FILTERS LOGIC
    const availableDevs = useMemo(() => {
        const devs = new Set<string>();
        filteredWorkItems.forEach(item => {
            if (item.fields['System.AssignedTo']?.displayName) {
                devs.add(item.fields['System.AssignedTo'].displayName);
            }
        });
        return [...devs].sort();
    }, [filteredWorkItems]);

    const availablePbis = useMemo(() => {
        if (selectedDevs.length === 0) {
            return filteredWorkItems;
        }
        return filteredWorkItems.filter(item => 
            item.fields['System.AssignedTo']?.displayName && selectedDevs.includes(item.fields['System.AssignedTo'].displayName)
        );
    }, [filteredWorkItems, selectedDevs]);

    const handleDevsChange = useCallback((devs: string[]) => {
        onSelectedDevsChange(devs);
        
        const pbisOfSelectedDevs = new Set(filteredWorkItems
            .filter(wi => wi.fields['System.AssignedTo']?.displayName && devs.includes(wi.fields['System.AssignedTo'].displayName))
            .map(wi => wi.id));
            
        const newSelectedPbis = selectedPbis.filter(pbiId => pbisOfSelectedDevs.has(pbiId));
        onSelectedPbisChange(newSelectedPbis);
    }, [filteredWorkItems, selectedPbis, onSelectedDevsChange, onSelectedPbisChange]);

    const primarilyFilteredPbis = useMemo(() => {
        if (selectedPbis.length > 0) {
            const selectedSet = new Set(selectedPbis);
            return availablePbis.filter(item => selectedSet.has(item.id));
        }
        return availablePbis;
    }, [selectedPbis, availablePbis]);

    // SECONDARY FILTERS LOGIC
    const availableDashboardStates = useMemo(() => {
        return [...new Set(primarilyFilteredPbis.map(item => item.fields['System.State']))].sort();
    }, [primarilyFilteredPbis]);

    const availableDashboardTags = useMemo(() => {
        const allTags = new Set<string>();
        primarilyFilteredPbis.forEach(item => {
            item.fields['System.Tags']?.split('; ').forEach(tag => {
                if (tag.trim()) allTags.add(tag.trim());
            });
        });
        return [...allTags].sort();
    }, [primarilyFilteredPbis]);
    
    const finalDisplayedPbis = useMemo(() => {
        let items = [...primarilyFilteredPbis];

        if (dashboardSearchTerm) {
            const lowercasedTerm = dashboardSearchTerm.toLowerCase();
            items = items.filter(item => 
                item.id.toString().includes(lowercasedTerm) ||
                item.fields['System.Title'].toLowerCase().includes(lowercasedTerm)
            );
        }

        if (dashboardFilters.states.length > 0) {
            const statesSet = new Set(dashboardFilters.states);
            items = items.filter(item => statesSet.has(item.fields['System.State']));
        }

        if (dashboardFilters.tags.length > 0) {
            items = items.filter(item => {
                const itemTags = new Set(item.fields['System.Tags']?.split('; ').map(t => t.trim()) || []);
                return dashboardFilters.tags.some(selectedTag => itemTags.has(selectedTag));
            });
        }
        
        items.sort((a, b) => {
            const field = dashboardSort.field;
            const dir = dashboardSort.direction === 'asc' ? 1 : -1;
            
            let valA: any;
            let valB: any;

            switch (field) {
                case 'id':
                    valA = a.id;
                    valB = b.id;
                    break;
                case 'title':
                    valA = a.fields['System.Title'] || '';
                    valB = b.fields['System.Title'] || '';
                    return valA.localeCompare(valB) * dir;
                case 'createdDate':
                    valA = a.fields['Custom.FechadeIngreso'] ? new Date(a.fields['Custom.FechadeIngreso']).getTime() : 0;
                    valB = b.fields['Custom.FechadeIngreso'] ? new Date(b.fields['Custom.FechadeIngreso']).getTime() : 0;
                    break;
                case 'targetDate':
                    valA = a.fields['Custom.Fechadeentregaestimada'] ? new Date(a.fields['Custom.Fechadeentregaestimada']).getTime() : 0;
                    valB = b.fields['Custom.Fechadeentregaestimada'] ? new Date(b.fields['Custom.Fechadeentregaestimada']).getTime() : 0;
                    break;
                default:
                    return 0;
            }
            
            if (valA === 0 && valB !== 0) return 1 * dir; 
            if (valB === 0 && valA !== 0) return -1 * dir;

            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });

        return items;
    }, [primarilyFilteredPbis, dashboardSearchTerm, dashboardFilters, dashboardSort]);

    // PAGINATION LOGIC
    useEffect(() => {
        setCurrentPage(1);
    }, [finalDisplayedPbis]);

    const totalPages = Math.ceil(finalDisplayedPbis.length / ITEMS_PER_PAGE);
    const paginatedPbis = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return finalDisplayedPbis.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [finalDisplayedPbis, currentPage]);


    const devOptions = availableDevs.map(dev => ({ value: dev, label: dev }));
    const pbiOptions = availablePbis.map(pbi => ({ value: pbi.id.toString(), label: `#${pbi.id} - ${pbi.fields['System.Title']}`}));
    
    // SUMMARIES LOGIC
    const totalSummary = useMemo(() => {
        let totalProjected = 0;
        let totalEstimated = 0;
        let totalInvested = 0;
        for (const pbi of finalDisplayedPbis) {
            totalProjected += (pbi.fields['Custom.HorasPropuesta'] as number) || 0;
            const summary = pbiSummaries.get(pbi.id);
            if (summary) {
                totalEstimated += summary.estimated;
                totalInvested += summary.invested;
            }
        }
        const difference = totalInvested - totalEstimated;
        const productivity = totalEstimated > 0 ? Math.round((totalInvested / totalEstimated) * 100) : 0;
        return { totalProjected, totalEstimated, totalInvested, difference, productivity };
    }, [finalDisplayedPbis, pbiSummaries]);
    
    const devSummary = useMemo(() => {
        if (pbiSummaries.size === 0) {
            return [];
        }

        const summaryByDev = new Map<string, { projected: number, estimated: number; invested: number, pbiCount: number }>();
        
        for (const pbi of finalDisplayedPbis) {
            const devName = pbi.fields['System.AssignedTo']?.displayName;
            const pbiSummary = pbiSummaries.get(pbi.id);
            const projected = (pbi.fields['Custom.HorasPropuesta'] as number) || 0;

            if (devName && pbiSummary) {
                const currentDevSummary = summaryByDev.get(devName) || { projected: 0, estimated: 0, invested: 0, pbiCount: 0 };
                summaryByDev.set(devName, {
                    projected: currentDevSummary.projected + projected,
                    estimated: currentDevSummary.estimated + pbiSummary.estimated,
                    invested: currentDevSummary.invested + pbiSummary.invested,
                    pbiCount: currentDevSummary.pbiCount + 1,
                });
            }
        }
        
        return Array.from(summaryByDev.entries())
            .map(([devName, summary]) => ({ 
                devName, 
                summary,
                difference: summary.invested - summary.estimated,
                average: summary.pbiCount > 0 ? parseFloat((summary.invested / summary.pbiCount).toFixed(2)) : 0
             }))
            .sort((a, b) => a.devName.localeCompare(b.devName));

    }, [finalDisplayedPbis, pbiSummaries]);

    const stateDistribution = useMemo(() => {
        if (finalDisplayedPbis.length === 0) return [];
        const distribution = new Map<string, number>();
        finalDisplayedPbis.forEach(item => {
            const state = item.fields['System.State'];
            distribution.set(state, (distribution.get(state) || 0) + 1);
        });
        return Array.from(distribution.entries()).map(([label, value]) => ({ label, value }));
    }, [finalDisplayedPbis]);

    const stateColors: { [key: string]: string } = {
        'New': '#A0AEC0',
        'To Do': '#A0AEC0',
        'Proposed': '#A0AEC0',
        'Active': '#4299E1',
        'In Progress': '#4299E1',
        'Resolved': '#38A169',
        'Done': '#38A169',
        'Closed': '#805AD5',
        'Removed': '#E53E3E',
    };

    const pieChartData: PieChartData[] = stateDistribution.map(({ label, value }) => ({
        label,
        value,
        color: stateColors[label] || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
    })).sort((a, b) => b.value - a.value);

    const handleExport = useCallback(() => {
        const headers = ['ID', 'Título', 'Asignado a', 'Estado', 'Tags', 'H. Proyectadas', 'H. Planificadas', 'H. Invertidas', 'URL'];
        
        const rows = finalDisplayedPbis.map(item => {
            const summary = pbiSummaries.get(item.id);
            const title = `"${(item.fields['System.Title'] || '').replace(/"/g, '""')}"`;
            const itemUrl = `https://${encodeURIComponent(orgName)}.visualstudio.com/${encodeURIComponent(projectName)}/_workitems/edit/${item.id}`;
            return [
                item.id,
                title,
                item.fields['System.AssignedTo']?.displayName || 'Sin Asignar',
                item.fields['System.State'],
                `"${item.fields['System.Tags'] || ''}"`,
                (item.fields['Custom.HorasPropuesta'] as number) || 0,
                summary?.estimated ?? 0,
                summary?.invested ?? 0,
                itemUrl
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(',') + "\n" 
            + rows.join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "dashboard_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [finalDisplayedPbis, pbiSummaries, orgName, projectName]);


    return (
        <div className="space-y-6 animate-fade-in">
            <GlobalFilters
                devOptions={devOptions}
                selectedDevs={selectedDevs}
                onDevsChange={handleDevsChange}
                onSelectAllDevs={() => handleDevsChange(availableDevs)}
                onDeselectAllDevs={() => handleDevsChange([])}
                
                pbiOptions={pbiOptions}
                selectedPbis={selectedPbis.map(String)}
                onPbisChange={(pbis) => onSelectedPbisChange(pbis.map(Number))}
                onSelectAllPbis={() => onSelectedPbisChange(availablePbis.map(pbi => pbi.id))}
                onDeselectAllPbis={() => onSelectedPbisChange([])}
                
                dateRange={dateRange}
                onDateChange={onDateChange}
            />

            <DashboardProjectFilters
                searchTerm={dashboardSearchTerm}
                onSearchChange={onDashboardSearchChange}
                filters={dashboardFilters}
                onFilterChange={onDashboardFilterChange}
                sort={dashboardSort}
                onSortChange={onDashboardSortChange}
                availableStates={availableDashboardStates}
                availableTags={availableDashboardTags}
                includeCompleted={includeCompleted}
                onIncludeCompletedChange={onIncludeCompletedChange}
            />

            <div>
                {workItems.length > 0 ? (
                    <div className="space-y-6">
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Resumen Total de la Selección</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                                        <SummaryCard title="H. Proyectadas" value={totalSummary.totalProjected} unit="h" isLoading={isSummariesLoading} colorClass="text-purple-800 dark:text-purple-200" />
                                        <SummaryCard title="H. Planificadas" value={totalSummary.totalEstimated} unit="h" isLoading={isSummariesLoading} colorClass="text-blue-800 dark:text-blue-200" />
                                        <SummaryCard title="H. Invertidas" value={totalSummary.totalInvested} unit="h" isLoading={isSummariesLoading} colorClass="text-green-800 dark:text-green-200" />
                                        <SummaryCard 
                                            title="Diferencia (Inv-Plan)" 
                                            value={totalSummary.difference} 
                                            unit="h" 
                                            isLoading={isSummariesLoading} 
                                            colorClass={totalSummary.difference > 0 ? 'text-red-500' : 'text-green-500'}
                                        />
                                        <SummaryCard title="Relación I/P" value={totalSummary.productivity} unit="%" isLoading={isSummariesLoading} colorClass="text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                </div>

                                {devSummary.length > 0 && (
                                    <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Resumen por Desarrollador</h3>
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            {devSummary.map(({ devName, summary, difference, average }, index) => (
                                                <div key={devName} className={`grid grid-cols-6 items-center gap-2 py-2 ${index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
                                                    <p className="font-medium text-gray-700 dark:text-gray-300 truncate col-span-1" title={devName}>{devName}</p>
                                                    <div className="flex gap-4 text-right col-span-5 justify-end">
                                                        <SummaryCard title="Proyectadas" value={summary.projected} unit="h" isLoading={isSummariesLoading} colorClass="text-purple-800 dark:text-purple-200" smallerText />
                                                        <SummaryCard title="Planificadas" value={summary.estimated} unit="h" isLoading={isSummariesLoading} colorClass="text-blue-800 dark:text-blue-200" smallerText />
                                                        <SummaryCard title="Invertidas" value={summary.invested} unit="h" isLoading={isSummariesLoading} colorClass="text-green-800 dark:text-green-200" smallerText />
                                                        <SummaryCard title="Diferencia (I-P)" value={difference} unit="h" isLoading={isSummariesLoading} colorClass={difference > 0 ? 'text-red-500' : 'text-green-500'} smallerText />
                                                        <SummaryCard title="Prom. h/PBI" value={average} unit="h" isLoading={isSummariesLoading} colorClass="text-yellow-600 dark:text-yellow-400" smallerText />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Distribución por Estado</h3>
                                {finalDisplayedPbis.length > 0 ? (
                                    <PieChart data={pieChartData} size={300} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                        No hay datos para mostrar.
                                    </div>
                                )}
                            </div>
                         </div>
                        
                        <div className="flex justify-between items-center mt-4">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                Proyectos Filtrados ({finalDisplayedPbis.length})
                            </h2>
                            <button
                                onClick={handleExport}
                                disabled={finalDisplayedPbis.length === 0}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Exportar a CSV
                            </button>
                        </div>
                        
                        {paginatedPbis.length > 0 ? (
                            <>
                                <WorkItemList 
                                    items={paginatedPbis} 
                                    taskSummaries={pbiSummaries} 
                                    onNavigateToChildren={onNavigateToChildren} 
                                    onShowDetails={onShowDetails}
                                    isLoadingSummaries={isSummariesLoading}
                                />
                                {totalPages > 1 && (
                                    <Pagination 
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                )}
                            </>
                        ) : (
                             <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No se encontraron proyectos</h3>
                                <p className="mt-2 text-gray-500 dark:text-gray-400">La selección global no arrojó resultados, o los filtros de la vista no coinciden con ningún proyecto.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No se encontraron proyectos</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Ajusta los filtros globales de desarrollador o proyecto para empezar a ver resultados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
