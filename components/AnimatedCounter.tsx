import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    formatter?: (value: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 1500, formatter }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        const animationFrame = (timestamp: number) => {
            if (startTime === undefined) {
                startTime = timestamp;
            }
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const newCount = Math.floor(progress * value);
            
            setCount(newCount);

            if (elapsed < duration) {
                requestAnimationFrame(animationFrame);
            } else {
                setCount(value); // Ensure it ends on the exact value
            }
        };

        const frameId = requestAnimationFrame(animationFrame);

        return () => cancelAnimationFrame(frameId);
    }, [value, duration]);

    const displayedValue = formatter ? formatter(count) : count.toLocaleString();

    return <>{displayedValue}</>;
};
