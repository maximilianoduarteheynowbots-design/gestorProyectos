
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { type WorkItem, type TaskSummary } from '../types';
import { TaskAnalysisFilters } from './TaskAnalysisFilters';
import { AnimatedCounter } from './AnimatedCounter';
import { WorkItemList } from './WorkItemList';
import { SimpleBarChart } from './SimpleBarChart';

interface TaskAnalysisViewProps {
    allItems: WorkItem[] | null;
    isLoading: boolean;
    error: string | null;
    selectedDevs: string[];
    onSelectedDevsChange: (devs: string[]) => void;
    selectedTag: string | null;
    onSelectedTagChange: (tag: string | null) => void;
    onShowDetails: (item: WorkItem) => void;
    onNavigateToChildren: (item: WorkItem) => void;
    getTaskSummary: (taskId: number) => Promise<{ estimated: number; invested: number }>;
    rootItems: WorkItem[];
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col justify-center items-center p-10 text-center">
        <svg className="animate-spin h-10 w-10 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-semibold">Cargando items del proyecto...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Esto puede tardar un momento.</p>
    </div>
);

const MetricCard: React.FC<{ title: string; value: number; unit: string; isLoading: boolean; }> = ({ title, value, unit, isLoading }) => (
    <div className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg text-center h-full flex flex-col justify-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        {isLoading ? (
            <div className="h-9 mt-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800 dark:border-gray-200"></div>
            </div>
        ) : (
            <p className="text-3xl font-bold mt-1 text-gray-800 dark:text-gray-200">
                <AnimatedCounter value={value} />{unit}
            </p>
        )}
    </div>
);

export const TaskAnalysisView: React.FC<TaskAnalysisViewProps> = ({
    allItems,
    isLoading,
    error,
    selectedDevs,
    onSelectedDevsChange,
    selectedTag,
    onSelectedTagChange,
    onShowDetails,
    onNavigateToChildren,
    getTaskSummary,
    rootItems
}) => {

    const [isSummariesLoading, setIsSummariesLoading] = useState(false);
    const [taskSummaries, setTaskSummaries] = useState<Map<number, TaskSummary>>(new Map());

    const availableDevs = useMemo(() => {
        if (!allItems) return [];
        const devs = new Set<string>();
        allItems.forEach(item => {
            if (item.fields['System.AssignedTo']?.displayName) {
                devs.add(item.fields['System.AssignedTo'].displayName);
            }
        });
        return [...devs].sort();
    }, [allItems]);
    
    const itemsOfSelectedDevs = useMemo(() => {
        if (!allItems || selectedDevs.length === 0) return [];
        const devSet = new Set(selectedDevs);
        return allItems.filter(item => devSet.has(item.fields['System.AssignedTo']?.displayName));
    }, [allItems, selectedDevs]);

    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        itemsOfSelectedDevs.forEach(item => {
            item.fields['System.Tags']?.split('; ').forEach(tag => {
                if (tag.trim()) tags.add(tag.trim());
            });
        });
        return [...tags].sort();
    }, [itemsOfSelectedDevs]);

    // Valida que el tag seleccionado siga siendo válido cuando cambian los desarrolladores.
    useEffect(() => {
        if (selectedTag && !availableTags.includes(selectedTag)) {
            onSelectedTagChange(null);
        }
    }, [availableTags, selectedTag, onSelectedTagChange]);

    const filteredItems = useMemo(() => {
        if (!selectedTag || itemsOfSelectedDevs.length === 0) return [];
        return itemsOfSelectedDevs.filter(item => {
            const itemTags = new Set(item.fields['System.Tags']?.split('; ').map(t => t.trim()) || []);
            return itemTags.has(selectedTag);
        });
    }, [itemsOfSelectedDevs, selectedTag]);

    // --- Hierarchy Mapping Logic (Moved Up) ---
    // We calculate this before metrics because grouping logic depends on PBI grouping.
    const hierarchyMap = useMemo(() => {
        if (!allItems || !rootItems) {
            return { titleMap: new Map<number, string>(), idMap: new Map<number, number>() };
        }
        
        const allItemsById = new Map<number, WorkItem>();
        allItems.forEach(item => allItemsById.set(item.id, item));
        rootItems.forEach(pbi => allItemsById.set(pbi.id, pbi));
        
        const titleMap = new Map<number, string>();
        const idMap = new Map<number, number>();
        const traversalMemo = new Map<number, WorkItem | null>();

        const findRootPbi = (itemId: number): WorkItem | null => {
            if (traversalMemo.has(itemId)) {
                return traversalMemo.get(itemId)!;
            }

            const item = allItemsById.get(itemId);
            if (!item) {
                traversalMemo.set(itemId, null);
                return null;
            }
            if (item.fields['System.WorkItemType'] === 'Product Backlog Item') {
                traversalMemo.set(itemId, item);
                return item;
            }
            
            const parentId = item.fields['System.Parent'];
            if (!parentId) {
                // If it has no parent but is in the list, treating itself as root for grouping context if needed,
                // but strict hierarchy check returns null if not PBI.
                traversalMemo.set(itemId, null);
                return null;
            }

            const root = findRootPbi(parentId);
            traversalMemo.set(itemId, root);
            return root;
        };

        allItems.forEach(item => {
            const rootPbi = findRootPbi(item.id);
            if (rootPbi) {
                titleMap.set(item.id, rootPbi.fields['System.Title']);
                idMap.set(item.id, rootPbi.id);
            } else {
                // Fallback: If orphaned or parent not found in loaded set, group by itself
                idMap.set(item.id, item.id);
            }
        });
        
        return { titleMap, idMap };
    }, [allItems, rootItems]);

     useEffect(() => {
        const calculateSummaries = async () => {
            if (filteredItems.length === 0) {
                setTaskSummaries(new Map());
                return;
            }
            setIsSummariesLoading(true);
            try {
                const summaryPromises: Promise<{ estimated: number; invested: number }>[] = filteredItems.map(item => {
                    if (item.fields['System.WorkItemType'] === 'Task') {
                        return getTaskSummary(item.id);
                    }
                    if (item.fields['System.WorkItemType'].toLowerCase() === 'linea') {
                        const invested = (item.fields['Custom.Horas'] as number) || 0;
                        return Promise.resolve({ estimated: 0, invested });
                    }
                    return Promise.resolve({ estimated: 0, invested: 0 });
                });

                const results = await Promise.allSettled(summaryPromises);

                const newSummaries = new Map<number, TaskSummary>();
                results.forEach((result, index) => {
                    const itemId = filteredItems[index].id;
                    if (result.status === 'fulfilled') {
                        const value = result.value;
                        newSummaries.set(itemId, { estimated: value.estimated ?? 0, invested: value.invested ?? 0 });
                    } else {
                        console.error(`Failed to fetch summary for item ${itemId}:`, result.reason);
                        newSummaries.set(itemId, { estimated: 0, invested: 0 });
                    }
                });
                setTaskSummaries(newSummaries);
            } catch (e) {
                console.error("An unexpected error occurred during summary calculation:", e);
                setTaskSummaries(new Map());
            } finally {
                setIsSummariesLoading(false);
            }
        };
        calculateSummaries();
    }, [filteredItems, getTaskSummary]);

    const globalMetrics = useMemo(() => {
        // Group by Root ID (PBI). If multiple tasks have the same PBI parent, they count as 1 item.
        const uniqueRootItems = new Set<number>();
        filteredItems.forEach(item => {
            const rootId = hierarchyMap.idMap.get(item.id) || item.id;
            uniqueRootItems.add(rootId);
        });

        const totalItems = uniqueRootItems.size;
        
        const totalInvestedHours = Array.from(taskSummaries.values()).reduce<number>((acc, curr) => acc + (curr.invested || 0), 0);
        const avgHoursPerItem = totalItems > 0 ? parseFloat((totalInvestedHours / totalItems).toFixed(2)) : 0;
        return { totalItems, totalInvestedHours, avgHoursPerItem };
    }, [filteredItems, taskSummaries, hierarchyMap.idMap]);

    const devMetrics = useMemo(() => {
        const metricsByDev = new Map<string, { uniqueRootIds: Set<number>; investedHours: number }>();
        
        filteredItems.forEach(item => {
            const devName = item.fields['System.AssignedTo']?.displayName;
            const summary = taskSummaries.get(item.id);
            
            if (devName && summary) {
                if (!metricsByDev.has(devName)) {
                    metricsByDev.set(devName, { uniqueRootIds: new Set(), investedHours: 0 });
                }
                
                const current = metricsByDev.get(devName)!;
                const rootId = hierarchyMap.idMap.get(item.id) || item.id;
                
                current.uniqueRootIds.add(rootId);
                current.investedHours += summary.invested || 0;
            }
        });

        return Array.from(metricsByDev.entries())
            .map(([devName, data]) => ({ 
                devName, 
                itemCount: data.uniqueRootIds.size,
                investedHours: data.investedHours,
                averageHours: data.uniqueRootIds.size > 0 ? parseFloat((data.investedHours / data.uniqueRootIds.size).toFixed(2)) : 0
             }))
            .sort((a, b) => b.investedHours - a.investedHours);
    }, [filteredItems, taskSummaries, hierarchyMap.idMap]);
    
    const chartData = useMemo(() => devMetrics.map(dev => ({
        label: dev.devName,
        value: dev.investedHours,
    })), [devMetrics]);

    const showContent = selectedDevs.length > 0 && selectedTag;

    const handleExport = useCallback(() => {
        if (!selectedTag || devMetrics.length === 0) return;

        const formatRow = (row: (string | number)[]) => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');

        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += "Reporte de Análisis de Items (Agrupado por Proyecto Padre)\n";
        csvContent += `Tag Seleccionado:,${selectedTag}\n`;
        csvContent += `Desarrolladores:,"${selectedDevs.join('; ')}"\n\n`;

        csvContent += "Metricas Globales\n";
        csvContent += formatRow(['Metrica', 'Valor']) + "\n";
        const globalRows = [
            ['Horas Totales Invertidas', `${globalMetrics.totalInvestedHours}h`],
            ['Cantidad Total de Items (Unicos por PBI)', globalMetrics.totalItems],
            ['Promedio Horas / Item', `${globalMetrics.avgHoursPerItem}h`]
        ];
        globalRows.forEach(row => {
            csvContent += formatRow(row) + "\n";
        });
        csvContent += "\n";

        csvContent += "Metricas por Desarrollador\n";
        const devHeaders = ['Desarrollador', 'Horas Invertidas', 'Items (PBIs Unicos)', 'Promedio Horas / Item'];
        csvContent += formatRow(devHeaders) + "\n";
        devMetrics.forEach(dev => {
            const row = [
                dev.devName,
                `${dev.investedHours}h`,
                dev.itemCount,
                `${dev.averageHours}h`
            ];
            csvContent += formatRow(row) + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeTag = selectedTag.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("download", `analisis_items_${safeTag}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [selectedTag, selectedDevs, globalMetrics, devMetrics]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <TaskAnalysisFilters
                availableDevs={availableDevs}
                selectedDevs={selectedDevs}
                onSelectedDevsChange={onSelectedDevsChange}
                availableTags={availableTags}
                selectedTag={selectedTag}
                onSelectedTagChange={onSelectedTagChange}
                isDisabled={!allItems}
            />

            {!showContent && (
                <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Inicia tu Análisis</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Selecciona al menos un desarrollador y un tag para ver las métricas.</p>
                </div>
            )}

            {showContent && (
                <>
                    <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Métricas Globales (Tag: {selectedTag})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <MetricCard title="Horas Totales Invertidas" value={globalMetrics.totalInvestedHours} unit="h" isLoading={isSummariesLoading} />
                            <MetricCard title="Items (Agrupados por PBI)" value={globalMetrics.totalItems} unit="" isLoading={isSummariesLoading} />
                            <MetricCard title="Promedio Horas / Item" value={globalMetrics.avgHoursPerItem} unit="h" isLoading={isSummariesLoading} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center italic">
                            Nota: Múltiples tareas bajo el mismo PBI con este tag se cuentan como 1 solo item para el cálculo de promedios.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Desglose por Desarrollador</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {devMetrics.map(({ devName, itemCount, investedHours, averageHours }, index) => (
                                     <div key={devName} className={`grid grid-cols-1 md:grid-cols-4 items-center gap-2 py-2 ${index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
                                        <p className="font-medium text-gray-700 dark:text-gray-300 truncate col-span-1" title={devName}>{devName}</p>
                                        <div className="md:col-span-3 text-right flex flex-wrap justify-end items-center gap-x-4 gap-y-1">
                                            <span className="text-sm text-center"><span className="font-bold">{investedHours}</span>h invertidas</span>
                                            <span className="text-sm text-center"><span className="font-bold">{itemCount}</span> item(s)</span>
                                            <span className="text-sm text-center"><span className="font-bold">{averageHours}</span>h prom./item</span>
                                        </div>
                                    </div>
                                ))}
                                {devMetrics.length === 0 && !isSummariesLoading && <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No hay datos para los desarrolladores seleccionados.</p>}
                            </div>
                        </div>
                        <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Horas Invertidas por Dev</h3>
                             {chartData.length > 0 && !isSummariesLoading ? (
                                <SimpleBarChart data={chartData} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                    {isSummariesLoading ? 'Calculando...' : 'No hay datos para mostrar.'}
                                </div>
                            )}
                        </div>
                    </div>
                    
                     <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                Tareas Individuales ({filteredItems.length})
                            </h2>
                            <button
                                onClick={handleExport}
                                disabled={filteredItems.length === 0 || isSummariesLoading}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Exportar Reporte
                            </button>
                        </div>

                        {filteredItems.length > 0 ? (
                            <WorkItemList
                                items={filteredItems}
                                onShowDetails={onShowDetails}
                                onNavigateToChildren={onNavigateToChildren}
                                taskSummaries={taskSummaries}
                                isLoadingSummaries={isSummariesLoading}
                                rootItems={rootItems}
                                taskToPbiTitleMap={hierarchyMap.titleMap}
                            />
                        ) : (
                            <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No se encontraron items</h3>
                                <p className="mt-2 text-gray-500 dark:text-gray-400">Ningún item coincide con los filtros seleccionados.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
