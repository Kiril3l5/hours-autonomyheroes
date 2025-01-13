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

function getWeekDates(date) {
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        dates.push(day);
    }
    return dates;
}

function calculateWeekTotal(entries, weekDates) {
    return weekDates.reduce((total, date) => {
        const entry = entries[date.toISOString()];
        return total + (entry && !entry.isTimeOff ? (entry.hours || 0) : 0);
    }, 0);
}