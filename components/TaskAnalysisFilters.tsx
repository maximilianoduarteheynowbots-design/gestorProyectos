
import React from 'react';
import { ModernMultiSelect } from './ModernMultiSelect';
import { ModernSelect } from './ModernSelect';

interface TaskAnalysisFiltersProps {
    availableDevs: string[];
    selectedDevs: string[];
    onSelectedDevsChange: (devs: string[]) => void;
    availableTags: string[];
    selectedTag: string | null;
    onSelectedTagChange: (tag: string | null) => void;
    isDisabled: boolean;
}

export const TaskAnalysisFilters: React.FC<TaskAnalysisFiltersProps> = ({
    availableDevs,
    selectedDevs,
    onSelectedDevsChange,
    availableTags,
    selectedTag,
    onSelectedTagChange,
    isDisabled,
}) => {
    
    const devOptions = availableDevs.map(dev => ({ value: dev, label: dev }));
    const tagOptions = availableTags.map(tag => ({ value: tag, label: tag }));

    return (
        <div className={`p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm transition-opacity ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}>
                    <ModernMultiSelect
                        label="Desarrollador (uno o más)"
                        options={devOptions}
                        selected={selectedDevs}
                        onChange={onSelectedDevsChange}
                        onSelectAll={() => onSelectedDevsChange(availableDevs)}
                        onDeselectAll={() => onSelectedDevsChange([])}
                    />
                </div>
                 <div style={{ pointerEvents: isDisabled || selectedDevs.length === 0 ? 'none' : 'auto' }} className={`${selectedDevs.length === 0 ? 'opacity-50' : ''}`}>
                    <ModernSelect
                        label="Tag de Tarea (uno)"
                        options={tagOptions}
                        selected={selectedTag || ''}
                        onChange={(val) => onSelectedTagChange(val)}
                    />
                </div>
            </div>
        </div>
    );
};
