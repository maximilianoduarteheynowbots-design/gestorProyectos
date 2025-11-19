import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) {
        return null;
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };
    
    const buttonClasses = "px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg transition-colors duration-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed";
    const hoverClasses = "hover:bg-brand-secondary";

    return (
        <div className="flex justify-between items-center mt-6 py-3 px-4 bg-light-card dark:bg-dark-card rounded-lg shadow-sm">
            <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className={`${buttonClasses} ${currentPage !== 1 ? hoverClasses : ''}`}
                aria-label="Ir a la página anterior"
            >
                Anterior
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
            </span>
            <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`${buttonClasses} ${currentPage !== totalPages ? hoverClasses : ''}`}
                aria-label="Ir a la página siguiente"
            >
                Siguiente
            </button>
        </div>
    );
};
