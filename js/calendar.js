// calendar.js
class TimeTrackingCalendar {
    constructor() {
        console.log('Initializing TimeTrackingCalendar...');
        try {
            // Initialize dependencies first
            this.initializeDependencies();
            
            // Initialize state
            this.initializeState();
            
            // Initialize UI
            this.initializeUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            this.loadInitialData();
            
            console.log('TimeTrackingCalendar initialization complete');
        } catch (error) {
            console.error('Calendar initialization error:', error);
            throw error;
        }
    }

    initializeDependencies() {
        // Check user authentication
        const currentUser = firebase.auth()?.currentUser;
        if (!currentUser) {
            throw new Error('User must be logged in to initialize calendar');
        }

        // Check TimeEntryModal
        if (typeof window.TimeEntryModal === 'undefined') {
            throw new Error('TimeEntryModal dependency not found');
        }

        // Store references
        this.userId = currentUser.uid;
        this.db = firebase.firestore();
    }

    initializeState() {
        // Current date in UTC
        this.currentDate = new Date(Date.UTC(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate()
        ));
        
        // Data storage
        this.timeEntries = new Map();
        this.submittedWeeks = new Set();
        
        // UI state
        this.isLoading = false;
        this.lastSync = null;
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
        
        // Network state
        this.isOnline = navigator.onLine;
    }

    initializeUI() {
        // Get main elements
        this.calendarEl = document.getElementById('calendar');
        this.summaryEl = document.getElementById('weekSummary');
        this.submitButton = document.getElementById('submitWeek');
        
        if (!this.calendarEl || !this.summaryEl || !this.submitButton) {
            throw new Error('Required calendar elements not found');
        }

        // Create loading indicator
        this.createLoadingIndicator();
        
        // Initialize modal
        this.initializeModal();
    }

    createLoadingIndicator() {
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

    setupEventListeners() {
        // Navigation
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            this.navigateMonth(-1);
        });
        
        document.getElementById('nextMonth')?.addEventListener('click', () => {
            this.navigateMonth(1);
        });
        
        // Submit week
        this.submitButton.addEventListener('click', async () => {
            try {
                await this.submitWeek();
            } catch (error) {
                console.error('Error submitting week:', error);
                this.showError('Failed to submit week. Please try again.');
            }
        });

        // Online/Offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handleVisibilityChange();
            }
        });
    }

    async handleVisibilityChange() {
        if (this.isOnline && (!this.lastSync || (Date.now() - this.lastSync) > this.syncInterval)) {
            await this.syncData();
        }
    }

    async syncData() {
        try {
            await this.loadSubmittedEntries();
            this.render();
            this.lastSync = Date.now();
        } catch (error) {
            console.error('Error syncing data:', error);
            // Don't show error to user - silent sync
        }
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
	// Calendar Data Management Methods
// These methods should be added to the TimeTrackingCalendar class

    async loadSavedData() {
        try {
            // Load from localStorage first
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
        const weekNumber = DateUtils.getWeekNumber(date);

        if (this.submittedWeeks.has(weekNumber)) {
            throw new Error('Cannot modify entries in submitted weeks');
        }

        try {
            // Update local state
            if (entry === null) {
                this.timeEntries.delete(dateKey);
            } else {
                this.timeEntries.set(dateKey, {
                    ...entry,
                    dateKey,
                    timestamp: new Date().toISOString()
                });
            }

            // Save changes
            await this.saveTimeEntries();
            
            // Update UI
            this.render();
            this.updateWeekSummary();
        } catch (error) {
            console.error('Error handling time entry:', error);
            throw error;
        }
    }

    validateTimeEntry(date, entry) {
        if (!date || isNaN(date.getTime())) {
            return false;
        }

        if (entry === null) {
            return true; // Allowing null for entry deletion
        }

        if (entry.isTimeOff) {
            return typeof entry.managerApproved === 'boolean';
        }

        const hours = Number(entry.hours);
        return !isNaN(hours) && hours >= 0 && hours <= 24;
    }

    async saveTimeEntries() {
        try {
            // Save to localStorage
            const entriesObject = Object.fromEntries(this.timeEntries);
            localStorage.setItem(`timeEntries_${this.userId}`, JSON.stringify(entriesObject));
            
            // Sync with Firestore if online
            if (this.isOnline) {
                await this.syncWithFirestore();
            }
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

    async loadSubmittedEntries() {
        if (!this.isOnline) {
            return; // Skip if offline
        }

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
                
                // Update time entries
                data.hours.forEach(hourEntry => {
                    if (hourEntry.hours > 0 || hourEntry.isTimeOff) {
                        this.timeEntries.set(hourEntry.date, hourEntry);
                    }
                });
            });

            // Update localStorage
            this.updateLocalStorage();
            
        } catch (error) {
            console.error('Error loading submitted entries:', error);
            throw error;
        }
    }

    updateLocalStorage() {
        try {
            localStorage.setItem(
                `submittedWeeks_${this.userId}`,
                JSON.stringify(Array.from(this.submittedWeeks))
            );
            localStorage.setItem(
                `timeEntries_${this.userId}`,
                JSON.stringify(Object.fromEntries(this.timeEntries))
            );
        } catch (error) {
            console.error('Error updating localStorage:', error);
            // Continue without localStorage update
        }
    }

    getDateKey(date) {
        return DateUtils.normalizeDate(date).toISOString();
    }
	
	// Calendar UI and Week Submission Methods
// These methods should be added to the TimeTrackingCalendar class

    async submitWeek() {
        try {
            // Verify auth
            await this.verifyAuth();
            
            // Prepare submission
            const weekData = await this.prepareWeekSubmission();
            if (!weekData) {
                return;
            }

            // Save submission
            await this.saveWeekSubmission(weekData);
            this.handleSuccessfulSubmission(weekData.weekNumber);

            // Sync with server
            if (this.isOnline) {
                await this.syncWeekSubmission(weekData);
            } else {
                this.queueOfflineSubmission(weekData);
            }
        } catch (error) {
            console.error('Error in submitWeek:', error);
            throw error;
        }
    }

    async prepareWeekSubmission() {
        const today = new Date();
        const weekNumber = DateUtils.getWeekNumber(today);
        const weekId = this.getWeekId(today);
        
        // Check if already submitted
        if (this.isOnline) {
            const existingSubmission = await this.db
                .collection('timeEntries')
                .doc(weekId)
                .get();

            if (existingSubmission.exists) {
                this.showError('This week has already been submitted');
                return null;
            }
        }

        // Calculate week data
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

        if (this.isOnline) {
            await this.db.collection('timeEntries').doc(weekData.weekId).set(submission);
        } else {
            // Store for later sync
            localStorage.setItem(`pendingSubmission_${weekData.weekId}`, JSON.stringify(submission));
        }
    }

    async syncWeekSubmission(weekData) {
        try {
            const response = await fetch('/timeEntries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(weekData)
            });

            const result = await response.json();
            if (result.offline) {
                this.showOfflineNotification();
                await this.registerBackgroundSync();
            }
        } catch (error) {
            console.error('Server sync error:', error);
            this.showOfflineNotification();
            await this.registerBackgroundSync();
        }
    }

    async registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-timeentries');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }

    handleSuccessfulSubmission(weekNumber) {
        this.submittedWeeks.add(weekNumber);
        this.updateLocalStorage();
        this.render();
        this.updateWeekSummary();
        this.showSuccess('Week submitted successfully!');
    }

    calculateWeekData(date) {
        const weekDates = DateUtils.getWeekDates(date);
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
        const weekNumber = DateUtils.getWeekNumber(date);
        const year = date.getFullYear();
        return `${this.userId}_${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }

    showOfflineNotification() {
        const notification = document.createElement('div');
        notification.className = 'offline-notification';
        notification.textContent = 'You are offline. Entry saved and will sync when online.';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showSuccess(message) {
        const successEl = document.createElement('div');
        successEl.className = 'success-message';
        successEl.textContent = message;
        this.calendarEl.parentNode.insertBefore(successEl, this.calendarEl);
        setTimeout(() => successEl.remove(), 3000);
    }

    showError(message, duration = 5000) {
        const errorEl = document.createElement('div');
        errorEl.className = 'calendar-error';
        errorEl.textContent = message;
        this.calendarEl.parentNode.insertBefore(errorEl, this.calendarEl);
        setTimeout(() => errorEl.remove(), duration);
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
	
	