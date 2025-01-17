// calendar.js
(function() {
    console.log('Calendar module loading...');
    
    // Check dependencies
    if (!window.firebase) {
        console.error('Firebase not loaded');
        return;
    }
    
    if (!window.TimeEntryModal) {
        console.error('TimeEntryModal not loaded');
        return;
    }

    class TimeTrackingCalendar {
        constructor() {
    console.log('TimeTrackingCalendar constructor called, checking dependencies...');
    
    // Check utils
    if (typeof formatDate !== 'function') {
        console.error('Utils not loaded (formatDate missing)');
        throw new Error('Utils must be loaded first');
    }

    // Check Modal
    if (typeof TimeEntryModal !== 'function') {
        console.error('TimeEntryModal not available');
        throw new Error('TimeEntryModal is required');
    }

    // Check user
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        console.error('No user logged in');
        throw new Error('User must be logged in to initialize calendar');
    }
    
    console.log('Dependencies verified, initializing calendar...');
    
    try {
        // Initialize properties
        this.currentDate = new Date();
        this.timeEntries = {};
        this.submittedWeeks = {};
        this.userId = currentUser.uid;
        
        // Initialize calendar
        this.initializeCalendar();
        console.log('TimeTrackingCalendar initialization complete');
    } catch (error) {
        console.error('Error initializing calendar:', error);
        throw error;
    }
}

        initializeCalendar() {
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
            this.loadSubmittedEntries();
            
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
            // Normalize the date to midnight UTC
            const normalizedDate = new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                0, 0, 0, 0
            ));
            const dateKey = normalizedDate.toISOString();
            console.log('Handling time entry for:', dateKey, entry);

            if (entry === null) {
                delete this.timeEntries[dateKey];
                console.log('Entry deleted');
            } else {
                this.timeEntries[dateKey] = {
                    ...entry,
                    dateKey,
                    timestamp: new Date().toISOString()
                };
                console.log('Entry saved:', this.timeEntries[dateKey]);
            }
            
            // Save to localStorage
            try {
                localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(this.timeEntries));
                console.log('Entries saved to localStorage');
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
            
            this.render();
            this.updateWeekSummary();
        }

        render() {
    // Update month/year display
    document.getElementById('currentMonth').textContent = this.currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    // Clear existing calendar days while keeping weekday headers
    while (this.calendarEl.children.length > 7) {
        this.calendarEl.removeChild(this.calendarEl.lastChild);
    }

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    
    // Calculate start day (Monday = 0, Sunday = 6)
    let startDay = firstDay === 0 ? 6 : firstDay - 1;

    // Add empty days before the first day of the month
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        this.calendarEl.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        // Create local date object
        const date = new Date(year, month, day);
        
        // Create normalized UTC date for consistent lookup
        const normalizedDate = new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0, 0, 0, 0
        ));
        const dateKey = normalizedDate.toISOString();
        
        // Create day element
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

        // Check for existing entry
        const entry = this.timeEntries[dateKey];
        if (entry) {
            const entryDisplay = document.createElement('div');
            
            // Show lock indicator if week is submitted
            if (this.submittedWeeks[weekNumber]) {
                const lockIndicator = document.createElement('div');
                lockIndicator.className = 'lock-indicator';
                lockIndicator.innerHTML = '🔒';
                lockIndicator.title = 'Week submitted - contact manager for changes';
                dayEl.appendChild(lockIndicator);
            }
            
            // Display time off or hours
            if (entry.isTimeOff) {
                entryDisplay.className = 'hours-display time-off';
                entryDisplay.innerHTML = `Time Off${entry.managerApproved ? '<div class="approval-check">✓ Approved</div>' : ''}`;
            } else {
                entryDisplay.className = `hours-display ${entry.hours > 8 ? 'hours-overtime' : 'hours-regular'}`;
                entryDisplay.innerHTML = `${entry.hours}h${entry.hours > 8 && entry.overtimeApproved ? '<div class="approval-check">✓ OT Approved</div>' : ''}`;
            }
            dayEl.appendChild(entryDisplay);
        }

        // Add click handler for current week's days that aren't submitted
        if (isCurrentWeek && !isPastWeek && !this.submittedWeeks[weekNumber]) {
            dayEl.onclick = () => this.modal.open(date, entry);
        }

        this.calendarEl.appendChild(dayEl);
    }
}

        updateWeekSummary() {
    const today = new Date();
    const weekDates = getWeekDates(today);
    const weekNumber = getWeekNumber(today);
    
    let totalHours = 0;
    let summaryHtml = '<div class="week-details">';

    weekDates.forEach(date => {
        // Normalize date to midnight UTC
        const normalizedDate = new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0, 0, 0, 0
        ));
        const dateKey = normalizedDate.toISOString();
        const entry = this.timeEntries[dateKey];

        // Calculate total hours
        if (entry && !entry.isTimeOff) {
            const dayHours = Number(entry.hours) || 0;
            totalHours += dayHours;
        }

        // Check if this is today
        const isToday = date.toDateString() === today.toDateString();
        const dayStyle = isToday ? 'color: #ff8d00; font-weight: bold;' : '';
        
        // Determine status display
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

        // Add day summary to HTML
        summaryHtml += `
            <div style="display: flex; justify-content: space-between; margin: 8px 0; ${dayStyle}">
                <span>${date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span style="${statusStyle}">${statusHtml}</span>
            </div>
        `;
    });

    // Add week total to summary
    summaryHtml = `
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 16px; text-align: center;">
            Week ${weekNumber} Total: ${totalHours}h
        </div>
        ${summaryHtml}
    `;

    // Add remaining hours or overtime message if week isn't submitted
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

    // Update summary in DOM
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

        async submitWeek() {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.error('No user logged in');
                alert('Please log in to submit hours');
                return;
            }

            const weekNumber = getWeekNumber(new Date());
            const year = new Date().getFullYear();
            const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
            const docId = `${currentUser.uid}_${weekId}`;
            
            try {
                const existingSubmission = await firebase.firestore()
                    .collection('timeEntries')
                    .doc(docId)
                    .get();

                if (existingSubmission.exists) {
                    alert('This week has already been submitted. Please contact your manager if changes are needed.');
                    return;
                }

                const weekDates = getWeekDates(new Date());
                const hoursArray = weekDates.map(date => {
                    const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
                    const entry = this.timeEntries[dateKey] || null;
                    
                    return {
                        date: date.toISOString(),
                        hours: entry?.hours || 0,
                        isTimeOff: entry?.isTimeOff || false,
                        managerApproved: entry?.managerApproved || false,
                        overtimeApproved: entry?.overtimeApproved || false,
                        shortDayApproved: entry?.shortDayApproved || false
                    };
                });

                const totalHours = hoursArray.reduce((sum, day) => 
                    sum + (day.isTimeOff ? 0 : day.hours), 0);

                if (totalHours < 40) {
                    if (!confirm(`You only have ${totalHours} hours this week. Are you sure you want to submit?`)) {
                        return;
                    }
                }

                const confirmed = confirm(
                    'Are you sure you want to submit this week? ' +
                    'You won\'t be able to make changes after submission. ' +
                    'Contact your manager if changes are needed after submission.'
                );

                if (confirmed) {
                    const timeEntry = {
                        workerId: currentUser.uid,
                        week: weekId,
                        hours: hoursArray,
                        totalHours: totalHours,
                        status: 'pending_approval',
                        approvedBy: null,
                        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    await firebase.firestore().collection('timeEntries').doc(docId).set(timeEntry);

                    this.submittedWeeks[weekNumber] = true;
                    localStorage.setItem(`submittedWeeks_${this.userId}`, JSON.stringify(this.submittedWeeks));
                    
                    alert('Week submitted successfully! Your manager will review the submission.');
                    this.render();
                }
            } catch (error) {
                console.error('Error submitting week:', error);
                if (error.code === 'permission-denied') {
                    alert('Permission denied. Please make sure you are logged in properly.');
                } else {
                    alert('Error submitting week: ' + error.message);
                }
            }
        }

        async verifyAuth() {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('No user logged in');
            }
            return currentUser;
        }

        async loadSubmittedEntries() {
            try {
                const user = await this.verifyAuth();
                const snapshot = await firebase.firestore()
                    .collection('timeEntries')
                    .where('workerId', '==', user.uid)
                    .get();

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const weekNumber = parseInt(data.week.split('-W')[1]);
                    this.submittedWeeks[weekNumber] = true;
                    
                    data.hours.forEach(hourEntry => {
                        const dateKey = new Date(hourEntry.date).toISOString();
                        if (hourEntry.hours > 0 || hourEntry.isTimeOff) {
                            this.timeEntries[dateKey] = hourEntry;
                        }
                    });
                });

                localStorage.setItem(`submittedWeeks_${this.userId}`, JSON.stringify(this.submittedWeeks));
                localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(this.timeEntries));
                
                this.render();
            } catch (error) {
                console.error('Error loading submitted entries:', error);
            }
        }
    }

    // Make it globally available
    window.TimeTrackingCalendar = TimeTrackingCalendar;
    if (window.appState) {
        window.appState.calendarLoaded = true;
    }
    console.log('TimeTrackingCalendar loaded and registered');
})();