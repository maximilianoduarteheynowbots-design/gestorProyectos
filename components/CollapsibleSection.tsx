import React, { useState, useEffect } from 'react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isOverflowVisible, setIsOverflowVisible] = useState(defaultOpen);

    useEffect(() => {
        if (isOpen) {
            // Después de que termine la animación de expansión, establece el desbordamiento como visible
            const timer = setTimeout(() => {
                setIsOverflowVisible(true);
            }, 300); // Coincide con la duración de la transición
            return () => clearTimeout(timer);
        } else {
            // Al cerrar, oculta inmediatamente el desbordamiento
            setIsOverflowVisible(false);
        }
    }, [isOpen]);


    return (
        <div className="p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center font-semibold text-lg text-gray-800 dark:text-gray-100"
                aria-expanded={isOpen}
            >
                {title}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out ${isOverflowVisible ? 'overflow-visible' : 'overflow-hidden'} ${isOpen ? 'max-h-[1000px] pt-4' : 'max-h-0'}`}
            >
                {children}
            </div>
        </div>
    );
};