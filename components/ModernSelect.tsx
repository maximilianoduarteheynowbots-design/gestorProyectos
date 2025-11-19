import React, { useState, useRef, useEffect, useMemo } from 'react';

interface ModernSelectProps {
    label: string;
    options: { value: string; label: string }[];
    selected: string;
    onChange: (selected: string) => void;
}

export const ModernSelect: React.FC<ModernSelectProps> = ({
    label,
    options,
    selected,
    onChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedLabel = useMemo(() => {
        return options.find(option => option.value === selected)?.label || 'Seleccionar...';
    }, [options, selected]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleOptionClick = (value: string) => {
        onChange(value);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 text-left bg-light-card dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-primary flex justify-between items-center"
            >
                <span className="truncate">{selectedLabel}</span>
                 <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-light-card dark:bg-dark-card shadow-lg rounded-md border border-gray-300 dark:border-gray-700 max-h-60 flex flex-col">
                    <ul className="overflow-y-auto flex-1 p-1">
                        {options.map(option => (
                            <li 
                                key={option.value}
                                className={`px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center ${option.value === selected ? 'font-semibold bg-gray-100 dark:bg-gray-700' : ''}`}
                                onClick={() => handleOptionClick(option.value)}
                            >
                                <span className="flex-1 truncate">{option.label}</span>
                                {option.value === selected && (
                                     <svg className="h-5 w-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};