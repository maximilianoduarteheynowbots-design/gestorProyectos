import React, { useState, useRef, useEffect, useMemo } from 'react';

interface ModernMultiSelectProps {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

export const ModernMultiSelect: React.FC<ModernMultiSelectProps> = ({
    label,
    options,
    selected,
    onChange,
    onSelectAll,
    onDeselectAll,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

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
    
    const filteredOptions = useMemo(() => {
        return options.filter(option => 
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const handleOptionToggle = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(s => s !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 text-left bg-light-card dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-primary flex justify-between items-center"
            >
                <span className="truncate">{selected.length > 0 ? `${selected.length} seleccionado(s)` : 'Ninguno seleccionado'}</span>
                 <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-light-card dark:bg-dark-card shadow-lg rounded-md border border-gray-300 dark:border-gray-700 max-h-60 flex flex-col">
                    <div className="p-2">
                         <input
                            type="search"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="flex justify-between px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <button onClick={onSelectAll} className="text-xs text-brand-primary hover:underline">Todos</button>
                        <button onClick={onDeselectAll} className="text-xs text-brand-primary hover:underline">Ninguno</button>
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {filteredOptions.map(option => (
                            <li 
                                key={option.value}
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center"
                                onClick={() => handleOptionToggle(option.value)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option.value)}
                                    readOnly
                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary mr-3"
                                />
                                <span className="flex-1 truncate">{option.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
