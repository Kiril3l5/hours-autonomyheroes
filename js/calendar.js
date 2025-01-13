// calendar.js
class TimeTrackingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.timeEntries = {};
        this.submittedWeeks = {};
        
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
        const weekDates = getWeekDates(new Date());
        const weekNumber = getWeekNumber(new Date());
        let totalHours = 0;
        
        let summaryHtml = '<div class="week-details">';
        
        weekDates.forEach(date => {
            const entry = this.timeEntries[date.toISOString()];
            const dayHours = entry && !entry.isTimeOff ? entry.hours : 0;
            totalHours += dayHours;
            
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
        
        summaryHtml += '</div>';
        
        // Add total hours and status
        summaryHtml = `
            <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 16px;">
                Total Hours: ${totalHours}h
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
        
        // Update the summary element
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
