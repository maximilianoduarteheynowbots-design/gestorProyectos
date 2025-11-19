
import React, { useState, useMemo, useEffect } from 'react';
import { type WorkItem } from '../types';
import { getWeekDateRange } from '../utils/dateCalculator';
import { PlanningSummary } from './PlanningSummary';
import { ProjectsPlanningOverview } from './ProjectsPlanningOverview';
import { WeeklyLoadSummary } from './WeeklyLoadSummary';

const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
};

// Represents the plan: Map<projectId, hoursPerWeek[]>
type Plan = Map<number, number[]>;

export const WeeklyPlannerView: React.FC<{ workItems: WorkItem[] }> = ({ workItems }) => {
    const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);
    const [plan, setPlan] = useState<Plan>(new Map());
    const [view, setView] = useState<'planner' | 'summary'>('planner');

    const availableDevs = useMemo(() => {
        const devs = new Set<string>();
        workItems.forEach(item => {
            if (item.fields['System.AssignedTo']?.displayName) {
                devs.add(item.fields['System.AssignedTo'].displayName);
            }
        });
        return [...devs].sort();
    }, [workItems]);

    const devProjects = useMemo((): WorkItem[] => {
        if (!selectedDeveloper) return [];
        const COMPLETED_STATES = ['Done', 'Closed', 'Resolved', 'Removed'];
        return workItems
            .filter(wi => 
                wi.fields['System.AssignedTo']?.displayName === selectedDeveloper &&
                !COMPLETED_STATES.includes(wi.fields['System.State'])
            )
            .sort((a, b) => a.fields['System.Title'].localeCompare(b.fields['System.Title']));
    }, [workItems, selectedDeveloper]);

    // Auto-planning logic
    useEffect(() => {
        if (!selectedDeveloper) {
            setPlan(new Map());
            return;
        }

        const newPlan: Plan = new Map();
        devProjects.forEach(project => {
            let pendingHours = (project.fields['Custom.Hspendientes'] as number) || 0;
            const weeklyLoad = (project.fields['Custom.Cargasemanal'] as number) || 0;
            
            if (pendingHours > 0 && weeklyLoad > 0) {
                const projectSchedule: number[] = [];
                while (pendingHours > 0) {
                    const hoursThisWeek = Math.min(pendingHours, weeklyLoad);
                    projectSchedule.push(hoursThisWeek);
                    pendingHours -= hoursThisWeek;
                }
                newPlan.set(project.id, projectSchedule);
            } else {
                 newPlan.set(project.id, []);
            }
        });
        setPlan(newPlan);

    }, [selectedDeveloper, devProjects]);
    
    const maxWeeks = useMemo(() => {
        if (plan.size === 0) return 4; // Default view
        // FIX: Explicitly type `schedule` as `number[]` to resolve an inference issue where it was treated as `unknown`.
        const lengths = Array.from(plan.values()).map((schedule: number[]) => schedule.length);
        return Math.max(4, ...lengths);
    }, [plan]);

    const handleDeveloperChange = (dev: string) => {
        setSelectedDeveloper(dev);
        setView('planner');
    };

    const handleHoursChange = (projectId: number, weekIndex: number, hoursStr: string) => {
        const newHours = parseInt(hoursStr, 10);
        const validatedHours = isNaN(newHours) || newHours < 0 ? 0 : newHours;

        // FIX: Explicitly type `currentPlan` to resolve type inference issues where map values were treated as 'unknown'.
        // This ensures correct types for schedules when calculating lengths and spreading into new arrays.
        setPlan((currentPlan: Plan) => {
            const newPlan = new Map(currentPlan);
            const project = devProjects.find(p => p.id === projectId);
            if (!project) return currentPlan;

            const originalPending = (project.fields['Custom.Hspendientes'] as number) || 0;
            const weeklyLoad = (project.fields['Custom.Cargasemanal'] as number) || 0;

            let currentSchedule = [...(newPlan.get(projectId) || [])];
            
            // Ensure schedule has enough weeks
            while(currentSchedule.length <= weekIndex) {
                currentSchedule.push(0);
            }

            // Update the changed week
            currentSchedule[weekIndex] = validatedHours;
            
            // Re-balance the rest of the schedule
            const totalPlannedSoFar = currentSchedule.slice(0, weekIndex + 1).reduce((sum, h) => sum + h, 0);
            let remainingToPlan = originalPending - totalPlannedSoFar;

            let rebalancedTail: number[] = [];
            if (remainingToPlan > 0 && weeklyLoad > 0) {
                while(remainingToPlan > 0) {
                    const hoursForWeek = Math.min(remainingToPlan, weeklyLoad);
                    rebalancedTail.push(hoursForWeek);
                    remainingToPlan -= hoursForWeek;
                }
            }

            const finalSchedule = [...currentSchedule.slice(0, weekIndex + 1), ...rebalancedTail];
            
            // Trim trailing zeros for cleanliness
            while (finalSchedule.length > 0 && finalSchedule[finalSchedule.length - 1] === 0) {
                finalSchedule.pop();
            }

            newPlan.set(projectId, finalSchedule);
            return newPlan;
        });
    };

    const projectHoursMap = useMemo(() => {
        const map = new Map<number, number>();
        devProjects.forEach(p => {
            map.set(p.id, (p.fields['Custom.Hspendientes'] as number) || 0);
        });
        return map;
    }, [devProjects]);
    
    // Convert new plan format to the one PlanningSummary expects
    const finalCalculatedPlan = useMemo(() => {
        const weeksData: {
            weekIndex: number;
            startDate: string;
            endDate: string;
            projects: { id: number; title: string; assignedHours: number; }[];
            totalHours: number;
        }[] = [];

        for(let i = 0; i < maxWeeks; i++) {
            const { startDate, endDate } = getWeekDateRange(i);
            const projectsInWeek: { id: number; title: string; assignedHours: number; }[] = [];
            let totalHoursInWeek = 0;

            plan.forEach((schedule, projectId) => {
                const hoursInWeek = schedule[i] || 0;
                if (hoursInWeek > 0) {
                    const project = devProjects.find(p => p.id === projectId);
                    if (project) {
                        projectsInWeek.push({
                            id: projectId,
                            title: project.fields['System.Title'],
                            assignedHours: hoursInWeek
                        });
                        totalHoursInWeek += hoursInWeek;
                    }
                }
            });

            // Solo agrega la semana si tiene proyectos
            if (projectsInWeek.length > 0 || i < 4) { // Siempre muestra al menos 4 semanas si no hay plan
                 weeksData.push({
                    weekIndex: i,
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    projects: projectsInWeek,
                    totalHours: totalHoursInWeek
                });
            }
        }
        
        return weeksData;

    }, [plan, maxWeeks, devProjects]);
    
    const weeklyLoadData = useMemo(() => {
        return finalCalculatedPlan.map(week => ({
            weekIndex: week.weekIndex,
            startDate: week.startDate,
            totalHours: week.totalHours
        }));
    }, [finalCalculatedPlan]);


    if (view === 'summary') {
        return (
            <PlanningSummary
                plan={finalCalculatedPlan}
                developer={selectedDeveloper || ''}
                onBackToPlanner={() => setView('planner')}
                projectHoursMap={projectHoursMap}
                projects={devProjects}
            />
        );
    }
    
    const weekHeaders = Array.from({ length: maxWeeks }, (_, i) => {
        const { startDate } = getWeekDateRange(i);
        return { index: i, date: formatDate(startDate) };
    });

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                    <label htmlFor="dev-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar Desarrollador</label>
                    <select
                        id="dev-selector"
                        value={selectedDeveloper || ''}
                        onChange={e => handleDeveloperChange(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                        <option value="" disabled>-- Elige un desarrollador --</option>
                        {availableDevs.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => setView('summary')}
                    disabled={!selectedDeveloper || finalCalculatedPlan.length === 0}
                    className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Procesar Plan
                </button>
            </div>

            {!selectedDeveloper ? (
                 <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                   <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Comienza a Planificar</h3>
                   <p className="mt-2 text-gray-500 dark:text-gray-400">Selecciona un desarrollador para generar su plan de trabajo.</p>
               </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
                    <div className="lg:col-span-1 h-full">
                        <ProjectsPlanningOverview projects={devProjects} plan={plan} />
                    </div>
                     <div className="lg:col-span-2 flex flex-col gap-4 h-full min-w-0">
                        <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md overflow-auto flex-1">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Cronograma Semanal</h3>
                             <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                        <th className="sticky left-0 bg-light-card dark:bg-dark-card p-2 font-semibold min-w-[200px] z-10">Proyecto</th>
                                        {weekHeaders.map(header => (
                                            <th key={header.index} className="p-2 font-semibold text-center min-w-[120px]">
                                                Semana {header.index + 1}
                                                <div className="text-xs font-normal text-gray-500 dark:text-gray-400">({header.date})</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {devProjects.map(project => (
                                        <tr key={project.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg/50">
                                            <td className="sticky left-0 bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg/50 p-2 font-medium truncate z-10" title={project.fields['System.Title']}>
                                                {`#${project.id} - ${project.fields['System.Title']}`}
                                            </td>
                                            {weekHeaders.map(header => {
                                                const hours = plan.get(project.id)?.[header.index] ?? 0;
                                                return (
                                                    <td key={header.index} className="p-2 text-center">
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            value={hours === 0 ? '' : hours}
                                                            onChange={e => handleHoursChange(project.id, header.index, e.target.value)}
                                                            className="w-20 text-center p-1 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                        <WeeklyLoadSummary weeklyLoads={weeklyLoadData} />
                     </div>
                </div>
            )}
        </div>
    );
};
