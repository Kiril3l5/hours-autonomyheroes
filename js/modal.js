// modal.js
class TimeEntryModal {
    constructor(onSave) {
        this.modal = document.getElementById('timeEntryModal');
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

    save() {
        const hours = Number(this.hoursInput.value);
        const isTimeOff = this.timeOffCheck.checked;

        // Validate entries
        if (hours === 0) {
            const confirmed = window.confirm('Setting 0 hours will clear the entry. Continue?');
            if (!confirmed) return;
        }

        if (!isTimeOff) {
            if (hours < 8 && !this.shortDayApprovedCheck.checked) {
                alert('Please confirm manager awareness for less than 8 hours');
                return;
            }
            if (hours > 8 && !this.overtimeApprovedCheck.checked) {
                alert('Please confirm overtime approval');
                return;
            }
        }

        // Create entry object
        const entry = hours === 0 ? null : {
            hours: isTimeOff ? 0 : hours,
            isTimeOff,
            managerApproved: isTimeOff && this.managerApprovedCheck.checked,
            overtimeApproved: hours > 8 && this.overtimeApprovedCheck.checked,
            shortDayApproved: hours < 8 && this.shortDayApprovedCheck.checked,
            timestamp: new Date().toISOString()
        };

        // Call save callback
        this.onSave(this.selectedDate, entry);
        this.close();
    }
}
