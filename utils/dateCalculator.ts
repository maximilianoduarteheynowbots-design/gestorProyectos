
export const calculateProjectedEndDate = (
    pendingHours: number, 
    weeklyLoad: number
): { endDate: Date | null, workDays: number } => {
    
    if (weeklyLoad <= 0 || pendingHours <= 0) {
        return { endDate: null, workDays: 0 };
    }

    const dailyLoad = weeklyLoad / 5;
    if (dailyLoad <= 0) {
        return { endDate: null, workDays: 0 };
    }

    const requiredWorkDays = Math.ceil(pendingHours / dailyLoad);
    
    let currentDate = new Date();
    let workDaysCounter = 0;

    while (workDaysCounter < requiredWorkDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDaysCounter++;
        }
    }

    return { endDate: currentDate, workDays: requiredWorkDays };
};


export const getWeekDateRange = (weekIndex: number): { startDate: Date, endDate: Date } => {
    const today = new Date();
    const currentDay = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setHours(0, 0, 0, 0);
    mondayOfCurrentWeek.setDate(today.getDate() + daysToMonday);

    const mondayOfTargetWeek = new Date(mondayOfCurrentWeek);
    mondayOfTargetWeek.setDate(mondayOfCurrentWeek.getDate() + weekIndex * 7);
    
    const fridayOfTargetWeek = new Date(mondayOfTargetWeek);
    fridayOfTargetWeek.setDate(mondayOfTargetWeek.getDate() + 4);

    return { startDate: mondayOfTargetWeek, endDate: fridayOfTargetWeek };
};
