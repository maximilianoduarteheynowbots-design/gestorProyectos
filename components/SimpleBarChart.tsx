

import React from 'react';

interface ChartData {
    label: string;
    value: number;
    color?: string;
}

interface SimpleBarChartProps {
    data: ChartData[];
    maxValue?: number;
}

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const getBarColor = (index: number) => colors[index % colors.length];

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, maxValue: propMaxValue }) => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(propMaxValue ?? 0, ...data.map(d => d.value), 0);

    return (
        <div className="w-full h-full flex flex-col space-y-2">
            {data.map((item, index) => {
                const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                const barColor = item.color || getBarColor(index);
                
                return (
                    <div key={item.label} className="group">
                        <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-medium text-gray-600 dark:text-gray-300 truncate pr-2" title={item.label}>
                                {item.label}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {item.value.toLocaleString()}h
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                            <div
                                className="h-4 rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: barColor,
                                }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};