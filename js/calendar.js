// calendar.js
class TimeTrackingCalendar {
    constructor() {
        if (!firebase.auth().currentUser) {
            console.error('No user logged in');
            return;
        }

        this.currentDate = new Date();
        this.timeEntries = {};
        this.submittedWeeks = {};
        this.userId = firebase.auth().currentUser.uid;
        
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

    loadSavedData() {
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
    console.log('Saving entry for date:', date.toLocaleDateString(), 'Entry:', entry);

    if (entry === null) {
        delete this.timeEntries[dateKey];
        console.log('Entry deleted');
    } else {
        this.timeEntries[dateKey] = {
            ...entry,
            dateKey, // Store the date key with the entry
            timestamp: new Date().toISOString()
        };
        console.log('Entry saved:', this.timeEntries[dateKey]);
    }
    
    // Save to user-specific storage
    localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(this.timeEntries));
    
    // Update displays
    this.render();
    this.updateWeekSummary();
}

    updateWeekSummary() {
    // Get current week dates and calculate week number
    const today = new Date();
    const weekDates = getWeekDates(today);
    const weekNumber = getWeekNumber(today);
    
    console.log('Updating summary for week:', weekNumber);

    // Calculate total hours and build summary
    let totalHours = 0;
    let summaryHtml = '<div class="week-details">';

    weekDates.forEach(date => {
        // Get the ISO string for the date at midnight
        const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        const entry = this.timeEntries[dateKey];
        
        console.log('Checking date:', date.toLocaleDateString(), 'Entry:', entry);

        // Calculate hours for this day
        if (entry && !entry.isTimeOff) {
            const dayHours = Number(entry.hours) || 0;
            totalHours += dayHours;
            console.log('Adding hours:', dayHours, 'Total:', totalHours);
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

    // Add week total and status
    summaryHtml = `
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 16px; text-align: center;">
            Week ${weekNumber} Total: ${totalHours}h
        </div>
        ${summaryHtml}
    `;

    // Add remaining hours warning or completion status
    if (!this.submittedWeeks[weekNumber]) {
        if (totalHours < 40) {
            summaryHtml += `
                <div style="text-align: center; color: #dc2626; margin-top: 16px;">
                    ${40 - totalHours}h remaining to reach 40h week
                </div>
            `;
        } else if (totalHours > 40) {
            summaryHtml += `
                <div style="text-align: center; color: #ff8d00; margin-top: 16px;">
                    ${totalHours - 40}h overtime this week
                </div>
            `;
        }
    }

    // Update the summary element
    this.summaryEl.innerHTML = summaryHtml;

    // Update submit button state
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
        
        // Adjust for Monday start
        let startDay = firstDay === 0 ? 6 : firstDay - 1;

        // Add empty cells
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
                localStorage.setItem(`submittedWeeks_${this.userId}`, JSON.stringify(this.submittedWeeks));
                alert('Week submitted successfully!');
                this.render();
            } catch (error) {
                alert('Error submitting week: ' + error.message);
            }
        }
    }
}
