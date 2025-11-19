
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PatInput } from './components/PatInput';
import { WorkItemViewer } from './components/WorkItemViewer';
import { getAnalyzableWorkItemsForProject, getInitialWorkItems, getWorkItemDetails, getWorkItemComments, getDescendantHourSummary, getSingleTaskDescendantHourSummary, getUserProfile } from './services/azureDevopsService';
import { type WorkItem, type NavigationLevel, type Filters, type TaskSummary, type Comment, type DashboardFilters, type DashboardSort } from './types';
import { WorkItemDetailModal } from './components/WorkItemDetailModal';
import { Dashboard } from './components/Dashboard';
import { TaskAnalysisView } from './components/TaskAnalysisView';
import { ProjectForecastView } from './components/ProjectForecastView';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { ProfitabilityCalculatorView } from './components/ProfitabilityCalculatorView';

type View = 'dashboard' | 'taskAnalysis' | 'projection' | 'weeklyPlanner' | 'profitabilityCalculator';

interface UserProfile {
    displayName: string;
    avatar: string;
}

const App: React.FC = () => {
    const [pat, setPat] = useState<string>('');
    const [orgName, setOrgName] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const [navigationStack, setNavigationStack] = useState<NavigationLevel[]>([{ id: 0, title: 'Dashboard de Proyectos' }]);
    const [workItemsCache, setWorkItemsCache] = useState<Map<number, WorkItem[]>>(new Map());
    const [currentItemId, setCurrentItemId] = useState<number>(0);
    const [filters, setFilters] = useState<Filters>({ type: 'all', state: 'all', assignee: 'all', tag: 'all' });
    const [taskSummaries, setTaskSummaries] = useState<Map<number, TaskSummary>>(new Map());

    const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
    const [modalError, setModalError] = useState<string | null>(null);
    
    const [currentView, setCurrentView] = useState<View>('dashboard');

    // Dashboard State
    const [selectedDevs, setSelectedDevs] = useState<string[]>([]);
    const [selectedPbis, setSelectedPbis] = useState<number[]>([]);
    const [dashboardDateRange, setDashboardDateRange] = useState({ startDate: '', endDate: '' });
    const [pbiSummaries, setPbiSummaries] = useState<Map<number, TaskSummary>>(new Map());
    const [isPbiSummariesLoading, setIsPbiSummariesLoading] = useState(false);
    const [dashboardSearchTerm, setDashboardSearchTerm] = useState('');
    const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({ states: [], tags: [] });
    const [dashboardSort, setDashboardSort] = useState<DashboardSort>({ field: 'id', direction: 'desc' });
    const [includeCompleted, setIncludeCompleted] = useState(false);

    // Task Analysis State
    const [allProjectItems, setAllProjectItems] = useState<WorkItem[] | null>(null);
    const [isAllItemsLoading, setIsAllItemsLoading] = useState(false);
    const [analysisDevs, setAnalysisDevs] = useState<string[]>([]);
    const [analysisTag, setAnalysisTag] = useState<string | null>(null);


    const hasFetchedOnce = useMemo(() => workItemsCache.has(0), [workItemsCache]);
    const rootWorkItems = useMemo(() => workItemsCache.get(0) || [], [workItemsCache]);
    
    const resetFilters = useCallback(() => {
        setFilters({ type: 'all', state: 'all', assignee: 'all', tag: 'all' });
    }, []);

    const fetchInitialItems = useCallback(async (details: { pat: string, orgName: string, projectName: string, rememberMe: boolean }) => {
        const { pat: token, orgName: name, projectName: project, rememberMe } = details;
        
        if (rememberMe) {
            localStorage.setItem('azureDevOpsCreds', JSON.stringify({ pat: token, orgName: name, projectName: project }));
        } else {
            localStorage.removeItem('azureDevOpsCreds');
        }

        setIsLoading(true);
        setError(null);
        setPat(token);
        setOrgName(name);
        setProjectName(project);
        
        try {
            const orgUrl = `https://dev.azure.com/${name}`;
            const items = await getInitialWorkItems(token, orgUrl, project);

            try {
                const profile = await getUserProfile(token, name);
                setUserProfile(profile);
            } catch (profileError) {
                console.warn("No se pudo obtener el perfil del usuario:", profileError);
                setUserProfile(null);
            }

            items.sort((a, b) => b.id - a.id);
            
            const newCache = new Map<number, WorkItem[]>();
            if (items.length === 0) {
                 setError("No se encontraron 'Product Backlog Items' en el proyecto especificado.");
                 newCache.set(0, []);
            } else {
                 newCache.set(0, items);
            }
            setWorkItemsCache(newCache);
            setCurrentItemId(0);
            setNavigationStack([{ id: 0, title: 'Dashboard de Proyectos' }]);
            resetFilters();
            setSelectedDevs([]);
            setSelectedPbis([]);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
            setPat('');
            setUserProfile(null);
        } finally {
            setIsLoading(false);
        }
    }, [resetFilters]);
    
    useEffect(() => {
        const calculatePbiHours = async () => {
            if (!pat || !orgName || !projectName || selectedPbis.length === 0) {
                setPbiSummaries(new Map());
                return;
            }
            
            setIsPbiSummariesLoading(true);
            
            try {
                const orgUrl = `https://dev.azure.com/${orgName}`;
                const summaryPromises = selectedPbis.map(id => 
                    getDescendantHourSummary(pat, orgUrl, projectName, [id], dashboardDateRange)
                        .then(summary => ({ id, summary }))
                );
                
                const results = await Promise.all(summaryPromises);
                const newSummaries = new Map<number, TaskSummary>();
                results.forEach(({ id, summary }) => {
                    newSummaries.set(id, summary);
                });
                setPbiSummaries(newSummaries);
                
            } catch (e) {
                console.error("Error calculating PBI summaries:", e);
                setPbiSummaries(new Map());
            } finally {
                setIsPbiSummariesLoading(false);
            }
        };
        
        calculatePbiHours();
    }, [pat, orgName, projectName, selectedPbis, dashboardDateRange]);


    useEffect(() => {
        const savedData = localStorage.getItem('azureDevOpsCreds');
        if (savedData) {
            const { pat, orgName, projectName } = JSON.parse(savedData);
            if (pat && orgName && projectName) {
                setTimeout(() => fetchInitialItems({ pat, orgName, projectName, rememberMe: true }), 0);
            }
        }
    }, [fetchInitialItems]);

    // Effect to fetch all tasks when switching to the analysis view
    useEffect(() => {
        const fetchAllItems = async () => {
            if (currentView === 'taskAnalysis' && allProjectItems === null && pat && orgName && projectName) {
                setIsAllItemsLoading(true);
                setError(null);
                try {
                    const orgUrl = `https://dev.azure.com/${orgName}`;
                    const items = await getAnalyzableWorkItemsForProject(pat, orgUrl, projectName);
                    setAllProjectItems(items);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Error al cargar todas las tareas del proyecto.');
                } finally {
                    setIsAllItemsLoading(false);
                }
            }
        };
        fetchAllItems();
    }, [currentView, allProjectItems, pat, orgName, projectName]);


    const handleShowDetails = useCallback(async (item: WorkItem) => {
        setSelectedWorkItem(item);
        setIsModalLoading(true);
        setModalError(null);
        setComments([]);
        try {
            const orgUrl = `https://dev.azure.com/${orgName}`;
            const fetchedComments = await getWorkItemComments(pat, orgUrl, projectName, item.id);
            setComments(fetchedComments);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Error al cargar los comentarios.');
        } finally {
            setIsModalLoading(false);
        }
    }, [pat, orgName, projectName]);

    const handleNavigateToChildren = useCallback(async (item: WorkItem) => {
        setIsLoading(true);
        setError(null);

        try {
            const childRelations = item.relations?.filter(
                (rel) => rel.rel === 'System.LinkTypes.Hierarchy-Forward'
            ) || [];

            if (childRelations.length === 0) {
                setWorkItemsCache(prevCache => new Map(prevCache).set(item.id, []));
            } else if (!workItemsCache.has(item.id)) {
                 const orgUrl = `https://dev.azure.com/${orgName}`;
                 const childIds = childRelations.map((rel) => parseInt(rel.url.split('/').pop()!, 10));
                 const childItems = await getWorkItemDetails(pat, orgUrl, childIds);
                 setWorkItemsCache(prevCache => new Map(prevCache).set(item.id, childItems));
            }
           
            setNavigationStack(prevStack => [...prevStack, { id: item.id, title: item.fields['System.Title'] }]);
            setCurrentItemId(item.id);
            setCurrentView('dashboard'); // Switch back to dashboard when navigating deep
        } catch (err)
 {
            setError(err instanceof Error ? err.message : 'Error al cargar los elementos hijos.');
        } finally {
            setIsLoading(false);
        }
    }, [pat, orgName, workItemsCache]);

    const handleBreadcrumbClick = useCallback((levelIndex: number) => {
        const newStack = navigationStack.slice(0, levelIndex + 1);
        const newCurrentItemId = newStack[newStack.length - 1].id;
        setNavigationStack(newStack);
        setCurrentItemId(newCurrentItemId);
        setCurrentView('dashboard');
    }, [navigationStack]);
    
    const handleReset = useCallback(() => {
        setPat('');
        setOrgName('');
        setProjectName('');
        localStorage.removeItem('azureDevOpsCreds');
        setWorkItemsCache(new Map());
        setNavigationStack([{ id: 0, title: 'Dashboard de Proyectos' }]);
        setCurrentItemId(0);
        setError(null);
        resetFilters();
        setTaskSummaries(new Map());
        setSelectedDevs([]);
        setSelectedPbis([]);
        setDashboardDateRange({ startDate: '', endDate: '' });
        setPbiSummaries(new Map());
        setDashboardSearchTerm('');
        setDashboardFilters({ states: [], tags: [] });
        setDashboardSort({ field: 'id', direction: 'desc' });
        setCurrentView('dashboard');
        setAllProjectItems(null);
        setAnalysisDevs([]);
        setAnalysisTag(null);
        setIncludeCompleted(false);
        setUserProfile(null);
    }, [resetFilters]);
    
    const handleFilterChange = useCallback((filterKey: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterKey]: value }));
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedWorkItem(null);
        setComments([]);
        setModalError(null);
    }, []);

    const handleDashboardDateChange = useCallback((key: 'startDate' | 'endDate', value: string) => {
        setDashboardDateRange(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleDashboardSearchChange = useCallback((term: string) => {
        setDashboardSearchTerm(term);
    }, []);

    const handleDashboardFilterChange = useCallback((filterKey: keyof DashboardFilters, value: string[]) => {
        setDashboardFilters(prev => ({ ...prev, [filterKey]: value }));
    }, []);

    const handleDashboardSortChange = useCallback((field: DashboardSort['field'], direction: DashboardSort['direction']) => {
        setDashboardSort({ field, direction });
    }, []);
    
    const handleIncludeCompletedChange = useCallback((checked: boolean) => {
        setIncludeCompleted(checked);
    }, []);

    const handleAnalysisDevsChange = useCallback((devs: string[]) => {
        setAnalysisDevs(devs);
        // Solo reinicia el tag si la lista de desarrolladores está vacía.
        // El tag seleccionado se validará en TaskAnalysisView si deja de ser válido.
        if (devs.length === 0) {
            setAnalysisTag(null);
        }
    }, []);


    const currentWorkItems = useMemo(() => workItemsCache.get(currentItemId) || [], [workItemsCache, currentItemId]);
    const isRootLevel = useMemo(() => navigationStack.length === 1, [navigationStack]);

    
    const filteredWorkItems = useMemo(() => {
        if (isRootLevel) return [];

        return currentWorkItems.filter(item => {
            const typeMatch = filters.type === 'all' || item.fields['System.WorkItemType'] === filters.type;
            const stateMatch = filters.state === 'all' || item.fields['System.State'] === filters.state;
            const assigneeMatch = filters.assignee === 'all' || item.fields['System.AssignedTo']?.displayName === filters.assignee;
            
            const tags = item.fields['System.Tags']?.split('; ').map(t => t.trim()) || [];
            const tagMatch = filters.tag === 'all' || tags.includes(filters.tag);
            
            return typeMatch && stateMatch && assigneeMatch && tagMatch;
        });
    }, [currentWorkItems, filters, isRootLevel]);


    useEffect(() => {
        const calculateTaskSummaries = async () => {
            if (!pat || !orgName || !projectName || currentWorkItems.length === 0) {
                setTaskSummaries(new Map());
                return;
            }

            const tasks = currentWorkItems.filter(item => item.fields['System.WorkItemType'] === 'Task');
            if (tasks.length === 0) {
                setTaskSummaries(new Map());
                return;
            }

            try {
                const orgUrl = `https://dev.azure.com/${orgName}`;
                const summaryPromises = tasks.map(async (task) => {
                    const ownEstimated = (typeof task.fields['Custom.Horasestimadasdetarea'] === 'number') ? task.fields['Custom.Horasestimadasdetarea'] : 0;
                    const hasChildren = task.relations?.some(rel => rel.rel === 'System.LinkTypes.Hierarchy-Forward') || false;

                    const descendantSummary = await getSingleTaskDescendantHourSummary(pat, orgUrl, projectName, task.id);
                    const childEstimatedSum = descendantSummary.estimated;

                    // Prioritize the task's own estimate. If it doesn't have one, roll up from children.
                    const totalEstimated = ownEstimated > 0 ? ownEstimated : childEstimatedSum;

                    // A discrepancy exists if the task has its own estimate, has children, and the estimate doesn't match the children's sum.
                    const discrepancy = hasChildren && ownEstimated > 0 && ownEstimated !== childEstimatedSum;

                    return {
                        id: task.id,
                        summary: {
                            estimated: totalEstimated,
                            invested: descendantSummary.invested,
                            discrepancy,
                            ownEstimated,
                            childEstimatedSum,
                        }
                    };
                });
                
                const resolvedSummaries = await Promise.all(summaryPromises);
                const newSummaries = new Map<number, TaskSummary>();
                for (const { id, summary } of resolvedSummaries) {
                    newSummaries.set(id, summary);
                }

                setTaskSummaries(newSummaries);
            } catch (e) {
                console.error("Failed to fetch descendant details for hour calculation:", e);
                setTaskSummaries(new Map());
            }
        };

        calculateTaskSummaries();
    }, [currentWorkItems, pat, orgName, projectName]);


    const availableTypes = useMemo(() => [...new Set(currentWorkItems.map(item => item.fields['System.WorkItemType']))].sort(), [currentWorkItems]);
    const availableStates = useMemo(() => [...new Set(currentWorkItems.map(item => item.fields['System.State']))].sort(), [currentWorkItems]);
    const availableAssignees = useMemo(() => [...new Set(currentWorkItems.map(item => item.fields['System.AssignedTo']?.displayName).filter(Boolean) as string[])].sort(), [currentWorkItems]);
    const availableTags = useMemo(() => {
        const allTags = new Set<string>();
        currentWorkItems.forEach(item => {
            item.fields['System.Tags']?.split('; ').forEach(tag => {
                if (tag.trim()) allTags.add(tag.trim());
            });
        });
        return [...allTags].sort();
    }, [currentWorkItems]);
    
    const renderContent = () => {
        if (isLoading && !hasFetchedOnce) {
            return <PatInput onSubmit={fetchInitialItems} isLoading={true} error={null} />;
        }

        if (!hasFetchedOnce) {
            return <PatInput onSubmit={fetchInitialItems} isLoading={isLoading} error={error} />;
        }

        if (isRootLevel) {
            switch (currentView) {
                case 'dashboard':
                    return (
                        <Dashboard
                            workItems={rootWorkItems}
                            selectedDevs={selectedDevs}
                            onSelectedDevsChange={setSelectedDevs}
                            selectedPbis={selectedPbis}
                            onSelectedPbisChange={setSelectedPbis}
                            dateRange={dashboardDateRange}
                            onDateChange={handleDashboardDateChange}
                            pbiSummaries={pbiSummaries}
                            isSummariesLoading={isPbiSummariesLoading}
                            onShowDetails={handleShowDetails}
                            onNavigateToChildren={handleNavigateToChildren}
                            dashboardSearchTerm={dashboardSearchTerm}
                            onDashboardSearchChange={handleDashboardSearchChange}
                            dashboardFilters={dashboardFilters}
                            onDashboardFilterChange={handleDashboardFilterChange}
                            dashboardSort={dashboardSort}
                            onDashboardSortChange={handleDashboardSortChange}
                            includeCompleted={includeCompleted}
                            onIncludeCompletedChange={handleIncludeCompletedChange}
                            orgName={orgName}
                            projectName={projectName}
                        />
                    );
                case 'taskAnalysis':
                    return (
                        <TaskAnalysisView
                            allItems={allProjectItems}
                            isLoading={isAllItemsLoading}
                            error={error}
                            selectedDevs={analysisDevs}
                            onSelectedDevsChange={handleAnalysisDevsChange}
                            selectedTag={analysisTag}
                            onSelectedTagChange={setAnalysisTag}
                            onShowDetails={handleShowDetails}
                            onNavigateToChildren={handleNavigateToChildren}
                            rootItems={rootWorkItems}
                            getTaskSummary={async (taskId) => {
                                if (!pat || !orgName || !projectName) return { estimated: 0, invested: 0 };
                                const orgUrl = `https://dev.azure.com/${orgName}`;
                                return getSingleTaskDescendantHourSummary(pat, orgUrl, projectName, taskId);
                            }}
                        />
                    );
                case 'projection':
                    return <ProjectForecastView workItems={rootWorkItems} />;
                case 'weeklyPlanner':
                    return <WeeklyPlannerView workItems={rootWorkItems} />;
                case 'profitabilityCalculator':
                    return <ProfitabilityCalculatorView 
                                workItems={rootWorkItems}
                                pat={pat}
                                orgName={orgName}
                                projectName={projectName} 
                            />;
                default:
                    return null;
            }
        }


        return (
             <WorkItemViewer
                isLoading={isLoading}
                error={error}
                workItems={filteredWorkItems}
                totalItemsCount={currentWorkItems.length}
                navigationStack={navigationStack}
                onShowDetails={handleShowDetails}
                onNavigateToChildren={handleNavigateToChildren}
                onBreadcrumbClick={handleBreadcrumbClick}
                filters={filters}
                onFilterChange={handleFilterChange}
                availableTypes={availableTypes}
                availableStates={availableStates}
                availableAssignees={availableAssignees}
                taskSummaries={taskSummaries}
                availableTags={availableTags}
            />
        );
    }
    
    const NavButton: React.FC<{ view: View, label: string }> = ({ view, label }) => {
        const isActive = currentView === view && isRootLevel;
        return (
            <button
                onClick={() => setCurrentView(view)}
                disabled={!isRootLevel}
                className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-bg focus:ring-brand-primary ${
                    isActive
                        ? 'bg-brand-primary text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                } ${!isRootLevel ? 'cursor-not-allowed opacity-50' : ''}`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="min-h-screen text-light-text dark:text-dark-text p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">
                        Visor de Tareas de Azure DevOps
                    </h1>
                     {hasFetchedOnce && (
                        <div className="flex items-center gap-3">
                            {userProfile && (
                                <>
                                    <span className="font-semibold text-right hidden sm:inline">{userProfile.displayName}</span>
                                    {userProfile.avatar ? (
                                        <img 
                                            src={userProfile.avatar} 
                                            alt={`Avatar de ${userProfile.displayName}`} 
                                            className="w-10 h-10 rounded-full object-cover border-2 border-brand-secondary" 
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-2 border-brand-secondary">
                                            <span className="text-lg font-bold text-gray-600 dark:text-gray-300">{userProfile.displayName?.charAt(0) || '?'}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <button
                                onClick={handleReset}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                            >
                                Salir
                            </button>
                        </div>
                    )}
                </header>

                {hasFetchedOnce && (
                    <nav className="mb-6 bg-light-card dark:bg-dark-card p-2 rounded-lg shadow-sm flex items-center space-x-1 sm:space-x-2 flex-wrap">
                         <NavButton view="dashboard" label="Dashboard" />
                         <NavButton view="taskAnalysis" label="Análisis de Tareas" />
                         <NavButton view="projection" label="Proyección" />
                         <NavButton view="weeklyPlanner" label="Planificador" />
                         <NavButton view="profitabilityCalculator" label="Calculadora" />
                    </nav>
                )}
                
                {renderContent()}

            </div>
             {selectedWorkItem && (
                <WorkItemDetailModal
                    item={selectedWorkItem}
                    comments={comments}
                    isLoading={isModalLoading}
                    error={modalError}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default App;
