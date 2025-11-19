
import React, { useMemo, useCallback, useState } from 'react';
import { SimpleBarChart } from './SimpleBarChart';
import { PieChart, type PieChartData } from './PieChart';
import { type WorkItem } from '../types';
import { calculateProjectedEndDate } from '../utils/dateCalculator';

interface CalculatedWeek {
    weekIndex: number;
    startDate: string;
    endDate: string;
    projects: {
        id: number;
        title: string;
        assignedHours: number;
    }[];
    totalHours: number;
}

interface PlanningSummaryProps {
    plan: CalculatedWeek[];
    developer: string;
    onBackToPlanner: () => void;
    projectHoursMap: Map<number, number>;
    projects: WorkItem[];
}

const SummaryCard: React.FC<{ title: string; value: string | number; colorClass?: string }> = ({ title, value, colorClass = "text-gray-800 dark:text-gray-200" }) => (
    <div className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg text-center h-full flex flex-col justify-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
);

const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Helper to parse dd/mm/yy to Date object for comparison
const parseDateString = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    // Assuming year is 2 digits (e.g. 24 for 2024)
    return new Date(2000 + year, month - 1, day);
};

const projectColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#D946EF', '#F97316'];
const getProjectColor = (index: number) => projectColors[index % projectColors.length];


export const PlanningSummary: React.FC<PlanningSummaryProps> = ({ plan, developer, onBackToPlanner, projectHoursMap, projects }) => {
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const filteredPlan = useMemo(() => {
        if (!filterStartDate && !filterEndDate) return plan;

        const start = filterStartDate ? new Date(filterStartDate) : new Date('2000-01-01');
        const end = filterEndDate ? new Date(filterEndDate) : new Date('2100-01-01');
        
        // Set hours to compare purely by date
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        return plan.filter(week => {
            const weekStart = parseDateString(week.startDate);
            return weekStart >= start && weekStart <= end;
        });
    }, [plan, filterStartDate, filterEndDate]);

    const summaryMetrics = useMemo(() => {
        const totalWeeks = filteredPlan.length;
        const totalOvertime = filteredPlan.reduce((sum, week) => sum + Math.max(0, week.totalHours - 40), 0);
        const totalFreeHours = filteredPlan.reduce((sum, week) => sum + Math.max(0, 40 - week.totalHours), 0);
        const finalProjectDate = filteredPlan.length > 0 ? filteredPlan[filteredPlan.length - 1].endDate : 'N/A';
        return { totalWeeks, totalOvertime, totalFreeHours, finalProjectDate };
    }, [filteredPlan]);

    const pieChartData = useMemo((): PieChartData[] => {
        let standardOccupied = 0;
        let free = 0;
        let overtime = 0;

        filteredPlan.forEach(week => {
            const hours = week.totalHours;
            standardOccupied += Math.min(hours, 40);
            free += Math.max(0, 40 - hours);
            overtime += Math.max(0, hours - 40);
        });

        const data = [
            { label: 'Ocupado', value: standardOccupied, color: '#3B82F6' }, // Blue
            { label: 'Libre', value: free, color: '#10B981' }, // Green
        ];

        if (overtime > 0) {
            data.push({ label: 'Exceso', value: overtime, color: '#EF4444' }); // Red
        }

        return data.filter(d => d.value > 0);
    }, [filteredPlan]);

    const projectSummary = useMemo(() => {
        const projectsData = new Map<number, { title: string; planned: number }>();
        const projectsById = new Map<number, WorkItem>(projects.map(p => [p.id, p]));

        // Note: We calculate project summary based on the FILTERED plan to show what happens in this period
        filteredPlan.forEach(week => {
            week.projects.forEach(p => {
                const current = projectsData.get(p.id) || { title: p.title, planned: 0 };
                projectsData.set(p.id, {
                    ...current,
                    planned: current.planned + p.assignedHours,
                });
            });
        });

        return Array.from(projectsData.entries())
            .map(([id, data]) => {
                const project = projectsById.get(id);
                const initialPending = projectHoursMap.get(id) ?? 0;
                const weeklyLoad = (project?.fields['Custom.Cargasemanal'] as number) || 0;
                
                // For "Remaining", we arguably still want the GLOBAL remaining, but let's stick to context.
                // Actually, remaining is static based on initial fetch, but "Planned in Period" is dynamic.
                // Let's assume remaining is calculated against the TOTAL plan (global) for accuracy, 
                // but we display "Planned (This Period)". 
                
                // Re-calculating global planned to get accurate remaining
                let globalPlanned = 0;
                plan.forEach(w => {
                    const found = w.projects.find(proj => proj.id === id);
                    if (found) globalPlanned += found.assignedHours;
                });

                const remaining = initialPending - globalPlanned;
                const { endDate } = calculateProjectedEndDate(initialPending, weeklyLoad);

                return {
                    id,
                    title: data.title,
                    initialPending,
                    plannedInPeriod: data.planned,
                    remaining,
                    endDate,
                };
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [filteredPlan, plan, projectHoursMap, projects]);

    const chartData = useMemo(() => filteredPlan.map(week => ({
        label: `Sem. ${week.weekIndex + 1}`,
        value: week.totalHours,
        color: week.totalHours > 40 ? '#EF4444' : '#3B82F6',
    })), [filteredPlan]);

    const handleDownload = useCallback(() => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Planificacion Semanal para ${developer}\n`;
        csvContent += `Periodo: ${filterStartDate || 'Inicio'} - ${filterEndDate || 'Fin'}\n\n`;
        
        const headers = ['Semana', 'Fecha de Inicio', 'Fecha de Fin', 'ID Proyecto', 'Titulo Proyecto', 'Horas Asignadas'];
        csvContent += headers.join(',') + '\n';

        filteredPlan.forEach(week => {
            week.projects.forEach(project => {
                const row = [
                    week.weekIndex + 1,
                    week.startDate,
                    week.endDate,
                    project.id,
                    `"${project.title.replace(/"/g, '""')}"`,
                    project.assignedHours
                ];
                csvContent += row.join(',') + '\n';
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeDevName = developer.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("download", `planificacion_${safeDevName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredPlan, developer, filterStartDate, filterEndDate]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold">Resumen de Planificación</h2>
                    <p className="text-brand-primary font-semibold">{developer}</p>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto">
                    <button onClick={onBackToPlanner} className="flex-1 sm:flex-none bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Volver</button>
                    <button onClick={handleDownload} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Descargar CSV</button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filtrar Rango de Visualización</h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label htmlFor="filterStart" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                        <input 
                            type="date" 
                            id="filterStart"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="filterEnd" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                         <input 
                            type="date" 
                            id="filterEnd"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                     <div className="flex items-end">
                        <button 
                            onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm transition-colors"
                        >
                            Mostrar Todo
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Metrics Cards */}
                <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 content-start">
                    <SummaryCard title="Semanas (Periodo)" value={summaryMetrics.totalWeeks} />
                    <SummaryCard title="Horas Libres" value={`${summaryMetrics.totalFreeHours}h`} colorClass="text-green-600 dark:text-green-400" />
                    <SummaryCard title="Horas Extra" value={`${summaryMetrics.totalOvertime}h`} colorClass={summaryMetrics.totalOvertime > 0 ? "text-red-500" : "text-gray-800 dark:text-gray-200"} />
                    <SummaryCard title="Fin del Periodo" value={summaryMetrics.finalProjectDate} />
                </div>

                {/* Pie Chart */}
                <div className="lg:col-span-1 bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
                    <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-100 w-full text-center border-b border-gray-200 dark:border-gray-700 pb-2">
                        Ocupación vs Libertad (40h/sem)
                    </h3>
                    <div className="py-2">
                        <PieChart data={pieChartData} size={180} />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Project Table */}
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md min-w-0 flex flex-col h-96">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Resumen por Proyecto (En Periodo)</h3>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-light-card dark:bg-dark-card border-b-2 border-gray-200 dark:border-gray-700 z-10">
                                <tr>
                                    <th className="p-2 font-semibold">Proyecto</th>
                                    <th className="p-2 font-semibold text-center text-xs">Planificadas (Filtro)</th>
                                    <th className="p-2 font-semibold text-center text-xs">Restantes (Total)</th>
                                    <th className="p-2 font-semibold text-center text-xs">Fin Estimado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectSummary.map(proj => (
                                    <tr key={proj.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg/50">
                                        <td className="p-2 font-medium truncate max-w-[150px]" title={proj.title}>{`#${proj.id} - ${proj.title}`}</td>
                                        <td className="p-2 text-center">{proj.plannedInPeriod}h</td>
                                        <td className={`p-2 text-center font-bold ${proj.remaining < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                            {proj.remaining}h
                                        </td>
                                        <td className="p-2 text-center text-xs">{formatDate(proj.endDate)}</td>
                                    </tr>
                                ))}
                                {projectSummary.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-gray-500">No hay proyectos en este rango de fechas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md min-w-0 h-96 flex flex-col">
                    <h3 className="text-lg font-semibold mb-3">Carga de Trabajo Semanal</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {chartData.length > 0 ? (
                            <SimpleBarChart data={chartData} maxValue={40} />
                        ) : (
                             <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                                Selecciona un rango de fechas válido para ver el gráfico.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Detailed Timeline List */}
            <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md min-w-0">
                    <h3 className="text-lg font-semibold mb-3">Cronograma Detallado</h3>
                    <div className="space-y-2 text-sm max-h-80 overflow-y-auto pr-2">
                    {filteredPlan.map(week => (
                        <div key={week.weekIndex} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-700 dark:text-gray-300">Sem. {week.weekIndex + 1} <span className="font-normal text-xs text-gray-500">({week.startDate})</span></p>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${week.totalHours > 40 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>Total: {week.totalHours}h</span>
                            </div>
                            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-1 mt-1">
                                {week.projects.map((project) => (
                                    <div key={project.id} className="flex items-center gap-2 py-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getProjectColor(project.id) }}></div>
                                        <p className="flex-1 truncate" title={project.title}>{project.title}</p>
                                        <p className="font-mono text-xs p-1 bg-light-bg dark:bg-dark-bg/50 rounded">{project.assignedHours}h</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredPlan.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No hay datos para el rango seleccionado.</p>
                    )}
                    </div>
            </div>
        </div>
    );
};
