// modal.js
(function() {
    TimeEntryModal = class {
    constructor(onSave) {
        this.initialize(onSave);
        this.setupKeyboardHandling();
        this.setupOutsideClickHandling();
    }

        initialize(onSave) {
            // Initialize state
            this.state = {
                isOpen: false,
                isLoading: false,
                selectedDate: null,
                currentEntry: null,
                dirty: false
            };

            // Store callback
            this.onSave = onSave;

            // Get modal elements
            this.initializeElements();

            // Set up form validation
            this.setupFormValidation();

            // Bind methods
            this.bindMethods();

            // Bind event listeners
            this.bindEventListeners();
        }

        initializeElements() {
            this.modal = document.getElementById('timeEntryModal');
            if (!this.modal) {
                throw new Error('Modal element not found');
            }

            this.dateDisplay = document.getElementById('modalDate');
            this.timeOffCheck = document.getElementById('timeOffCheck');
            this.managerApprovedCheck = document.getElementById('managerApprovedCheck');
            this.hoursInput = document.getElementById('hoursInput');
            this.overtimeApprovedCheck = document.getElementById('overtimeApprovedCheck');
            this.shortDayApprovedCheck = document.getElementById('shortDayApprovedCheck');
            
            this.timeOffSection = document.getElementById('timeOffApproval');
            this.hoursSection = document.getElementById('hoursSection');
            this.overtimeSection = document.getElementById('overtimeApproval');
            this.shortDaySection = document.getElementById('shortDayApproval');
            
            this.saveButton = document.getElementById('saveEntry');
            
            this.createLoadingOverlay();
        }

        setupOutsideClickHandling() {
            document.addEventListener('mousedown', (event) => {
                if (!this.state.isOpen) return;
                
                // Check if click is outside modal content
                if (!event.target.closest('.modal-content')) {
                    this.close();
                }
            });
        }

        createLoadingOverlay() {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.className = 'modal-loading-overlay';
            this.loadingOverlay.innerHTML = '<div class="spinner"></div>';
            this.loadingOverlay.style.display = 'none';
            this.modal.appendChild(this.loadingOverlay);
        }

        setupKeyboardHandling() {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        }

        handleKeyDown(event) {
            if (!this.state.isOpen) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            } else if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                this.handleSave();
            }
        }

        bindMethods() {
            this.handleSave = this.handleSave.bind(this);
            this.handleCancel = this.handleCancel.bind(this);
            this.handleTimeOffChange = this.handleTimeOffChange.bind(this);
            this.handleHoursChange = this.handleHoursChange.bind(this);
        }

        bindEventListeners() {
            this.timeOffCheck.addEventListener('change', this.handleTimeOffChange);
            this.hoursInput.addEventListener('input', this.handleHoursChange);
            this.hoursInput.addEventListener('blur', () => this.validateHours());
            
            this.saveButton.addEventListener('click', this.handleSave);
            
            const formElements = this.modal.querySelectorAll('input');
            formElements.forEach(element => {
                element.addEventListener('change', () => {
                    this.state.dirty = true;
                });
            });
        }

        setupFormValidation() {
            this.validationRules = {
                hours: {
                    min: 0,
                    max: 24,
                    validate: (value) => {
                        const hours = Number(value);
                        return !isNaN(hours) && hours >= this.validationRules.hours.min && hours <= this.validationRules.hours.max;
                    },
                    message: 'Please enter valid hours between 0 and 24'
                }
            };
        }

        open(date, currentEntry = null) {
            if (!date || isNaN(date.getTime())) {
                console.error('Invalid date provided to modal');
                return;
            }

            this.state.selectedDate = date;
            this.state.currentEntry = currentEntry;
            this.state.dirty = false;
            this.state.isOpen = true;

            this.updateModalContent();
            this.showModal();
        }

        close() {
            if (this.state.dirty && !this.confirmClose()) {
                return;
            }

            this.modal.classList.remove('modal-visible');
            setTimeout(() => {
                this.modal.style.display = 'none';
                this.resetState();
            }, 300);
        }

        confirmClose() {
            return !this.state.dirty || 
                confirm('You have unsaved changes. Are you sure you want to close?');
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
            this.dateDisplay.textContent = this.formatDate(this.state.selectedDate);
            this.populateForm();
            this.updateSectionVisibility();
            this.setInitialFocus();
        }

        showModal() {
            this.modal.style.display = 'flex';
            requestAnimationFrame(() => {
                this.modal.classList.add('modal-visible');
            });
        }

        handleTimeOffChange() {
            const isTimeOff = this.timeOffCheck.checked;
            this.timeOffSection.style.display = isTimeOff ? 'block' : 'none';
            this.hoursSection.style.display = isTimeOff ? 'none' : 'block';
            
            if (isTimeOff) {
                this.hoursInput.value = '0';
            } else {
                this.hoursInput.value = '8';
            }
            
            this.updateSectionVisibility();
        }

        handleHoursChange() {
            this.validateHours();
            this.updateSectionVisibility();
        }

        updateSectionVisibility() {
            const isTimeOff = this.timeOffCheck.checked;
            const hours = Number(this.hoursInput.value);
            
            this.timeOffSection.style.display = isTimeOff ? 'block' : 'none';
            this.hoursSection.style.display = isTimeOff ? 'none' : 'block';
            
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
            this.onSave(this.state.selectedDate, entry)
                .then(() => {
                    this.state.dirty = false; // Clear dirty state after successful save
                    this.close();
                })
                .catch(error => {
                    console.error('Error saving entry:', error);
                    this.showError('Failed to save entry. Please try again.');
                })
                .finally(() => {
                    this.setLoading(false);
                });
        } catch (error) {
            console.error('Error in handleSave:', error);
            this.showError('Failed to process entry. Please try again.');
            this.setLoading(false);
        }
    }

    close() {
        if (this.state.dirty && this.state.isOpen) {
            const canClose = confirm('You have unsaved changes. Are you sure you want to close?');
            if (!canClose) {
                return;
            }
        }

        this.modal.classList.remove('modal-visible');
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.resetState();
        }, 300);
    }
};


        validate() {
            if (this.state.isLoading) {
                return false;
            }

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

        populateForm() {
            const entry = this.state.currentEntry;
            
            this.timeOffCheck.checked = entry?.isTimeOff || false;
            this.managerApprovedCheck.checked = entry?.managerApproved || false;
            this.hoursInput.value = entry?.hours || 8;
            this.overtimeApprovedCheck.checked = entry?.overtimeApproved || false;
            this.shortDayApprovedCheck.checked = entry?.shortDayApproved || false;
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
})();