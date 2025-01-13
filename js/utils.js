// utils.js
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function checkIfCurrentWeek(date) {
    const now = new Date();
    const mondayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    const sundayOfWeek = new Date(now.setDate(mondayOfWeek.getDate() + 6));
    return date >= mondayOfWeek && date <= sundayOfWeek;
}

function checkIfPastWeek(date) {
    const now = new Date();
    const mondayOfCurrentWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    return date < mondayOfCurrentWeek;
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function calculateWeekTotal(timeEntries, weekDates) {
    return weekDates.reduce((total, date) => {
        const entry = timeEntries[date.toISOString()];
        // Only add hours if there's an entry, it's not time off, and hours is a valid number
        return total + (entry && !entry.isTimeOff ? Number(entry.hours) || 0 : 0);
    }, 0);
}

function getWeekDates(date) {
    const mondayOfWeek = new Date(date);
    // Adjust to Monday (1) from Sunday (0)
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    mondayOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(mondayOfWeek);
        currentDate.setDate(mondayOfWeek.getDate() + i);
        weekDates.push(currentDate);
    }
    return weekDates;
}