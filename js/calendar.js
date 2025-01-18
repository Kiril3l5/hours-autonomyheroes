// calendar.js
(function() {
    class TimeTrackingCalendar {
        constructor() {
            console.log('Initializing TimeTrackingCalendar...');
            
            // Verify environment and dependencies
            this.verifyEnvironment();
            
            // Initialize state
            this.initializeState();
            
            // Set up event listeners for browser tab visibility
            this.setupVisibilityListener();
            
            // Initialize calendar UI and load data
            this.initializeCalendar();
            
            console.log('TimeTrackingCalendar initialization complete');
        }

        verifyEnvironment() {
            // Check user authentication
            const currentUser = firebase.auth()?.currentUser;
            if (!currentUser) {
                throw new Error('User must be logged in to initialize calendar');
            }

            // Verify required dependencies
            if (!window.TimeEntryModal) {
                throw new Error('TimeEntryModal dependency not found');
            }

            // Store references
            this.userId = currentUser.uid;
            this.db = firebase.firestore();
            
            // Set up offline persistence
            this.db.enablePersistence({ synchronizeTabs: true })
                .catch(error => {
                    if (error.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, offline persistence disabled');
                    } else if (error.code === 'unimplemented') {
                        console.warn('Browser doesn\'t support offline persistence');
                    }
                });
        }

        initializeState() {
            // Initialize with UTC date
            this.currentDate = new Date(Date.UTC(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate()
            ));
            
            this.timeEntries = new Map();
            this.submittedWeeks = new Set();
            this.isLoading = false;
            this.lastSync = null;
            this.syncInterval = 5 * 60 * 1000; // 5 minutes
        }

        setupVisibilityListener() {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.handleVisibilityChange();
                }
            });
        }

        async handleVisibilityChange() {
            // Check if we need to sync
            if (!this.lastSync || (Date.now() - this.lastSync) > this.syncInterval) {
                await this.loadSubmittedEntries();
                this.render();
            }
        }

        initializeCalendar() {
            // Initialize UI elements
            this.initializeUIElements();
            
            // Create modal with validation and error handling
            this.initializeModal();
            
            // Bind event handlers
            this.bindEventHandlers();
            
            // Load data and render
            this.loadInitialData();
        }

        initializeUIElements() {
            this.calendarEl = document.getElementById('calendar');
            this.summaryEl = document.getElementById('weekSummary');
            this.loadingEl = document.createElement('div');
            this.loadingEl.className = 'calendar-loading';
            this.loadingEl.innerHTML = '<div class="spinner"></div>';
            this.calendarEl.parentNode.insertBefore(this.loadingEl, this.calendarEl);
        }

        initializeModal() {
            this.modal = new TimeEntryModal(async (date, entry) => {
                try {
                    await this.handleTimeEntry(date, entry);
                } catch (error) {
                    console.error('Error handling time entry:', error);
                    this.showError('Failed to save time entry. Please try again.');
                }
            });
        }

        bindEventHandlers() {
            // Navigation handlers
            document.getElementById('prevMonth')?.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
            
            document.getElementById('nextMonth')?.addEventListener('click', () => {
                this.navigateMonth(1);
            });
            
            // Submit handler
            document.getElementById('submitWeek')?.addEventListener('click', async () => {
                try {
                    await this.submitWeek();
                } catch (error) {
                    console.error('Error submitting week:', error);
                    this.showError('Failed to submit week. Please try again.');
                }
            });
        }

        async loadInitialData() {
            this.setLoading(true);
            try {
                await Promise.all([
                    this.loadSavedData(),
                    this.loadSubmittedEntries()
                ]);
                this.render();
                this.updateWeekSummary();
            } catch (error) {
                console.error('Error loading initial data:', error);
                this.showError('Failed to load calendar data. Please refresh the page.');
            } finally {
                this.setLoading(false);
            }
        }

        navigateMonth(delta) {
            const newDate = new Date(this.currentDate);
            newDate.setUTCMonth(newDate.getUTCMonth() + delta);
            this.currentDate = newDate;
            this.render();
        }

        setLoading(isLoading) {
            this.isLoading = isLoading;
            this.loadingEl.style.display = isLoading ? 'flex' : 'none';
            this.calendarEl.style.opacity = isLoading ? '0.5' : '1';
        }

        showError(message, duration = 5000) {
            const errorEl = document.createElement('div');
            errorEl.className = 'calendar-error';
            errorEl.textContent = message;
            this.calendarEl.parentNode.insertBefore(errorEl, this.calendarEl);
            setTimeout(() => errorEl.remove(), duration);
        }

        async loadSavedData() {
            try {
                const savedEntries = localStorage.getItem(`timeEntries_${this.userId}`);
                const savedSubmissions = localStorage.getItem(`submittedWeeks_${this.userId}`);
                
                if (savedEntries) {
                    const entries = JSON.parse(savedEntries);
                    this.timeEntries = new Map(Object.entries(entries));
                }
                
                if (savedSubmissions) {
                    const submissions = JSON.parse(savedSubmissions);
                    this.submittedWeeks = new Set(submissions);
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
                // Reset state on error
                this.timeEntries.clear();
                this.submittedWeeks.clear();
                throw error;
            }
        }

        async handleTimeEntry(date, entry) {
            if (!this.validateTimeEntry(date, entry)) {
                throw new Error('Invalid time entry');
            }

            const dateKey = this.getDateKey(date);
            const weekNumber = getWeekNumber(date);

            if (this.submittedWeeks.has(weekNumber)) {
                throw new Error('Cannot modify entries in submitted weeks');
            }

            if (entry === null) {
                this.timeEntries.delete(dateKey);
            } else {
                this.timeEntries.set(dateKey, {
                    ...entry,
                    dateKey,
                    timestamp: new Date().toISOString()
                });
            }

            await this.saveTimeEntries();
            this.render();
            this.updateWeekSummary();
        }

        validateTimeEntry(date, entry) {
            if (!date || isNaN(date.getTime())) {
                return false;
            }

            if (entry === null) {
                return true;
            }

            if (entry.isTimeOff) {
                return typeof entry.managerApproved === 'boolean';
            }

            const hours = Number(entry.hours);
            return !isNaN(hours) && hours >= 0 && hours <= 24;
        }

        async saveTimeEntries() {
            try {
                const entriesObject = Object.fromEntries(this.timeEntries);
                localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(entriesObject));
                
                // Sync with Firestore for offline support
                await this.syncWithFirestore();
            } catch (error) {
                console.error('Error saving time entries:', error);
                throw error;
            }
        }

        async syncWithFirestore() {
            try {
                const batch = this.db.batch();
                const syncRef = this.db.collection('timeSync').doc(this.userId);

                batch.set(syncRef, {
                    entries: Object.fromEntries(this.timeEntries),
                    lastSync: firebase.firestore.FieldValue.serverTimestamp()
                });

                await batch.commit();
                this.lastSync = Date.now();
            } catch (error) {
                console.error('Error syncing with Firestore:', error);
                // Continue without sync - data is still in localStorage
            }
        }

        getDateKey(date) {
            return new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            )).toISOString();
        }

        async submitWeek() {
            try {
                await this.verifyAuth();
                
                const weekData = await this.prepareWeekSubmission();
                if (!weekData) {
                    return;
                }

                await this.saveWeekSubmission(weekData);
                
                this.handleSuccessfulSubmission(weekData.weekNumber);
            } catch (error) {
                console.error('Error submitting week:', error);
                throw error;
            }
        }

        async prepareWeekSubmission() {
            const today = new Date();
            const weekNumber = getWeekNumber(today);
            const weekId = this.getWeekId(today);
            
            // Verify week not already submitted
            const existingSubmission = await this.db
                .collection('timeEntries')
                .doc(weekId)
                .get();

            if (existingSubmission.exists) {
                this.showError('This week has already been submitted');
                return null;
            }

            // Calculate week totals
            const weekData = this.calculateWeekData(today);
            
            // Confirm submission
            if (!await this.confirmWeekSubmission(weekData)) {
                return null;
            }

            return {
                ...weekData,
                weekId,
                weekNumber
            };
        }

        async saveWeekSubmission(weekData) {
            const submission = {
                workerId: this.userId,
                week: weekData.weekId,
                hours: weekData.hoursArray,
                totalHours: weekData.totalHours,
                status: 'pending_approval',
                approvedBy: null,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('timeEntries').doc(weekData.weekId).set(submission);
        }

        handleSuccessfulSubmission(weekNumber) {
            this.submittedWeeks.add(weekNumber);
            localStorage.setItem(
                `submittedWeeks_${this.userId}`, 
                JSON.stringify(Array.from(this.submittedWeeks))
            );
            
            this.render();
            this.updateWeekSummary();
            
            this.showError('Week submitted successfully!', 3000);
        }

        calculateWeekData(date) {
            const weekDates = getWeekDates(date);
            const hoursArray = weekDates.map(date => {
                const dateKey = this.getDateKey(date);
                const entry = this.timeEntries.get(dateKey) || null;
                
                return {
                    date: dateKey,
                    hours: entry?.hours || 0,
                    isTimeOff: entry?.isTimeOff || false,
                    managerApproved: entry?.managerApproved || false,
                    overtimeApproved: entry?.overtimeApproved || false,
                    shortDayApproved: entry?.shortDayApproved || false
                };
            });

            const totalHours = hoursArray.reduce((sum, day) => 
                sum + (day.isTimeOff ? 0 : day.hours), 0);

            return { hoursArray, totalHours };
        }

        async confirmWeekSubmission(weekData) {
            const messages = [];
            
            if (weekData.totalHours < 40) {
                messages.push(`You only have ${weekData.totalHours} hours this week.`);
            }
            
            messages.push(
                'You won\'t be able to make changes after submission.',
                'Contact your manager if changes are needed after submission.'
            );

            return confirm(messages.join('\n\n'));
        }

        getWeekId(date) {
            const weekNumber = getWeekNumber(date);
            const year = date.getFullYear();
            return `${this.userId}_${year}-W${weekNumber.toString().padStart(2, '0')}`;
        }

        async loadSubmittedEntries() {
            try {
                const snapshot = await this.db
                    .collection('timeEntries')
                    .where('workerId', '==', this.userId)
                    .get();

                this.submittedWeeks.clear();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const weekNumber = parseInt(data.week.split('-W')[1]);
                    this.submittedWeeks.add(weekNumber);
                    
                    data.hours.forEach(hourEntry => {
                        if (hourEntry.hours > 0 || hourEntry.isTimeOff) {
                            this.timeEntries.set(hourEntry.date, hourEntry);
                        }
                    });
                });

                // Update localStorage
                localStorage.setItem(
                    `submittedWeeks_${this.userId}`,
                    JSON.stringify(Array.from(this.submittedWeeks))
                );
                localStorage.setItem(
                    `timeEntries_${this.userId}`,
                    JSON.stringify(Object.fromEntries(this.timeEntries))
                );
                
                this.lastSync = Date.now();
            } catch (error) {
                console.error('Error loading submitted entries:', error);
                throw error;
            }
        }

        render() {
            if (this.isLoading) {
                return;
            }

            try {
                this.renderMonthTitle();
                this.renderCalendarDays();
            } catch (error) {
                console.error('Error rendering calendar:', error);
                this.showError('Error displaying calendar');
            }
        }

        renderMonthTitle() {
            const titleEl = document.getElementById('currentMonth');
            if (titleEl) {
                titleEl.textContent = this.currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric',
                    timeZone: 'UTC'
                });
            }
        }

        renderCalendarDays() {
            // Clear existing calendar days while keeping weekday headers
            while (this.calendarEl.children.length > 7) {
                this.calendarEl.removeChild(this.calendarEl.lastChild);
            }

            const year = this.currentDate.getUTCFullYear();
            const month = this.currentDate.getUTCMonth();
            const firstDay = getFirstDayOfMonth(year, month);
            const daysInMonth = getDaysInMonth(year, month);
            
            // Calculate start day (Monday = 0, Sunday = 6)
            let startDay = firstDay === 0 ? 6 : firstDay - 1;

            // Add empty days
            for (let i = 0; i < startDay; i++) {
                this.createEmptyDay();
            }

            // Add month days
            for (let day = 1; day <= daysInMonth; day++) {
                this.createCalendarDay(year, month, day);
            }
        }

        createEmptyDay() {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day empty';
            this.calendarEl.appendChild(emptyDay);
        }

        createCalendarDay(year, month, day) {
            const date = new Date(Date.UTC(year, month, day));
            const dateKey = this.getDateKey(date);
            const entry = this.timeEntries.get(dateKey);
            
            const dayEl = document.createElement('div');
            const isCurrentWeek = checkIfCurrentWeek(date);
            const isPastWeek = checkIfPastWeek(date);
            const weekNumber = getWeekNumber(date);
            
            dayEl.className = `day ${isCurrentWeek ? 'current-week' : ''} ${isPastWeek ? 'past-week' : ''}`;
            
            // Add day number
            this.addDayNumber(dayEl, day);

            // Add entry if exists
            if (entry) {
                this.addEntryDisplay(dayEl, entry, weekNumber);
            }

            // Add click handler if appropriate
            if (isCurrentWeek && !isPastWeek && !this.submittedWeeks.has(weekNumber)) {
                dayEl.onclick = () => this.modal.open(date, entry);
            }

            // Add to calendar
            this.calendarEl.appendChild(dayEl);
        }

        addDayNumber(dayEl, day) {
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayEl.appendChild(dayNumber);
        }

        addEntryDisplay(dayEl, entry, weekNumber) {
            const entryDisplay = document.createElement('div');
            
            if (this.submittedWeeks.has(weekNumber)) {
                this.addLockIndicator(dayEl);
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

        addLockIndicator(dayEl) {
            const lockIndicator = document.createElement('div');
            lockIndicator.className = 'lock-indicator';
            lockIndicator.innerHTML = '🔒';
            lockIndicator.title = 'Week submitted - contact manager for changes';
            dayEl.appendChild(lockIndicator);
        }

        updateWeekSummary() {
            try {
                const today = new Date();
                const weekDates = getWeekDates(today);
                const weekNumber = getWeekNumber(today);
                const weekData = this.calculateWeekSummary(weekDates);
                
                this.renderWeekSummary(weekData, weekNumber);
                this.updateSubmitButton(weekData, weekNumber);
            } catch (error) {
                console.error('Error updating week summary:', error);
                this.showError('Error updating week summary');
            }
        }

        calculateWeekSummary(weekDates) {
            let totalHours = 0;
            const dailyEntries = weekDates.map(date => {
                const dateKey = this.getDateKey(date);
                const entry = this.timeEntries.get(dateKey);
                
                if (entry && !entry.isTimeOff) {
                    totalHours += Number(entry.hours) || 0;
                }

                return {
                    date,
                    entry,
                    isToday: date.toDateString() === new Date().toDateString()
                };
            });

            return { totalHours, dailyEntries };
        }

        renderWeekSummary(weekData, weekNumber) {
            let summaryHtml = this.createWeekHeader(weekData.totalHours);
            summaryHtml += this.createDailyEntries(weekData.dailyEntries);
            summaryHtml += this.createWeekFooter(weekData.totalHours);

            this.summaryEl.innerHTML = summaryHtml;
        }

        createWeekHeader(totalHours) {
            return `
                <div class="week-header">
                    <div class="week-total">Week Total: ${totalHours}h</div>
                </div>
            `;
        }

        createDailyEntries(dailyEntries) {
            return dailyEntries.map(({ date, entry, isToday }) => {
                const dayStyle = isToday ? 'today' : '';
                const statusHtml = this.getEntryStatusHtml(entry);
                
                return `
                    <div class="day-summary ${dayStyle}">
                        <span class="day-name">${date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span class="day-status">${statusHtml}</span>
                    </div>
                `;
            }).join('');
        }

        getEntryStatusHtml(entry) {
            if (!entry) {
                return '<span class="no-entry">No Entry</span>';
            }

            if (entry.isTimeOff) {
                return entry.managerApproved ? 
                    '<span class="time-off approved">Time Off (✓)</span>' : 
                    '<span class="time-off">Time Off</span>';
            }

            let statusClass = '';
            let statusExtra = '';
            
            if (entry.hours > 8) {
                statusClass = 'overtime';
                if (entry.overtimeApproved) statusExtra = ' (OT ✓)';
            } else if (entry.hours < 8) {
                statusClass = 'short-day';
                if (entry.shortDayApproved) statusExtra = ' (✓)';
            } else {
                statusClass = 'regular';
            }

            return `<span class="${statusClass}">${entry.hours}h${statusExtra}</span>`;
        }

        createWeekFooter(totalHours) {
            if (totalHours === 40) return '';
            
            const diff = Math.abs(40 - totalHours);
            const message = totalHours < 40 ?
                `${diff}h remaining to reach 40h week` :
                `${diff}h overtime this week`;
            
            const className = totalHours < 40 ? 'remaining' : 'overtime';
            
            return `
                <div class="week-footer ${className}">
                    ${message}
                </div>
            `;
        }

        updateSubmitButton(weekData, weekNumber) {
            const submitBtn = document.getElementById('submitWeek');
            if (!submitBtn) return;

            if (this.submittedWeeks.has(weekNumber)) {
                submitBtn.disabled = true;
                submitBtn.className = 'btn disabled';
                submitBtn.textContent = 'Week Submitted';
            } else {
                submitBtn.disabled = weekData.totalHours < 40;
                submitBtn.className = 'btn' + (weekData.totalHours < 40 ? ' disabled' : '');
                submitBtn.textContent = weekData.totalHours >= 40 ? 
                    'Submit Week for Approval' : 
                    'Complete 40h Before Submitting';
            }
        }

        async verifyAuth() {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            try {
                await this.db.collection('workers').doc(currentUser.uid).get();
                return currentUser;
            } catch (error) {
                console.error('Error verifying Firestore access:', error);
                throw new Error('Unable to verify user access');
            }
        }
    }

    // Make TimeTrackingCalendar available globally
    window.TimeTrackingCalendar = TimeTrackingCalendar;
    console.log('TimeTrackingCalendar loaded and registered');
})();