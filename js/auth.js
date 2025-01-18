// auth.js
(function() {
    class AuthManager {
        constructor() {
            // Initialize state
            this.isInitialized = false;
            this.initializationAttempts = 0;
            this.maxInitAttempts = 3;
            this.initializationDelay = 1000; // 1 second

            // Bind methods
            this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
            this.initialize = this.initialize.bind(this);
            this.bindEvents = this.bindEvents.bind(this);

            // Start initialization
            this.initialize();
        }

        async initialize() {
            console.log('Initializing AuthManager...');
            
            try {
                // Check if Firebase is available
                if (!window.firebase) {
                    throw new Error('Firebase not loaded');
                }

                // Initialize Firebase instances
                this.auth = firebase.auth();
                this.db = firebase.firestore();

                // Set up loading indicator
                this.setupLoadingIndicator();

                // Set persistence and initialize auth state observer
                await this.setupPersistence();
                
                // Bind UI events
                this.bindEvents();
                
                this.isInitialized = true;
                console.log('AuthManager initialization complete');
            } catch (error) {
                console.error('Error during initialization:', error);
                
                if (this.initializationAttempts < this.maxInitAttempts) {
                    this.initializationAttempts++;
                    console.log(`Retrying initialization (${this.initializationAttempts}/${this.maxInitAttempts})...`);
                    setTimeout(this.initialize, this.initializationDelay);
                } else {
                    this.handleFatalError('Failed to initialize authentication system');
                }
            }
        }

        setupLoadingIndicator() {
            // Create loading overlay
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.display = 'none';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }

        showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        async setupPersistence() {
            try {
                await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                console.log('Auth persistence set to LOCAL');
                
                // Set up auth state observer
                this.auth.onAuthStateChanged(this.handleAuthStateChange);
            } catch (error) {
                console.error('Error setting persistence:', error);
                throw error;
            }
        }

        handleFatalError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fatal-error';
            errorDiv.textContent = message;
            document.body.prepend(errorDiv);
        }

        async handleAuthStateChange(user) {
            const authContainer = document.getElementById('authContainer');
            const calendarContainer = document.getElementById('calendarContainer');
            const loadingOverlay = document.getElementById('loadingOverlay');

            try {
                this.showLoading();

                if (user) {
                    console.log('User signed in:', user.uid);
                    
                    // Verify Firestore access
                    await this.verifyFirestoreAccess(user.uid);
                    
                    // Update UI for authenticated state
                    this.updateUIForAuthenticatedUser(user, authContainer, calendarContainer);

                    // Initialize calendar if needed
                    await this.initializeCalendar();
                } else {
                    console.log('User signed out');
                    this.updateUIForSignedOutUser(authContainer, calendarContainer);
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                this.handleAuthError(error);
            } finally {
                this.hideLoading();
            }
        }

        async verifyFirestoreAccess(uid) {
            try {
                const docRef = await this.db.collection('workers').doc(uid).get();
                if (!docRef.exists) {
                    throw new Error('User document not found');
                }
            } catch (error) {
                console.error('Firestore access error:', error);
                throw new Error('Unable to verify user access');
            }
        }

        updateUIForAuthenticatedUser(user, authContainer, calendarContainer) {
            authContainer.classList.remove('active');
            calendarContainer.classList.add('active');
            document.getElementById('userEmail').textContent = user.email;
        }

        updateUIForSignedOutUser(authContainer, calendarContainer) {
            authContainer.classList.add('active');
            calendarContainer.classList.remove('active');
            document.getElementById('userEmail').textContent = '';
            
            // Clean up calendar instance
            if (window.calendar) {
                window.calendar = null;
            }
        }

        async initializeCalendar() {
            if (!window.calendar && window.TimeTrackingCalendar) {
                let retryCount = 0;
                const maxRetries = 3;

                const tryInitializeCalendar = async () => {
                    try {
                        window.calendar = new TimeTrackingCalendar();
                    } catch (error) {
                        console.error(`Calendar initialization error (attempt ${retryCount + 1}):`, error);
                        if (retryCount < maxRetries) {
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await tryInitializeCalendar();
                        } else {
                            throw new Error('Failed to initialize calendar');
                        }
                    }
                };

                await tryInitializeCalendar();
            }
        }

        handleAuthError(error) {
            let message = 'Authentication error occurred';
            
            if (error.code === 'permission-denied') {
                message = 'Permission denied. Please log in again.';
                this.auth.signOut();
            } else if (error.message === 'Failed to initialize calendar') {
                message = 'Error loading calendar. Please refresh the page.';
            } else if (error.message === 'User document not found') {
                message = 'User account not properly set up. Please contact support.';
                this.auth.signOut();
            }

            this.showError(message);
        }

        showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error';
            errorDiv.textContent = message;
            
            const container = document.querySelector('.auth-container');
            container.prepend(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 5000);
        }

        validatePassword(password) {
            const minLength = 8;
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasNonalphas = /\W/.test(password);

            if (password.length < minLength) {
                throw new Error('Password must be at least 8 characters long');
            }
            if (!(hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas)) {
                throw new Error('Password must contain uppercase, lowercase, numbers and special characters');
            }
        }

        sanitizeInput(input) {
            return input.trim().replace(/[<>]/g, '');
        }

        bindEvents() {
            // Tab switching
            this.bindTabEvents();
            
            // Form submissions
            this.bindLoginForm();
            this.bindRegistrationForm();
            
            // Logout
            this.bindLogoutButton();
        }

        bindTabEvents() {
            const loginTab = document.getElementById('loginTab');
            const registerTab = document.getElementById('registerTab');
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');

            loginTab?.addEventListener('click', () => {
                loginTab.classList.add('active');
                registerTab?.classList.remove('active');
                loginForm?.classList.add('active');
                registerForm?.classList.remove('active');
            });

            registerTab?.addEventListener('click', () => {
                registerTab.classList.add('active');
                loginTab?.classList.remove('active');
                registerForm?.classList.add('active');
                loginForm?.classList.remove('active');
            });
        }

        bindLoginForm() {
            const form = document.getElementById('loginForm');
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();
                this.showLoading();

                try {
                    const email = this.sanitizeInput(document.getElementById('loginEmail').value);
                    const password = document.getElementById('loginPassword').value;

                    await this.auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    console.error('Login error:', error);
                    this.showError(this.getAuthErrorMessage(error));
                } finally {
                    this.hideLoading();
                }
            });
        }

        bindRegistrationForm() {
            const form = document.getElementById('registerForm');
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();
                this.showLoading();

                try {
                    const email = this.sanitizeInput(document.getElementById('regEmail').value);
                    const password = document.getElementById('regPassword').value;
                    const firstName = this.sanitizeInput(document.getElementById('regFirstName').value);
                    const lastName = this.sanitizeInput(document.getElementById('regLastName').value);

                    // Validate password
                    this.validatePassword(password);

                    // Create user
                    const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                    
                    // Set up user profile
                    await this.setupUserProfile(userCredential.user, firstName, lastName, email);
                } catch (error) {
                    console.error('Registration error:', error);
                    this.showError(this.getAuthErrorMessage(error));
                } finally {
                    this.hideLoading();
                }
            });
        }

        async setupUserProfile(user, firstName, lastName, email) {
            try {
                await this.db.collection('workers').doc(user.uid).set({
                    firstName,
                    lastName,
                    email,
                    role: 'worker',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                });

                // Send email verification
                await user.sendEmailVerification();
            } catch (error) {
                console.error('Error setting up user profile:', error);
                await user.delete();
                throw new Error('Failed to complete registration');
            }
        }

        bindLogoutButton() {
            const logoutBtn = document.getElementById('logoutBtn');
            logoutBtn?.addEventListener('click', async () => {
                this.showLoading();
                try {
                    await this.auth.signOut();
                } catch (error) {
                    console.error('Logout error:', error);
                    this.showError('Error during logout. Please try again.');
                } finally {
                    this.hideLoading();
                }
            });
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
    console.log('AuthManager loaded and registered');
})();