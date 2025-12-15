
import React, { useState, useEffect, useMemo } from 'react';
import { getLoggedHoursByDateRange } from '../services/azureDevopsService';
import { VerticalBarChart } from './VerticalBarChart';
import { AnimatedCounter } from './AnimatedCounter';
import { type WorkItem } from '../types';
import { HoursDetailModal } from './HoursDetailModal';

interface WeeklyHoursViewProps {
    pat: string;
    orgName: string;
    projectName: string;
}

interface AggregatedDevData {
    name: string;
    totalHours: number;
    items: { id: number; title: string; hours: number; date: string; parentId?: number }[];
}

const getWeekRange = (date: Date) => {
    const day = date.getDay(); // 0 is Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SummaryMetric: React.FC<{ title: string; value: string | number; subtext?: string; colorClass?: string }> = ({ title, value, subtext, colorClass = "text-gray-800 dark:text-gray-200" }) => (
    <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md text-center flex flex-col justify-center h-full">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
);

export const WeeklyHoursView: React.FC<WeeklyHoursViewProps> = ({ pat, orgName, projectName }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lineas, setLineas] = useState<WorkItem[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDevData, setSelectedDevData] = useState<AggregatedDevData | null>(null);

    const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(currentDate), [currentDate]);

    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToCurrentWeek = () => {
        setCurrentDate(new Date());
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const orgUrl = `https://dev.azure.com/${orgName}`;
                const items = await getLoggedHoursByDateRange(pat, orgUrl, projectName, weekStart, weekEnd);
                setLineas(items);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar las horas.');
            } finally {
                setLoading(false);
            }
        };

        if (pat && orgName && projectName) {
            fetchData();
        }
    }, [pat, orgName, projectName, weekStart, weekEnd]);

    const aggregatedData = useMemo(() => {
        const dataMap = new Map<string, AggregatedDevData>();

        lineas.forEach(item => {
            const devName = item.fields['System.AssignedTo']?.displayName || 'Sin Asignar';
            const hours = item.fields['Custom.Horas'] || 0;
            const date = item.fields['Custom.Fechalinea'];
            const parentId = item.fields['System.Parent'];
            
            if (!dataMap.has(devName)) {
                dataMap.set(devName, { name: devName, totalHours: 0, items: [] });
            }

            const devData = dataMap.get(devName)!;
            devData.totalHours += hours;
            devData.items.push({
                id: item.id,
                title: item.fields['System.Title'],
                hours: hours,
                date: date,
                parentId: parentId
            });
        });

        return Array.from(dataMap.values()).sort((a, b) => b.totalHours - a.totalHours);
    }, [lineas]);

    const chartData = useMemo(() => {
        return aggregatedData.map(d => ({
            label: d.name,
            value: d.totalHours
        }));
    }, [aggregatedData]);

    const metrics = useMemo(() => {
        const totalHours = aggregatedData.reduce((sum, d) => sum + d.totalHours, 0);
        const activeDevs = aggregatedData.length;
        const avgHours = activeDevs > 0 ? (totalHours / activeDevs).toFixed(1) : '0';
        const topDev = aggregatedData.length > 0 ? aggregatedData[0] : null;

        return { totalHours, activeDevs, avgHours, topDev };
    }, [aggregatedData]);

    const handleBarClick = (index: number) => {
        if (aggregatedData[index]) {
            setSelectedDevData(aggregatedData[index]);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-sm mb-6">
                     <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Cargando datos...</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                             Del {formatDate(weekStart)} al {formatDate(weekEnd)}
                        </p>
                    </div>
                </div>
                <div className="flex justify-center items-center h-64">
                    <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-red-600 bg-red-100 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-sm gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Horas Cargadas</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>Del <span className="font-semibold text-gray-700 dark:text-gray-300">{formatDate(weekStart)}</span> al <span className="font-semibold text-gray-700 dark:text-gray-300">{formatDate(weekEnd)}</span></span>
                    </div>
                </div>
                
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 self-end sm:self-auto">
                    <button 
                        onClick={goToPreviousWeek}
                        className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors text-gray-600 dark:text-gray-300"
                        title="Semana Anterior"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button 
                        onClick={goToCurrentWeek}
                        className="px-3 py-1 text-sm font-medium hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors text-gray-600 dark:text-gray-300"
                    >
                        Hoy
                    </button>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button 
                        onClick={goToNextWeek}
                        className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors text-gray-600 dark:text-gray-300"
                        title="Semana Siguiente"
                    >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {aggregatedData.length === 0 ? (
                 <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Sin Registros</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">No se han encontrado horas cargadas ('Lineas') para el rango seleccionado.</p>
                </div>
            ) : (
                <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryMetric 
                            title="Total Equipo" 
                            value={metrics.totalHours} 
                            subtext="Horas invertidas en la semana" 
                            colorClass="text-brand-primary"
                        />
                        <SummaryMetric 
                            title="Desarrolladores Activos" 
                            value={metrics.activeDevs} 
                        />
                        <SummaryMetric 
                            title="Promedio por Dev" 
                            value={metrics.avgHours} 
                            subtext="Horas / Desarrollador"
                        />
                         <SummaryMetric 
                            title="Mayor Contribución" 
                            value={metrics.topDev ? `${metrics.topDev.totalHours}h` : '-'} 
                            subtext={metrics.topDev?.name || ''}
                            colorClass="text-green-600 dark:text-green-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart Section */}
                        <div className="lg:col-span-2 bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Comparativa de Horas por Desarrollador</h3>
                                <span className="text-xs text-brand-primary bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                    Haz clic en una barra para ver detalles
                                </span>
                            </div>
                            <VerticalBarChart data={chartData} height={350} onBarClick={handleBarClick} />
                        </div>

                         {/* Details List */}
                        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md flex flex-col h-[450px]">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Detalle por Persona</h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                {aggregatedData.map((dev, index) => (
                                    <div 
                                        key={dev.name} 
                                        className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-md transition-colors"
                                        onClick={() => handleBarClick(index)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-sm">{dev.name}</span>
                                            <span className="font-bold text-brand-primary text-sm">{dev.totalHours}h</span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {dev.items.length} registro(s). Último: {dev.items.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.title || 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {selectedDevData && (
                <HoursDetailModal 
                    developerName={selectedDevData.name}
                    items={selectedDevData.items}
                    pat={pat}
                    orgName={orgName}
                    projectName={projectName}
                    onClose={() => setSelectedDevData(null)}
                />
            )}
        </div>
    );
};
