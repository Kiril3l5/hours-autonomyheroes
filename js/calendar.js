// calendar.js
class TimeTrackingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.timeEntries = {};
        this.submittedWeeks = {};
		this.currentWeekDates = getWeekDates(new Date());
        
        // Initialize elements
        this.calendarEl = document.getElementById('calendar');
        this.summaryEl = document.getElementById('weekSummary');
        
        // Create modal with callback to handle updates
        this.modal = new TimeEntryModal((date, entry) => {
            if (entry === null) {
                delete this.timeEntries[date.toISOString()];
            } else {
                this.timeEntries[date.toISOString()] = entry;
            }
            
            // Save to local storage
            localStorage.setItem('timeEntries', JSON.stringify(this.timeEntries));
            
            // Update both calendar and summary immediately
            this.render();
            this.updateWeekSummary();
        });

        // Add event listeners
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });
        
        document.getElementById('submitWeek').addEventListener('click', () => this.submitWeek());

        // Load saved data
        this.loadSavedData();
        
        // Initial render
        this.render();
        this.updateWeekSummary();
    }

    loadSavedData() {
        const savedEntries = localStorage.getItem('timeEntries');
        const savedSubmissions = localStorage.getItem('submittedWeeks');
        
        if (savedEntries) {
            this.timeEntries = JSON.parse(savedEntries);
        }
        
        if (savedSubmissions) {
            this.submittedWeeks = JSON.parse(savedSubmissions);
        }
    }

    updateWeekSummary() {
    // Get current week dates and number
    this.currentWeekDates = getWeekDates(new Date());
    const weekNumber = getWeekNumber(new Date());
    
    // Calculate total hours directly from entries
    let totalHours = this.currentWeekDates.reduce((total, date) => {
        const dateKey = date.toISOString();
        const entry = this.timeEntries[dateKey];
        const hours = entry && !entry.isTimeOff ? Number(entry.hours) || 0 : 0;
        console.log(`Date: ${date.toDateString()}, Hours: ${hours}`); // Debug log
        return total + hours;
    }, 0);

    console.log('Total hours calculated:', totalHours); // Debug log
    
    let summaryHtml = '<div class="week-details">';
    
    this.currentWeekDates.forEach(date => {
        const dateKey = date.toISOString();
        const entry = this.timeEntries[dateKey];
        
        const isToday = date.toDateString() === new Date().toDateString();
        const dayStyle = isToday ? 'color: #ff8d00; font-weight: bold;' : '';
        
        let statusHtml = 'No Entry';
        let statusStyle = 'color: #6C7A89;';
        
        if (entry) {
            if (entry.isTimeOff) {
                statusHtml = entry.managerApproved ? 'Time Off (✓)' : 'Time Off';
                statusStyle = 'color: #dc2626;';
            } else {
                statusHtml = `${entry.hours}h`;
                statusStyle = entry.hours > 8 ? 'color: #ff8d00;' : 'color: #059669;';
            }
        }
        
        summaryHtml += `
            <div style="display: flex; justify-content: space-between; margin: 8px 0; ${dayStyle}">
                <span>${date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span style="${statusStyle}">${statusHtml}</span>
            </div>
        `;
    });
    
    // Add total hours and status
    summaryHtml = `
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 16px; text-align: center;">
            Week ${weekNumber} Total: ${totalHours}h
        </div>
        ${summaryHtml}
    `;
    
    // Add warning if needed
    if (totalHours < 40 && !this.submittedWeeks[weekNumber]) {
        summaryHtml += `
            <div style="text-align: center; color: #dc2626; margin-top: 16px;">
                ${40 - totalHours}h remaining to reach 40h week
            </div>
        `;
    }
    
    this.summaryEl.innerHTML = summaryHtml;

    // Update submit button
    const submitBtn = document.getElementById('submitWeek');
    if (this.submittedWeeks[weekNumber]) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.textContent = 'Week Submitted';
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = totalHours >= 40 ? 'Submit Week for Approval' : 'Complete 40h Before Submitting';
    }
}
	
	render() {
        // Update month display
        document.getElementById('currentMonth').textContent = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        // Clear calendar except headers
        while (this.calendarEl.children.length > 7) {
            this.calendarEl.removeChild(this.calendarEl.lastChild);
        }

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = getFirstDayOfMonth(year, month);
        const daysInMonth = getDaysInMonth(year, month);
        
        // Adjust for Monday start (0 = Sunday, so we want 1 = Monday)
        let startDay = firstDay === 0 ? 6 : firstDay - 1;

        // Add empty cells for days before start of month
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day empty';
            this.calendarEl.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEl = document.createElement('div');
            const isCurrentWeek = checkIfCurrentWeek(date);
            const isPastWeek = checkIfPastWeek(date);
            const weekNumber = getWeekNumber(date);
            
            dayEl.className = `day ${isCurrentWeek ? 'current-week' : ''} ${isPastWeek ? 'past-week' : ''}`;
            
            // Add day number
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayEl.appendChild(dayNumber);

            // Add entry info if exists
            const entry = this.timeEntries[date.toISOString()];
            if (entry) {
                const entryDisplay = document.createElement('div');
                if (entry.isTimeOff) {
                    entryDisplay.className = 'hours-display time-off';
                    entryDisplay.innerHTML = `Time Off${entry.managerApproved ? '<div class="approval-check">✓ Approved</div>' : ''}`;
                } else {
                    entryDisplay.className = `hours-display ${entry.hours > 8 ? 'hours-overtime' : 'hours-regular'}`;
                    entryDisplay.innerHTML = `${entry.hours}h${entry.hours > 8 && entry.overtimeApproved ? '<div class="approval-check">✓ OT Approved</div>' : ''}`;
                }
                dayEl.appendChild(entryDisplay);
            }

            // Add click handler for current week
            if (isCurrentWeek && !isPastWeek && !this.submittedWeeks[weekNumber]) {
                dayEl.onclick = () => this.modal.open(date, entry);
            }

            this.calendarEl.appendChild(dayEl);
        }

        // Update week summary
        this.updateWeekSummary();
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    async submitWeek() {
        const weekNumber = getWeekNumber(new Date());
        
        if (this.submittedWeeks[weekNumber]) {
            alert('This week has already been submitted');
            return;
        }

        const confirmed = confirm(
            'Are you sure you want to submit this week? ' +
            'You won\'t be able to make changes after submission.'
        );

        if (confirmed) {
            try {
                // Here you would sync with Firebase
                this.submittedWeeks[weekNumber] = true;
                localStorage.setItem('submittedWeeks', JSON.stringify(this.submittedWeeks));
                alert('Week submitted successfully!');
                this.render();
            } catch (error) {
                alert('Error submitting week: ' + error.message);
            }
        }
    }
}

// Initialize the calendar when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TimeTrackingCalendar();
});
