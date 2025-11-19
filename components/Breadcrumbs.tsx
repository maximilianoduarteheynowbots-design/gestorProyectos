
import React from 'react';
import { type NavigationLevel } from '../types';

interface BreadcrumbsProps {
    stack: NavigationLevel[];
    onNavigate: (levelIndex: number) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ stack, onNavigate }) => {
    return (
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center flex-wrap bg-light-card dark:bg-dark-card p-3 rounded-lg shadow-sm">
            {stack.map((level, index) => (
                <React.Fragment key={level.id}>
                    {index < stack.length - 1 ? (
                        <button
                            onClick={() => onNavigate(index)}
                            className="text-brand-primary hover:underline text-sm sm:text-base"
                        >
                            {level.title}
                        </button>
                    ) : (
                        <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm sm:text-base" aria-current="page">
                            {level.title}
                        </span>
                    )}
                    {index < stack.length - 1 && (
                         <svg className="h-5 w-5 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};
