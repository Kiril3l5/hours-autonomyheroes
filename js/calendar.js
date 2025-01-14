// calendar.js
class TimeTrackingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.timeEntries = {};
        this.submittedWeeks = {};
        this.userId = firebase.auth().currentUser.uid; // Get current user's ID
        
        // Initialize elements
        this.calendarEl = document.getElementById('calendar');
        this.summaryEl = document.getElementById('weekSummary');
        
        // Create modal with callback to handle updates
        this.modal = new TimeEntryModal((date, entry) => this.handleTimeEntry(date, entry));

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

// Add this new method to handle time entries
handleTimeEntry(date, entry) {
    const dateKey = date.toISOString();
    console.log('Handling time entry for:', dateKey, entry);

    if (entry === null) {
        delete this.timeEntries[dateKey];
    } else {
        this.timeEntries[dateKey] = entry;
    }
    
    // Save to local storage
    localStorage.setItem('timeEntries', JSON.stringify(this.timeEntries));
    
    console.log('Current time entries:', this.timeEntries);
    
    // Force both calendar and summary updates
    this.render();
    this.updateWeekSummary();
}

    loadSavedData() {
        // Use user-specific keys for localStorage
        const savedEntries = localStorage.getItem(`timeEntries_${this.userId}`);
        const savedSubmissions = localStorage.getItem(`submittedWeeks_${this.userId}`);
        
        if (savedEntries) {
            this.timeEntries = JSON.parse(savedEntries);
        }
        
        if (savedSubmissions) {
            this.submittedWeeks = JSON.parse(savedSubmissions);
        }
    }

    handleTimeEntry(date, entry) {
        const dateKey = date.toISOString();

        if (entry === null) {
            delete this.timeEntries[dateKey];
        } else {
            this.timeEntries[dateKey] = entry;
        }
        
        // Save to user-specific storage
        localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(this.timeEntries));
        
        // Update display
        this.render();
        this.updateWeekSummary();
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
                this.submittedWeeks[weekNumber] = true;
                // Save to user-specific storage
                localStorage.setItem(`submittedWeeks_${this.userId}`, JSON.stringify(this.submittedWeeks));
                alert('Week submitted successfully!');
                this.render();
            } catch (error) {
                alert('Error submitting week: ' + error.message);
            }
        }
    }
}

    updateWeekSummary() {
    const today = new Date();
    this.currentWeekDates = getWeekDates(today);
    const weekNumber = getWeekNumber(today);
    
    console.log('Updating summary for week:', weekNumber);
    console.log('Current week dates:', this.currentWeekDates);
    console.log('Current entries:', this.timeEntries);

    let totalHours = 0;
    let summaryHtml = '<div class="week-details">';

    this.currentWeekDates.forEach(date => {
        const dateKey = date.toISOString();
        const entry = this.timeEntries[dateKey];
        
        // Calculate hours for this day
        if (entry && !entry.isTimeOff) {
            totalHours += Number(entry.hours) || 0;
            console.log(`Added ${entry.hours} hours for ${date.toDateString()}`);
        }

        const isToday = date.toDateString() === today.toDateString();
        const dayStyle = isToday ? 'color: #ff8d00; font-weight: bold;' : '';
        
        let statusHtml = 'No Entry';
        let statusStyle = 'color: #6C7A89;';
        
        if (entry) {
            if (entry.isTimeOff) {
                statusHtml = entry.managerApproved ? 'Time Off (✓)' : 'Time Off';
                statusStyle = 'color: #dc2626;';
            } else {
                statusHtml = `${entry.hours}h`;
                if (entry.hours > 8) {
                    statusStyle = 'color: #ff8d00;';
                    if (entry.overtimeApproved) statusHtml += ' (OT ✓)';
                } else if (entry.hours < 8) {
                    statusStyle = 'color: #2563eb;';
                    if (entry.shortDayApproved) statusHtml += ' (✓)';
                } else {
                    statusStyle = 'color: #059669;';
                }
            }
        }

        summaryHtml += `
            <div style="display: flex; justify-content: space-between; margin: 8px 0; ${dayStyle}">
                <span>${date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span style="${statusStyle}">${statusHtml}</span>
            </div>
        `;
    });

    // Display total and remaining hours
    summaryHtml = `
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 16px; text-align: center;">
            Week ${weekNumber} Total: ${totalHours}h
        </div>
        ${summaryHtml}
    `;

    if (!this.submittedWeeks[weekNumber]) {
        if (totalHours < 40) {
            summaryHtml += `
                <div style="text-align: center; color: #dc2626; margin-top: 16px;">
                    ${40 - totalHours}h remaining to reach 40h week
                </div>
            `;
        }
    }

    console.log('Total hours calculated:', totalHours);
    
    // Update the summary element and submit button
    if (this.summaryEl) {
        this.summaryEl.innerHTML = summaryHtml;
    }

    const submitBtn = document.getElementById('submitWeek');
    if (submitBtn) {
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
