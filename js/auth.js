// auth.js
class AuthManager {
    constructor() {
        // Initialize state
        this.isInitialized = false;
        this.auth = null;
        this.db = null;

        // Initialize Firebase instances
        this.initializeFirebase();

        // Bind UI event handlers
        this.bindEvents();
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

    handleAuthStateChange(user) {
        const authContainer = document.getElementById('authContainer');
        const calendarContainer = document.getElementById('calendarContainer');

        if (user) {
            console.log('User signed in:', user.uid);
            
            // Update UI
            authContainer.classList.remove('active');
            calendarContainer.classList.add('active');
            document.getElementById('userEmail').textContent = user.email;

            // Initialize calendar
            if (!window.calendar) {
                window.calendar = new TimeTrackingCalendar();
            }
        } else {
            console.log('User signed out');
            
            // Update UI
            authContainer.classList.add('active');
            calendarContainer.classList.remove('active');
            document.getElementById('userEmail').textContent = '';
            
            // Clean up calendar
            if (window.calendar) {
                window.calendar = null;
            }
        }
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