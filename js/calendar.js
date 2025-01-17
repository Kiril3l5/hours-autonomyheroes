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
        // ... rest of the class code ...
    }

    // Register globally
    window.TimeTrackingCalendar = TimeTrackingCalendar;
    window.appState.calendarLoaded = true;
    console.log('TimeTrackingCalendar loaded and registered');
})();
    class TimeTrackingCalendar {
        constructor() {
            console.log('TimeTrackingCalendar constructor called');
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.error('No user logged in');
                return;
            }
            
            // Initialize properties
            this.currentDate = new Date();
            this.timeEntries = {};
            this.submittedWeeks = {};
            this.userId = currentUser.uid;
            
            // Initialize calendar
            this.initializeCalendar();
            console.log('TimeTrackingCalendar initialization complete');
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
            const normalizedDate = new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
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
            
            localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(this.timeEntries));
            
            this.render();
            this.updateWeekSummary();
        }

        render() {
            document.getElementById('currentMonth').textContent = this.currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });

            while (this.calendarEl.children.length > 7) {
                this.calendarEl.removeChild(this.calendarEl.lastChild);
            }

            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const firstDay = getFirstDayOfMonth(year, month);
            const daysInMonth = getDaysInMonth(year, month);
            
            let startDay = firstDay === 0 ? 6 : firstDay - 1;

            for (let i = 0; i < startDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'day empty';
                this.calendarEl.appendChild(emptyDay);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayEl = document.createElement('div');
                const isCurrentWeek = checkIfCurrentWeek(date);
                const isPastWeek = checkIfPastWeek(date);
                const weekNumber = getWeekNumber(date);
                
                dayEl.className = `day ${isCurrentWeek ? 'current-week' : ''} ${isPastWeek ? 'past-week' : ''}`;
                
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = day;
                dayEl.appendChild(dayNumber);

                const entry = this.timeEntries[date.toISOString()];
                if (entry) {
                    const entryDisplay = document.createElement('div');
                    if (this.submittedWeeks[weekNumber]) {
                        const lockIndicator = document.createElement('div');
                        lockIndicator.className = 'lock-indicator';
                        lockIndicator.innerHTML = '🔒';
                        lockIndicator.title = 'Week submitted - contact manager for changes';
                        dayEl.appendChild(lockIndicator);
                    }
                    
                    if (entry.isTimeOff) {
                        entryDisplay.className = 'hours-display time-off';
                        entryDisplay.innerHTML = `Time Off${entry.managerApproved ? '<div class="approval-check">✓ Approved</div>' : ''}`;
                    } else {
                        entryDisplay.className = `hours-display ${entry.hours > 8 ? 'hours-overtime' : 'hours-regular'}`;
                        entryDisplay.innerHTML = `${entry.hours}h${entry.hours > 8 && entry.overtimeApproved ? '<div class="approval-check">✓ OT Approved</div>' : ''}`;
                    }
                    dayEl.appendChild(entryDisplay);
                }

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
                const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
                const entry = this.timeEntries[dateKey];

                if (entry && !entry.isTimeOff) {
                    const dayHours = Number(entry.hours) || 0;
                    totalHours += dayHours;
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
                } else if (totalHours > 40) {
                    summaryHtml += `
                        <div style="text-align: center; color: #ff8d00; margin-top: 16px;">
                            ${totalHours - 40}h overtime this week
                        </div>
                    `;
                }
            }

            this.summaryEl.innerHTML = summaryHtml;

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

    window.TimeTrackingCalendar = TimeTrackingCalendar;
    console.log('TimeTrackingCalendar loaded and registered');
})();