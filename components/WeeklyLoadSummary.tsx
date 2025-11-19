import React from 'react';

interface WeeklyLoad {
    weekIndex: number;
    startDate: string;
    totalHours: number;
}

interface WeeklyLoadSummaryProps {
    weeklyLoads: WeeklyLoad[];
}

export const WeeklyLoadSummary: React.FC<WeeklyLoadSummaryProps> = ({ weeklyLoads }) => {
    return (
        <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Resumen de Carga Semanal</h3>
            <div className="flex overflow-x-auto pb-4 -mb-4 space-x-4">
                {weeklyLoads.map(week => {
                    const isOverloaded = week.totalHours > 40;
                    const cardClasses = `flex-shrink-0 w-40 p-3 rounded-lg shadow-sm transition-colors ${
                        isOverloaded
                            ? 'bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-600'
                            : 'bg-light-bg dark:bg-dark-bg/50'
                    }`;
                    const hoursClasses = `text-3xl font-bold mt-1 ${
                        isOverloaded ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
                    }`;

                    return (
                        <div key={week.weekIndex} className={cardClasses}>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Semana {week.weekIndex + 1}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">({week.startDate})</p>
                            <p className={hoursClasses}>
                                {week.totalHours}<span className="text-xl">h</span>
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
