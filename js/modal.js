// modal.js
class TimeEntryModal {
    constructor(onSave) {
        // Store callback
        this.onSave = onSave;
        
        // Initialize state
        this.state = {
            isOpen: false,
            isLoading: false,
            selectedDate: null,
            currentEntry: null,
            dirty: false
        };

        // Initialize elements
        this.initializeElements();
        
        // Set up validation
        this.setupValidation();
        
        // Bind event handlers
        this.bindEventHandlers();
        
        // Set up keyboard handling
        this.setupKeyboardHandling();
    }

    initializeElements() {
        // Get modal elements
        this.modal = document.getElementById('timeEntryModal');
        if (!this.modal) {
            throw new Error('Modal element not found');
        }

        // Get form elements
        this.dateDisplay = document.getElementById('modalDate');
        this.timeOffCheck = document.getElementById('timeOffCheck');
        this.managerApprovedCheck = document.getElementById('managerApprovedCheck');
        this.hoursInput = document.getElementById('hoursInput');
        this.overtimeApprovedCheck = document.getElementById('overtimeApprovedCheck');
        this.shortDayApprovedCheck = document.getElementById('shortDayApprovedCheck');
        
        // Get sections
        this.timeOffSection = document.getElementById('timeOffApproval');
        this.hoursSection = document.getElementById('hoursSection');
        this.overtimeSection = document.getElementById('overtimeApproval');
        this.shortDaySection = document.getElementById('shortDayApproval');
        
        // Get action buttons
        this.saveButton = document.getElementById('saveEntry');

        // Create loading overlay
        this.createLoadingOverlay();
    }

    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'modal-loading-overlay';
        this.loadingOverlay.innerHTML = '<div class="spinner"></div>';
        this.loadingOverlay.style.display = 'none';
        this.modal.appendChild(this.loadingOverlay);
    }

    setupValidation() {
        this.validationRules = {
            hours: {
                min: 0,
                max: 24,
                validate: (value) => {
                    const hours = Number(value);
                    return !isNaN(hours) && hours >= 0 && hours <= 24;
                },
                message: 'Please enter valid hours between 0 and 24'
            }
        };
    }

    bindEventHandlers() {
        // Time off checkbox handler
        this.timeOffCheck.addEventListener('change', () => this.handleTimeOffChange());
        
        // Hours input handlers
        this.hoursInput.addEventListener('input', () => this.handleHoursChange());
        this.hoursInput.addEventListener('blur', () => this.validateHours());
        
        // Save button handler
        this.saveButton.addEventListener('click', () => this.handleSave());
        
        // Form change tracking
        const formElements = this.modal.querySelectorAll('input');
        formElements.forEach(element => {
            element.addEventListener('change', () => {
                this.state.dirty = true;
            });
        });

        // Outside click handling
        document.addEventListener('mousedown', (event) => {
            if (this.state.isOpen && !event.target.closest('.modal-content')) {
                this.close();
            }
        });
    }

    setupKeyboardHandling() {
        document.addEventListener('keydown', (event) => {
            if (!this.state.isOpen) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            } else if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                this.handleSave();
            }
        });
    }

    open(date, currentEntry = null) {
        if (!date || isNaN(date.getTime())) {
            console.error('Invalid date provided to modal');
            return;
        }

        // Update state
        this.state.selectedDate = date;
        this.state.currentEntry = currentEntry;
        this.state.dirty = false;
        this.state.isOpen = true;

        // Update UI
        this.updateModalContent();
        
        // Show modal
        this.modal.style.display = 'flex';
        requestAnimationFrame(() => {
            this.modal.classList.add('modal-visible');
        });
    }

    close() {
        if (this.state.dirty && !confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }

        this.modal.classList.remove('modal-visible');
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.resetState();
        }, 300);
    }

    resetState() {
        this.state = {
            isOpen: false,
            isLoading: false,
            selectedDate: null,
            currentEntry: null,
            dirty: false
        };
    }

    updateModalContent() {
        // Update date display
        this.dateDisplay.textContent = this.formatDate(this.state.selectedDate);
        
        // Populate form
        const entry = this.state.currentEntry;
        this.timeOffCheck.checked = entry?.isTimeOff || false;
        this.managerApprovedCheck.checked = entry?.managerApproved || false;
        this.hoursInput.value = entry?.hours || 8;
        this.overtimeApprovedCheck.checked = entry?.overtimeApproved || false;
        this.shortDayApprovedCheck.checked = entry?.shortDayApproved || false;

        // Update visibility
        this.updateSectionVisibility();
        
        // Set focus
        this.setInitialFocus();
    }

    handleTimeOffChange() {
        const isTimeOff = this.timeOffCheck.checked;
        
        // Update hours
        if (isTimeOff) {
            this.hoursInput.value = '0';
        } else {
            this.hoursInput.value = '8';
        }
        
        this.updateSectionVisibility();
        this.state.dirty = true;
    }

    handleHoursChange() {
        this.validateHours();
        this.updateSectionVisibility();
        this.state.dirty = true;
    }

    updateSectionVisibility() {
        const isTimeOff = this.timeOffCheck.checked;
        const hours = Number(this.hoursInput.value);
        
        // Show/hide time off section
        this.timeOffSection.style.display = isTimeOff ? 'block' : 'none';
        this.hoursSection.style.display = isTimeOff ? 'none' : 'block';
        
        // Show/hide approval sections
        if (!isTimeOff) {
            this.overtimeSection.style.display = hours > 8 ? 'block' : 'none';
            this.shortDaySection.style.display = hours < 8 ? 'block' : 'none';
        } else {
            this.overtimeSection.style.display = 'none';
            this.shortDaySection.style.display = 'none';
        }
    }

    async handleSave() {
        if (!this.validate()) {
            return;
        }

        try {
            this.setLoading(true);
            const entry = this.gatherFormData();
            await this.onSave(this.state.selectedDate, entry);
            this.state.dirty = false;
            this.close();
        } catch (error) {
            console.error('Error saving entry:', error);
            this.showError('Failed to save entry. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    validate() {
        if (this.state.isLoading) return false;
        
        if (!this.timeOffCheck.checked && !this.validateHours()) {
            this.showError(this.validationRules.hours.message);
            return false;
        }

        return true;
    }

    validateHours() {
        const hours = Number(this.hoursInput.value);
        const isValid = this.validationRules.hours.validate(hours);
        
        this.hoursInput.classList.toggle('invalid', !isValid);
        this.saveButton.disabled = !isValid;
        
        return isValid;
    }

    gatherFormData() {
        const hours = Number(this.hoursInput.value);
        const isTimeOff = this.timeOffCheck.checked;

        if (hours === 0 && !isTimeOff) {
            return null;
        }

        return {
            hours: isTimeOff ? 0 : hours,
            isTimeOff,
            managerApproved: isTimeOff && this.managerApprovedCheck.checked,
            overtimeApproved: hours > 8 && this.overtimeApprovedCheck.checked,
            shortDayApproved: hours < 8 && this.shortDayApprovedCheck.checked,
            timestamp: new Date().toISOString()
        };
    }

    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        this.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        this.saveButton.disabled = isLoading;
    }

    showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'modal-error';
        errorDiv.textContent = message;
        
        const existingError = this.modal.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }
        
        this.modal.appendChild(errorDiv);
        
        requestAnimationFrame(() => {
            errorDiv.classList.add('error-visible');
        });

        setTimeout(() => {
            errorDiv.classList.remove('error-visible');
            setTimeout(() => errorDiv.remove(), 300);
        }, duration);
    }

    setInitialFocus() {
        if (this.timeOffCheck.checked) {
            this.managerApprovedCheck.focus();
        } else {
            this.hoursInput.focus();
            this.hoursInput.select();
        }
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Make TimeEntryModal available globally
window.TimeEntryModal = TimeEntryModal;