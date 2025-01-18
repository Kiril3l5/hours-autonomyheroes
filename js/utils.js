// utils.js

/**
 * Date utility namespace to avoid global scope pollution
 */
const DateUtils = {
    /**
     * Gets the number of days in a given month
     * @param {number} year - Full year (e.g., 2024)
     * @param {number} month - Month index (0-11)
     * @returns {number} Number of days in the month
     */
    getDaysInMonth(year, month) {
        this.validateDateParams(year, month);
        return new Date(Date.UTC(year, month + 1, 0)).getDate();
    },

    /**
     * Gets the day of week for the first day of a month
     * @param {number} year - Full year
     * @param {number} month - Month index (0-11)
     * @returns {number} Day of week (0-6, 0 = Sunday)
     */
    getFirstDayOfMonth(year, month) {
        this.validateDateParams(year, month);
        return new Date(Date.UTC(year, month, 1)).getDay();
    },

    /**
     * Validates year and month parameters
     * @param {number} year - Full year
     * @param {number} month - Month index
     * @throws {Error} If parameters are invalid
     */
    validateDateParams(year, month) {
        if (!Number.isInteger(year) || year < 1900 || year > 2100) {
            throw new Error('Invalid year parameter');
        }
        if (!Number.isInteger(month) || month < 0 || month > 11) {
            throw new Error('Invalid month parameter');
        }
    },

    /**
     * Normalizes a date to UTC midnight
     * @param {Date} date - Date to normalize
     * @returns {Date} Normalized date
     */
    normalizeDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }
        return new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0, 0, 0, 0
        ));
    },

    /**
     * Checks if a date falls within the current week
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is in current week
     */
    checkIfCurrentWeek(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }

        const now = new Date();
        const normalizedNow = this.normalizeDate(now);
        const normalizedDate = this.normalizeDate(date);
        
        const weekStart = this.getWeekStart(normalizedNow);
        const weekEnd = this.getWeekEnd(weekStart);

        return normalizedDate >= weekStart && normalizedDate <= weekEnd;
    },

    /**
     * Gets the start of the week (Monday) for a given date
     * @param {Date} date - Reference date
     * @returns {Date} Start of week
     */
    getWeekStart(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }

        const normalized = this.normalizeDate(date);
        const day = normalized.getUTCDay();
        const diff = normalized.getUTCDate() - day + (day === 0 ? -6 : 1);
        
        const weekStart = new Date(normalized);
        weekStart.setUTCDate(diff);
        return weekStart;
    },

    /**
     * Gets the end of the week (Sunday) for a given date
     * @param {Date} weekStart - Start of week
     * @returns {Date} End of week
     */
    getWeekEnd(weekStart) {
        if (!(weekStart instanceof Date) || isNaN(weekStart)) {
            throw new Error('Invalid weekStart parameter');
        }

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        return weekEnd;
    },

    /**
     * Checks if a date is in a past week
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is in a past week
     */
    checkIfPastWeek(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }

        const now = new Date();
        const currentWeekStart = this.getWeekStart(now);
        const normalizedDate = this.normalizeDate(date);
        
        return normalizedDate < currentWeekStart;
    },

    /**
     * Gets the ISO week number for a date
     * @param {Date} date - Date to get week number for
     * @returns {number} Week number (1-53)
     */
    getWeekNumber(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }

        const normalized = this.normalizeDate(date);
        normalized.setUTCDate(normalized.getUTCDate() + 4 - (normalized.getUTCDay() || 7));
        
        const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((normalized - yearStart) / 86400000) + 1) / 7);

        // Handle edge cases for week 53
        if (weekNo === 53) {
            // Check if December 31st is actually in week 1 of next year
            const dec31 = new Date(Date.UTC(normalized.getUTCFullYear(), 11, 31));
            if (this.getWeekNumber(dec31) === 1) {
                return 1;
            }
        }

        return weekNo;
    },

    /**
     * Gets array of dates for a week
     * @param {Date} date - Any date in the desired week
     * @returns {Date[]} Array of dates for the week
     */
    getWeekDates(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }

        const weekStart = this.getWeekStart(date);
        const weekDates = [];

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setUTCDate(weekStart.getUTCDate() + i);
            weekDates.push(this.normalizeDate(currentDate));
        }

        return weekDates;
    }
};

/**
 * String utility namespace
 */
const StringUtils = {
    /**
     * Formats a date in a user-friendly format
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Invalid date parameter');
        }

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Formats time duration in a user-friendly way
     * @param {number} hours - Number of hours
     * @returns {string} Formatted duration string
     */
    formatDuration(hours) {
        if (typeof hours !== 'number' || isNaN(hours)) {
            throw new Error('Invalid hours parameter');
        }

        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);

        if (minutes === 0) {
            return `${wholeHours}h`;
        }
        return `${wholeHours}h ${minutes}m`;
    },

    /**
     * Formats a week identifier
     * @param {number} year - Full year
     * @param {number} weekNumber - Week number (1-53)
     * @returns {string} Formatted week identifier
     */
    formatWeekId(year, weekNumber) {
        if (!Number.isInteger(year) || year < 1900 || year > 2100) {
            throw new Error('Invalid year parameter');
        }
        if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
            throw new Error('Invalid week number parameter');
        }

        return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }
};

/**
 * DOM utility namespace
 */
const DOMUtils = {
    /**
     * Creates an element with classes and attributes
     * @param {string} tag - HTML tag name
     * @param {Object} options - Element options
     * @returns {HTMLElement} Created element
     */
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.text) {
            element.textContent = options.text;
        }
        
        if (options.html) {
            element.innerHTML = options.html;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        return element;
    },

    /**
     * Safely removes all child elements
     * @param {HTMLElement} element - Parent element
     */
    removeAllChildren(element) {
        if (!(element instanceof HTMLElement)) {
            throw new Error('Invalid element parameter');
        }
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
};

// Export utilities
window.DateUtils = DateUtils;
window.StringUtils = StringUtils;
window.DOMUtils = DOMUtils;

// Backwards compatibility for existing code
const compatibilityLayer = {
    getDaysInMonth: DateUtils.getDaysInMonth.bind(DateUtils),
    getFirstDayOfMonth: DateUtils.getFirstDayOfMonth.bind(DateUtils),
    checkIfCurrentWeek: DateUtils.checkIfCurrentWeek.bind(DateUtils),
    checkIfPastWeek: DateUtils.checkIfPastWeek.bind(DateUtils),
    getWeekNumber: DateUtils.getWeekNumber.bind(DateUtils),
    getWeekDates: DateUtils.getWeekDates.bind(DateUtils),
    normalizeDate: DateUtils.normalizeDate.bind(DateUtils),
    formatDate: StringUtils.formatDate.bind(StringUtils)
};

// Export compatibility layer
Object.entries(compatibilityLayer).forEach(([key, value]) => {
    window[key] = value;
});