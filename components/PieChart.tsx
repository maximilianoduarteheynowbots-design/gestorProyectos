
import React, { useState } from 'react';

export interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
}

const getCoordinatesForPercent = (percent: number, size: number, radius: number) => {
    const x = size / 2 + radius * Math.cos(2 * Math.PI * percent);
    const y = size / 2 + radius * Math.sin(2 * Math.PI * percent);
    return [x, y];
};

export const PieChart: React.FC<PieChartProps> = ({ data, size = 250 }) => {
    const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return null;
    
    const radius = size / 2.5;
    let cumulativePercent = 0;

    const slices = data.map(slice => {
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent, size, radius);
        const percent = slice.value / total;
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent, size, radius);
        const largeArcFlag = percent > 0.5 ? 1 : 0;

        const pathData = [
            `M ${size / 2} ${size / 2}`, // Move to center
            `L ${startX} ${startY}`,    // Line to start of arc
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
            'Z' // Close path
        ].join(' ');

        return { pathData, color: slice.color, label: slice.label, value: slice.value };
    });

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico de torta de distribución de estados">
                <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.2" />
                    </filter>
                </defs>
                <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                    {slices.map((slice, index) => (
                        <path 
                            key={index} 
                            d={slice.pathData} 
                            fill={slice.color}
                            onMouseEnter={() => setHoveredSlice(slice.label)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            style={{
                                transition: 'transform 0.2s ease-out',
                                transform: hoveredSlice === slice.label ? 'scale(1.05)' : 'scale(1)',
                                filter: hoveredSlice === slice.label ? 'url(#shadow)' : 'none',
                                transformOrigin: `${size / 2}px ${size / 2}px`,
                            }}
                        >
                           <title>{`${slice.label}: ${slice.value} (${((slice.value/total) * 100).toFixed(1)}%)`}</title>
                        </path>
                    ))}
                </g>
            </svg>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Leyenda del gráfico">
                {data.map(item => (
                    <div 
                        key={item.label} 
                        className="flex items-center text-sm transition-opacity"
                        style={{ opacity: hoveredSlice === null || hoveredSlice === item.label ? 1 : 0.5 }}
                    >
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span>{item.label} ({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};