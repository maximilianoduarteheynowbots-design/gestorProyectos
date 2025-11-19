import React, { useState } from 'react';

interface DonutChartData {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    data: DonutChartData[];
    size?: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
};

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 200 }) => {
    const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total <= 0) return null;

    const radius = size / 3;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercent = 0;

    const slices = data.map(slice => {
        const percent = slice.value / total;
        const strokeDasharray = `${percent * circumference} ${circumference}`;
        const rotation = cumulativePercent * 360;
        cumulativePercent += percent;
        return { ...slice, strokeDasharray, rotation };
    });

    const activeSlice = hoveredSlice ? data.find(d => d.label === hoveredSlice) : data[0];

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    {slices.map((slice, index) => (
                        <circle
                            key={index}
                            r={radius}
                            cx={size / 2}
                            cy={size / 2}
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth={size / 4}
                            strokeDasharray={slice.strokeDasharray}
                            transform={`rotate(${slice.rotation} ${size/2} ${size/2})`}
                            onMouseEnter={() => setHoveredSlice(slice.label)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            style={{
                                transition: 'all 0.2s ease-out',
                                opacity: hoveredSlice === null || hoveredSlice === slice.label ? 1 : 0.5,
                            }}
                        >
                            <title>{`${slice.label}: ${formatCurrency(slice.value)} (${((slice.value/total) * 100).toFixed(1)}%)`}</title>
                        </circle>
                    ))}
                </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{activeSlice?.label}</span>
                    <span className="text-xl font-bold" style={{ color: activeSlice?.color }}>
                        {formatCurrency(activeSlice?.value || 0)}
                    </span>
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Leyenda del gráfico">
                {data.map(item => (
                    <div 
                        key={item.label} 
                        className="flex items-center text-sm cursor-pointer"
                        onMouseEnter={() => setHoveredSlice(item.label)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        style={{ opacity: hoveredSlice === null || hoveredSlice === item.label ? 1 : 0.6 }}
                    >
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
