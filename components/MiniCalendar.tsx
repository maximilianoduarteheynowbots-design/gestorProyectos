
import React from 'react';

interface MiniCalendarProps {
    highlightDate: Date;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ highlightDate }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = highlightDate.getFullYear();
    const month = highlightDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
    const daysInMonth = lastDayOfMonth.getDate();
    
    const calendarDays = [];

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="p-1"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        
        let dayClasses = "w-8 h-8 flex items-center justify-center rounded-full text-sm";
        
        const isToday = currentDate.getTime() === today.getTime();
        const isHighlight = currentDate.getDate() === highlightDate.getDate() && currentDate.getMonth() === highlightDate.getMonth() && currentDate.getFullYear() === highlightDate.getFullYear();
        
        if (isHighlight) {
            dayClasses += " bg-green-500 text-white font-bold ring-2 ring-green-300";
        } else if (isToday) {
            dayClasses += " bg-brand-primary text-white";
        }

        calendarDays.push(
            <div key={day} className={dayClasses}>
                {day}
            </div>
        );
    }

    const monthName = highlightDate.toLocaleString('es-ES', { month: 'long' });

    return (
        <div className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold capitalize">{monthName} {year}</h4>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400">
                <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
                {calendarDays}
            </div>
             <div className="flex items-center space-x-4 mt-4 text-xs">
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-brand-primary mr-2"></span>
                    <span>Hoy</span>
                </div>
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    <span>Proyectado</span>
                </div>
            </div>
        </div>
    );
};
