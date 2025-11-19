


import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { type WorkItem, type ProfitabilityResult } from '../types';
import { DonutChart } from './DonutChart';
import { AnimatedCounter } from './AnimatedCounter';
import { getDescendantLineas } from '../services/azureDevopsService';

interface ProfitabilityCalculatorViewProps {
    workItems: WorkItem[];
    pat: string;
    orgName: string;
    projectName: string;
}

interface ProjectPersonnel {
    name: string;
    hours: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
};

const ResultCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg text-center ${className}`}>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className="mt-1 text-3xl font-bold text-gray-800 dark:text-gray-200">
            {children}
        </div>
    </div>
);

const SearchableProjectSelect: React.FC<{
    projects: WorkItem[];
    onSelect: (project: WorkItem) => void;
}> = ({ projects, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => 
            p.id.toString().includes(searchTerm) || 
            p.fields['System.Title'].toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (project: WorkItem) => {
        onSelect(project);
        setSearchTerm(`#${project.id} - ${project.fields['System.Title']}`);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label htmlFor="project-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar Proyecto</label>
            <input
                id="project-search"
                type="text"
                value={searchTerm}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Buscar por ID o título..."
                className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            {isOpen && (
                <ul className="absolute z-10 mt-1 w-full bg-light-card dark:bg-dark-card shadow-lg rounded-md border border-gray-300 dark:border-gray-700 max-h-60 overflow-y-auto">
                    {filteredProjects.map(p => (
                        <li 
                            key={p.id} 
                            onClick={() => handleSelect(p)}
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                           #{p.id} - {p.fields['System.Title']}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export const ProfitabilityCalculatorView: React.FC<ProfitabilityCalculatorViewProps> = ({ workItems, pat, orgName, projectName }) => {
    const [selectedProject, setSelectedProject] = useState<WorkItem | null>(null);
    const [personnel, setPersonnel] = useState<ProjectPersonnel[]>([]);
    const [personnelCosts, setPersonnelCosts] = useState<Map<string, string>>(new Map());
    const [results, setResults] = useState<ProfitabilityResult | null>(null);
    const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    const handleProjectSelect = useCallback((project: WorkItem) => {
        setSelectedProject(project);
        setPersonnel([]);
        setPersonnelCosts(new Map());
        setResults(null);
        setIsLoadingPersonnel(true);

        const orgUrl = `https://dev.azure.com/${orgName}`;
        getDescendantLineas(pat, orgUrl, projectName, project.id)
            .then(lineas => {
                const hoursByPerson = new Map<string, number>();
                lineas.forEach(linea => {
                    const person = linea.fields['System.AssignedTo']?.displayName;
                    const hours = (linea.fields['Custom.Horas'] as number) || 0;
                    if (person) {
                        hoursByPerson.set(person, (hoursByPerson.get(person) || 0) + hours);
                    }
                });

                const newPersonnel = Array.from(hoursByPerson.entries()).map(([name, hours]) => ({ name, hours }));
                setPersonnel(newPersonnel);
                
                const newCosts = new Map<string, string>();
                newPersonnel.forEach(p => newCosts.set(p.name, ''));
                setPersonnelCosts(newCosts);
            })
            .catch(error => {
                console.error("Failed to fetch project personnel:", error);
                alert(`Error al cargar el personal del proyecto: ${error.message}`);
            })
            .finally(() => {
                setIsLoadingPersonnel(false);
            });
    }, [pat, orgName, projectName]);
    
    const handleCostChange = (name: string, cost: string) => {
        setPersonnelCosts(prev => new Map(prev).set(name, cost));
        setResults(null);
    };

    const handleCalculate = useCallback(() => {
        if (!selectedProject) return;
        setIsCalculating(true);
        
        const clientCost = (selectedProject.fields['Custom.Valorrepetitivo'] as number) || 0;

        let totalCost = 0;
        for (const p of personnel) {
            const cost = parseFloat(personnelCosts.get(p.name) || '0');
            totalCost += p.hours * cost;
        }

        const totalProfit = clientCost - totalCost;
        const profitMargin = clientCost > 0 ? (totalProfit / clientCost) * 100 : 0;
        
        setTimeout(() => {
            setResults({
                totalRevenue: clientCost,
                totalCost,
                totalProfit,
                profitMargin,
            });
            setIsCalculating(false);
        }, 500);
    }, [selectedProject, personnel, personnelCosts]);

    const handleReset = () => {
        setSelectedProject(null);
        setPersonnel([]);
        setPersonnelCosts(new Map());
        setResults(null);
    };

    const isFormValid = useMemo(() => {
        if (!selectedProject) {
            return false;
        }
        for (const cost of personnelCosts.values()) {
            // FIX: Cast `cost` to string as it can be inferred as `unknown`.
            const costStr = String(cost);
            if (costStr.trim() === '' || isNaN(parseFloat(costStr)) || parseFloat(costStr) < 0) {
                return false;
            }
        }
        return personnel.length > 0 && Array.from(personnelCosts.values()).every(c => String(c).trim() !== '');
    }, [selectedProject, personnel, personnelCosts]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-1 bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md space-y-4 self-start">
                <h2 className="text-xl font-semibold">Calculadora de Rentabilidad</h2>
                
                <SearchableProjectSelect projects={workItems} onSelect={handleProjectSelect} />

                {selectedProject && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio al Cliente</label>
                            <p className="mt-1 font-semibold text-lg">{formatCurrency((selectedProject.fields['Custom.Valorrepetitivo'] as number) || 0)}</p>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                            <h3 className="text-md font-semibold border-b border-gray-200 dark:border-gray-700 pb-1">Costos de Personal (Actuales)</h3>
                            {isLoadingPersonnel ? (
                                <div className="text-center py-4"><svg className="animate-spin h-6 w-6 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
                            ) : personnel.length > 0 ? (
                                personnel.map(p => (
                                    <div key={p.name} className="flex items-center gap-3">
                                        <label htmlFor={`cost-${p.name}`} className="flex-1 text-sm truncate" title={`${p.name} (${p.hours}h)`}>
                                            {p.name} <span className="text-gray-500 dark:text-gray-400">({p.hours}h)</span>
                                        </label>
                                        <input
                                            id={`cost-${p.name}`}
                                            type="number"
                                            placeholder="Costo/h"
                                            value={personnelCosts.get(p.name) || ''}
                                            onChange={e => handleCostChange(p.name, e.target.value)}
                                            min="0"
                                            className="w-28 text-sm p-1 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400">No se encontraron registros de horas.</p>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={handleCalculate} disabled={!isFormValid || isCalculating} className="flex-1 bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                                {isCalculating ? 'Calculando...' : 'Procesar'}
                            </button>
                             <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors">Limpiar</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-2 bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
                {results ? (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-xl font-semibold">Resultados para: <span className="text-brand-primary">{selectedProject?.fields['System.Title']}</span></h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ResultCard title="Ganancia Neta"><AnimatedCounter value={results.totalProfit} formatter={formatCurrency} /></ResultCard>
                            <ResultCard title="Margen"><AnimatedCounter value={Math.round(results.profitMargin)} />%</ResultCard>
                            <ResultCard title="Costo Total"><AnimatedCounter value={results.totalCost} formatter={formatCurrency} /></ResultCard>
                        </div>
                        <div className="mt-6 p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg">
                            <h3 className="font-semibold mb-2 text-center">Desglose de Rentabilidad</h3>
                            <DonutChart data={[{ label: 'Ganancia', value: results.totalProfit, color: '#10B981' },{ label: 'Costo', value: results.totalCost, color: '#EF4444' },]} />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Esperando datos</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Seleccione un proyecto y complete los costos para comenzar la simulación.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};