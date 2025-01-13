// calendar.js
class TimeTrackingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.timeEntries = {};
        this.submittedWeeks = {};
        this.modal = new TimeEntryModal((date, entry) => this.saveEntry(date, entry));

        // Initialize Firebase references
        this.db = firebase.firestore();
        this.auth = firebase.auth();

        // Bind UI elements
        this.calendarEl = document.getElementById('calendar');
        this.summaryEl = document.getElementById('weekSummary');
        
        // Add event listeners
        document.getElementById('prevMonth').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());
        document.getElementById('submitWeek').addEventListener('click', () => this.submitWeek());

        // Initial render
        this.render();
        this.loadUserData();
    }

    async loadUserData() {
        // Here you would load user's entries from Firebase
        // For now, using local storage
        const savedEntries = localStorage.getItem('timeEntries');
        const savedSubmissions = localStorage.getItem('submittedWeeks');
        
        if (savedEntries) this.timeEntries = JSON.parse(savedEntries);
        if (savedSubmissions) this.submittedWeeks = JSON.parse(savedSubmissions);
        
        this.render();
    }

    saveEntry(date, entry) {
        if (entry === null) {
            delete this.timeEntries[date.toISOString()];
        } else {
            this.timeEntries[date.toISOString()] = entry;
        }

        // Save to local storage
        localStorage.setItem('timeEntries', JSON.stringify(this.timeEntries));
        
        // Force update both calendar and summary
        this.render();
        this.updateWeekSummary();
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

        // Add days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isCurrentWeek = checkIfCurrentWeek(date);
            const isPastWeek = checkIfPastWeek(date);
            const weekNumber = getWeekNumber(date);
            
            const dayEl = document.createElement('div');
            dayEl.className = `day ${isCurrentWeek ? 'current-week' : ''} ${isPastWeek ? 'past-week' : ''}`;
            
            const dayContent = document.createElement('div');
            dayContent.className = 'day-content';
            
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
                dayContent.appendChild(entryDisplay);
            }

            dayEl.appendChild(dayContent);

            // Add click handler for current week
            if (isCurrentWeek && !isPastWeek && !this.submittedWeeks[weekNumber]) {
                dayEl.onclick = () => this.modal.open(date, entry);
            }

            this.calendarEl.appendChild(dayEl);
        }

        this.updateWeekSummary();
    }

    updateWeekSummary() {
        const weekDates = getWeekDates(new Date());
        const weekNumber = getWeekNumber(new Date());
        const totalHours = calculateWeekTotal(this.timeEntries, weekDates);
        
        let summaryHtml = `
            <div class="week-total font-bold text-lg mb-4">
                Week ${weekNumber} Total: ${totalHours}h
            </div>
            <div class="week-details grid gap-2">
        `;
        
        weekDates.forEach(date => {
            const entry = this.timeEntries[date.toISOString()];
            const isToday = date.toDateString() === new Date().toDateString();
            const dayClass = isToday ? 'font-bold text-[#ff8d00]' : '';
            
            let entryText = 'No Entry';
            let statusClass = 'text-gray-500';
            
            if (entry) {
                if (entry.isTimeOff) {
                    entryText = entry.managerApproved ? 'Time Off (Approved)' : 'Time Off';
                    statusClass = 'text-red-600';
                } else {
                    entryText = `${entry.hours}h`;
                    statusClass = entry.hours > 8 ? 'text-orange-600' : 'text-green-600';
                }
            }

            summaryHtml += `
                <div class="day-summary flex justify-between ${dayClass}">
                    <span>${date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    <span class="${statusClass}">${entryText}</span>
                </div>
            `;
        });

        summaryHtml += '</div>';

        // Add warning if week is incomplete
        if (this.submittedWeeks[weekNumber]) {
            summaryHtml += `
                <div class="mt-4 text-center text-gray-500">
                    Week has been submitted and locked
                </div>
            `;
        } else if (totalHours < 40) {
            summaryHtml += `
                <div class="mt-4 text-center text-orange-600">
                    Week is incomplete (${40 - totalHours}h remaining to reach 40h)
                </div>
            `;
        }

        this.summaryEl.innerHTML = summaryHtml;
        
        // Update submit button state
        const submitBtn = document.getElementById('submitWeek');
        if (this.submittedWeeks[weekNumber]) {
            submitBtn.disabled = true;
            submitBtn.className = 'btn opacity-50 cursor-not-allowed';
            submitBtn.textContent = 'Week Submitted';
        } else {
            submitBtn.disabled = false;
            submitBtn.className = 'btn';
            submitBtn.textContent = totalHours >= 40 ? 
                'Submit Week for Approval' : 
                'Complete 40h Before Submitting';
        }
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
