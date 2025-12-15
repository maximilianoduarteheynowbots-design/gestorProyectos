
import React, { useState } from 'react';

interface ChartData {
    label: string;
    value: number;
    color?: string;
}

interface VerticalBarChartProps {
    data: ChartData[];
    height?: number;
    valueUnit?: string;
    onBarClick?: (index: number) => void;
}

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E'];
const getBarColor = (index: number) => colors[index % colors.length];

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({ data, height = 300, valueUnit = 'h', onBarClick }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data || data.length === 0) {
        return <div className="h-full flex items-center justify-center text-gray-500">No hay datos para mostrar</div>;
    }

    const maxValue = Math.max(...data.map(d => d.value), 0);
    // Add 10% headroom
    const chartMax = maxValue > 0 ? maxValue * 1.1 : 10; 

    return (
        <div className="w-full flex flex-col items-center select-none" style={{ height: `${height}px` }}>
            <div className="flex-1 w-full flex items-end justify-around gap-2 px-2 relative border-b border-gray-300 dark:border-gray-600">
                {/* Y-Axis Grid Lines (Optional - simplified) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                    {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                        <div key={pct} className="w-full border-t border-black dark:border-white h-0" style={{ bottom: `${pct * 100}%` }}></div>
                    ))}
                </div>

                {data.map((item, index) => {
                    const barHeightPercent = (item.value / chartMax) * 100;
                    const color = item.color || getBarColor(index);
                    const isHovered = hoveredIndex === index;

                    return (
                        <div 
                            key={index} 
                            className={`flex flex-col items-center justify-end h-full group w-full max-w-[60px] ${onBarClick ? 'cursor-pointer' : ''}`}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => onBarClick && onBarClick(index)}
                        >
                            <div className="relative w-full flex flex-col justify-end items-center h-full">
                                {/* Tooltip / Value Label */}
                                <div 
                                    className={`mb-1 text-xs font-bold transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-70'} text-gray-700 dark:text-gray-300`}
                                >
                                    {item.value}{valueUnit}
                                </div>
                                
                                {/* Bar */}
                                <div 
                                    className="w-full rounded-t-md transition-all duration-300 ease-out hover:brightness-110 relative"
                                    style={{ 
                                        height: `${barHeightPercent}%`, 
                                        backgroundColor: color,
                                        opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1
                                    }}
                                >
                                     {/* Shine effect on hover */}
                                     {isHovered && (
                                        <div className="absolute inset-0 bg-white opacity-20 rounded-t-md"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* X-Axis Labels */}
            <div className="w-full flex justify-around gap-2 px-2 mt-2">
                {data.map((item, index) => (
                    <div 
                        key={index} 
                        className={`w-full max-w-[60px] text-center ${onBarClick ? 'cursor-pointer' : ''}`}
                        onClick={() => onBarClick && onBarClick(index)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                         <p 
                            className={`text-xs text-gray-600 dark:text-gray-400 truncate transition-colors ${hoveredIndex === index ? 'font-bold text-gray-900 dark:text-gray-100' : ''}`}
                            title={item.label}
                        >
                            {item.label.split(' ')[0]} {/* Show First Name primarily */}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
