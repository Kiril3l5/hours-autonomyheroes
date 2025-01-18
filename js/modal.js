// modal.js
(function() {
    console.log('Modal module loading...');

    class TimeEntryModal {
        constructor(onSave) {
            const modal = document.getElementById('timeEntryModal');
            if (!modal) {
                console.error('Modal element not found');
                return;
            }
            this.modal = modal;
            this.dateDisplay = document.getElementById('modalDate');
            this.timeOffCheck = document.getElementById('timeOffCheck');
            this.managerApprovedCheck = document.getElementById('managerApprovedCheck');
            this.hoursInput = document.getElementById('hoursInput');
            this.overtimeApprovedCheck = document.getElementById('overtimeApprovedCheck');
            this.shortDayApprovedCheck = document.getElementById('shortDayApprovedCheck');
            this.selectedDate = null;
            this.onSave = onSave;

            // Bind event listeners
            this.timeOffCheck.addEventListener('change', () => this.toggleTimeOff());
            this.hoursInput.addEventListener('change', () => this.checkHours());
            document.getElementById('cancelEntry').addEventListener('click', () => this.close());
            document.getElementById('saveEntry').addEventListener('click', () => this.save());

            // Initial state
            this.toggleTimeOff();
            this.checkHours();
        }

        open(date, currentEntry = null) {
            this.selectedDate = date;
            this.dateDisplay.textContent = formatDate(date);
            
            // Reset and populate form
            this.timeOffCheck.checked = currentEntry?.isTimeOff || false;
            this.managerApprovedCheck.checked = currentEntry?.managerApproved || false;
            this.hoursInput.value = currentEntry?.hours || 8;
            this.overtimeApprovedCheck.checked = currentEntry?.overtimeApproved || false;
            this.shortDayApprovedCheck.checked = currentEntry?.shortDayApproved || false;

            this.toggleTimeOff();
            this.checkHours();
            this.modal.style.display = 'flex';
        }

        close() {
            this.modal.style.display = 'none';
            this.selectedDate = null;
        }

        toggleTimeOff() {
            const isTimeOff = this.timeOffCheck.checked;
            document.getElementById('timeOffApproval').style.display = isTimeOff ? 'block' : 'none';
            document.getElementById('hoursSection').style.display = isTimeOff ? 'none' : 'block';
        }

        checkHours() {
            const hours = Number(this.hoursInput.value);
            document.getElementById('overtimeApproval').style.display = hours > 8 ? 'block' : 'none';
            document.getElementById('shortDayApproval').style.display = hours < 8 ? 'block' : 'none';
        }

        validate() {
            const hours = Number(this.hoursInput.value);
            if (!this.timeOffCheck.checked && (isNaN(hours) || hours < 0 || hours > 24)) {
                alert('Please enter valid hours between 0 and 24');
                return false;
            }
            return true;
        }

        save() {
            if (!this.selectedDate) {
                console.error('No date selected');
                return;
            }

            if (!this.validate()) {
                return;
            }

            const hours = Number(this.hoursInput.value);
            const isTimeOff = this.timeOffCheck.checked;

            // If hours is 0 and not time off, clear the entry
            if (hours === 0 && !isTimeOff) {
                this.onSave(this.selectedDate, null);
                this.close();
                return;
            }

            // Create entry object
            const entry = {
                hours: isTimeOff ? 0 : hours,
                isTimeOff,
                managerApproved: isTimeOff && this.managerApprovedCheck.checked,
                overtimeApproved: hours > 8 && this.overtimeApprovedCheck.checked,
                shortDayApproved: hours < 8 && this.shortDayApprovedCheck.checked,
                timestamp: new Date().toISOString()
            };

            try {
                const dateToSave = new Date(this.selectedDate);
                this.onSave(dateToSave, entry);
                this.close();
            } catch (error) {
                console.error('Error saving entry:', error);
                alert('Error saving entry. Please try again.');
            }
        }
    }

    // Make it globally available
    window.TimeEntryModal = TimeEntryModal;
    console.log('TimeEntryModal loaded and registered');
})();