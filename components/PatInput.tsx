
import React, { useState, useEffect } from 'react';

interface PatInputProps {
    onSubmit: (details: { pat: string, orgName: string, projectName: string, rememberMe: boolean }) => void;
    isLoading: boolean;
    error: string | null;
}

export const PatInput: React.FC<PatInputProps> = ({ onSubmit, isLoading, error }) => {
    const [pat, setPat] = useState('');
    // Valores por defecto pre-cargados
    const [orgName, setOrgName] = useState('isbelsa');
    const [projectName, setProjectName] = useState('Proyectos');
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedData = localStorage.getItem('azureDevOpsCreds');
        if (savedData) {
            try {
                const { pat, orgName, projectName } = JSON.parse(savedData);
                if (pat) setPat(pat);
                if (orgName) setOrgName(orgName);
                if (projectName) setProjectName(projectName);
                setRememberMe(true);
            } catch (e) {
                console.error("Failed to parse saved credentials", e);
                localStorage.removeItem('azureDevOpsCreds');
            }
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pat.trim() && orgName.trim() && projectName.trim()) {
            onSubmit({ 
                pat: pat.trim(), 
                orgName: orgName.trim(),
                projectName: projectName.trim(), 
                rememberMe 
            });
        }
    };
    
    const isFormValid = pat.trim() && orgName.trim() && projectName.trim();

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-light-card dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-fade-in border border-gray-100 dark:border-gray-700">
                <div className="bg-gradient-to-r from-brand-primary to-brand-secondary p-8 text-center">
                    <div className="mx-auto h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Azure DevOps</h2>
                    <p className="text-blue-100 text-sm mt-1">Visor y Analizador de Tareas</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative">
                            <label htmlFor="org-name" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Organización</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <input
                                    id="org-name"
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                                    placeholder="ej. mi-organizacion"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label htmlFor="project-name" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Proyecto</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <input
                                    id="project-name"
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                                    placeholder="ej. MiProyecto"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label htmlFor="pat-input" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Personal Access Token (PAT)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <input
                                    id="pat-input"
                                    type="password"
                                    value={pat}
                                    onChange={(e) => setPat(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                                    placeholder="Token de seguridad"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary cursor-pointer"
                                    disabled={isLoading}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                                    Recordar mis datos
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center"
                            disabled={isLoading || !isFormValid}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Autenticando...
                                </>
                            ) : (
                                'Acceder al Proyecto'
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm rounded-r-md animate-fade-in">
                            <p className="font-bold">Error de conexión</p>
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
