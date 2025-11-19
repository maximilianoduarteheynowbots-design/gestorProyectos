
import React, { useMemo } from 'react';
import { type WorkItem } from '../types';

interface ProjectsPlanningOverviewProps {
    projects: WorkItem[];
    plan: Map<number, number[]>; // key: projectId, value: hours per week
}

export const ProjectsPlanningOverview: React.FC<ProjectsPlanningOverviewProps> = ({ projects, plan }) => {

    const projectSummaries = useMemo(() => {
        return projects.map(project => {
            const initialPending = (project.fields['Custom.Hspendientes'] as number) || 0;
            const plannedHours = plan.get(project.id)?.reduce((sum, h) => sum + h, 0) || 0;
            const remaining = initialPending - plannedHours;
            
            return {
                id: project.id,
                title: project.fields['System.Title'],
                initialPending,
                plannedHours,
                remaining
            };
        }).sort((a, b) => a.title.localeCompare(b.title));
    }, [projects, plan]);
    
    return (
        <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Resumen de Proyectos</h3>
            <div className="flex-1 overflow-y-auto pr-2">
                 <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-light-card dark:bg-dark-card border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-2 font-semibold">Proyecto</th>
                            <th className="p-2 font-semibold text-center">Pendientes</th>
                            <th className="p-2 font-semibold text-center">Planificadas</th>
                            <th className="p-2 font-semibold text-center">Restantes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectSummaries.map(summary => (
                            <tr key={summary.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <td className="p-2 font-medium truncate" title={summary.title}>{`#${summary.id} - ${summary.title}`}</td>
                                <td className="p-2 text-center">{summary.initialPending}h</td>
                                <td className="p-2 text-center">{summary.plannedHours}h</td>
                                <td className={`p-2 text-center font-bold ${summary.remaining < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                    {summary.remaining}h
                                </td>
                            </tr>
                        ))}
                         {projectSummaries.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-4 text-gray-500 dark:text-gray-400">No hay proyectos para el desarrollador seleccionado.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};
