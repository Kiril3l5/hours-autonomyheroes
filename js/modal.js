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
                // Call save callback with the current selected date
                const dateToSave = new Date(this.selectedDate);
                this.onSave(dateToSave, entry);
                this.close();
            } catch (error) {
                console.error('Error saving entry:', error);
                alert('Error saving entry. Please try again.');
            }
        }

    // Make it globally available
    window.TimeEntryModal = TimeEntryModal;
    console.log('TimeEntryModal loaded and registered');
})();

// Add validation method
validate() {
    const hours = Number(this.hoursInput.value);
    
    if (!this.timeOffCheck.checked && (isNaN(hours) || hours < 0 || hours > 24)) {
        alert('Please enter valid hours between 0 and 24');
        return false;
    }
    
    return true;
}

// Update save method
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

    // If hours is 0, clear the entry
    if (hours === 0 && !isTimeOff) {
        console.log('Clearing entry for:', this.selectedDate.toISOString());
        this.onSave(this.selectedDate, null);
        this.close();
        return;
    }

    // Create entry object
    const entry = {
        hours: isTimeOff ? 0 : Number(hours),
        isTimeOff,
        managerApproved: isTimeOff && this.managerApprovedCheck.checked,
        overtimeApproved: hours > 8 && this.overtimeApprovedCheck.checked,
        shortDayApproved: hours < 8 && this.shortDayApprovedCheck.checked,
        timestamp: new Date().toISOString()
    };

    console.log('Saving entry:', entry, 'for date:', this.selectedDate.toISOString());
    
    try {
        // Call save callback with the current selected date
        const dateToSave = new Date(this.selectedDate);
        this.onSave(dateToSave, entry);
        
        // Only close after save is complete
        this.close();
    } catch (error) {
        console.error('Error saving entry:', error);
        alert('Error saving entry. Please try again.');
    }
}