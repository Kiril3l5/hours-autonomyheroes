// auth.js
function verifyRequiredElements() {
    const required = [
        'authContainer',
        'calendarContainer',
        'userEmail',
        'loginTab',
        'registerTab',
        'loginForm',
        'registerForm',
        'calendar',
        'weekSummary',
        'submitWeek'
    ];

    const missing = required.filter(id => !document.getElementById(id));
    if (missing.length > 0) {
        throw new Error(`Missing required elements: ${missing.join(', ')}`);
    }
}
class AuthManager {
    constructor() {
        try {
            // Verify DOM elements first
            verifyRequiredElements();

            // Initialize state
            this.isInitialized = false;
            this.auth = null;
            this.db = null;
            this.calendarInstance = null;

            // Initialize Firebase instances
            this.initializeFirebase();

            // Bind UI event handlers
            this.bindEvents();
        } catch (error) {
            console.error('Error initializing AuthManager:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
            throw error;
        }
    }

    initializeFirebase() {
        try {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Set up auth state observer
            this.auth.onAuthStateChanged((user) => this.handleAuthStateChange(user));
            
            // Set persistence to local
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => console.log('Auth persistence set to LOCAL'))
                .catch(error => console.error('Error setting persistence:', error));

        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.showError('Failed to initialize authentication system');
        }
    }

    async handleAuthStateChange(user) {
        const authContainer = document.getElementById('authContainer');
        const calendarContainer = document.getElementById('calendarContainer');

        if (!authContainer || !calendarContainer) {
            console.error('Required DOM elements not found');
            return;
        }

        if (user) {
            console.log('User signed in:', user.uid);
            
            try {
                // Update UI
                authContainer.classList.remove('active');
                calendarContainer.classList.add('active');
                
                const userEmailElement = document.getElementById('userEmail');
                if (userEmailElement) {
                    userEmailElement.textContent = user.email;
                }

                // Initialize calendar with retries and timeout
                await this.initializeCalendarWithTimeout();
            } catch (error) {
                console.error('Error after login:', error);
                this.showError('Error initializing calendar. Please refresh the page.');
                
                // Reset UI state on error
                authContainer.classList.add('active');
                calendarContainer.classList.remove('active');
            }
        } else {
            console.log('User signed out');
            
            // Update UI
            authContainer.classList.add('active');
            calendarContainer.classList.remove('active');
            
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = '';
            }
            
            // Clean up calendar
            if (this.calendarInstance) {
                // Add any necessary cleanup here
                this.calendarInstance = null;
            }
        }
    }

    async initializeCalendarWithTimeout(retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        const timeout = 5000; // 5 seconds

        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Calendar initialization timed out')), timeout);
            });

            // Create the initialization promise
            const initPromise = this.initializeCalendar(retryCount);

            // Race between timeout and initialization
            await Promise.race([initPromise, timeoutPromise]);
        } catch (error) {
            console.error(`Calendar initialization error (attempt ${retryCount + 1}):`, error);
            
            if (retryCount < maxRetries) {
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.initializeCalendarWithTimeout(retryCount + 1);
            } else {
                throw new Error('Failed to initialize calendar after multiple attempts');
            }
        }
    }

    async initializeCalendar(retryCount = 0) {
        // Check if TimeTrackingCalendar exists
        if (typeof TimeTrackingCalendar === 'undefined') {
            throw new Error('Calendar component not loaded');
        }

        if (!this.calendarInstance) {
            // Verify DOM elements exist
            const requiredElements = ['calendar', 'weekSummary', 'submitWeek'];
            for (const elementId of requiredElements) {
                if (!document.getElementById(elementId)) {
                    throw new Error(`Required element #${elementId} not found`);
                }
            }

            // Initialize calendar
            this.calendarInstance = new TimeTrackingCalendar();
        }

        return this.calendarInstance;
    }

    bindEvents() {
        // Tab switching
        document.getElementById('loginTab')?.addEventListener('click', () => {
            document.getElementById('loginTab').classList.add('active');
            document.getElementById('registerTab').classList.remove('active');
            document.getElementById('loginForm').classList.add('active');
            document.getElementById('registerForm').classList.remove('active');
        });

        document.getElementById('registerTab')?.addEventListener('click', () => {
            document.getElementById('registerTab').classList.add('active');
            document.getElementById('loginTab').classList.remove('active');
            document.getElementById('registerForm').classList.add('active');
            document.getElementById('loginForm').classList.remove('active');
        });

        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const email = document.getElementById('loginEmail').value.trim();
                const password = document.getElementById('loginPassword').value;
                await this.auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                console.error('Login error:', error);
                this.showError(this.getAuthErrorMessage(error));
            }
        });

        // Register form
        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const email = document.getElementById('regEmail').value.trim();
                const password = document.getElementById('regPassword').value;
                const firstName = document.getElementById('regFirstName').value.trim();
                const lastName = document.getElementById('regLastName').value.trim();

                const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                await this.db.collection('workers').doc(userCredential.user.uid).set({
                    firstName,
                    lastName,
                    email,
                    role: 'worker',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                });
            } catch (error) {
                console.error('Registration error:', error);
                this.showError(this.getAuthErrorMessage(error));
            }
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            try {
                await this.auth.signOut();
            } catch (error) {
                console.error('Logout error:', error);
                this.showError('Error during logout. Please try again.');
            }
        });
    }

    showError(message) {
        const container = document.querySelector('.auth-container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        container.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Invalid email or password';
            case 'auth/email-already-in-use':
                return 'This email is already registered';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/invalid-email':
                return 'Invalid email address';
            default:
                return error.message;
        }
    }
}

// Make AuthManager available globally
window.AuthManager = AuthManager;