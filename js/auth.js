/* auth.js */
class AuthManager {
    constructor() {
        try {
            this.verifyRequiredElements();
            this.initializeState();
            this.initializeFirebase();
            this.bindEvents();
        } catch (error) {
            console.error('Error initializing AuthManager:', error);
            this.showError('Failed to initialize application');
            throw error;
        }
    }

    verifyRequiredElements() {
        const required = [
            'authContainer',
            'calendarContainer',
            'userEmail',
            'loginTab',
            'registerTab',
            'loginForm',
            'registerForm',
            'loginFormElement',
            'registerFormElement',
            'authErrorContainer',
            'authErrorMessage'
        ];

        const missing = required.filter(id => !document.getElementById(id));
        if (missing.length > 0) {
            throw new Error(`Missing required elements: ${missing.join(', ')}`);
        }
    }

    initializeState() {
        this.isInitialized = false;
        this.auth = null;
        this.db = null;
        this.calendarInstance = null;
        
        // Get UI elements
        this.errorContainer = document.getElementById('authErrorContainer');
        this.errorMessage = document.getElementById('authErrorMessage');
        this.loginForm = document.getElementById('loginFormElement');
        this.registerForm = document.getElementById('registerFormElement');
        
        // Email validation regex
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    }

    initializeFirebase() {
        try {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            this.auth.onAuthStateChanged((user) => this.handleAuthStateChange(user));
            
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch(error => {
                    console.error('Error setting persistence:', error);
                    this.showError('Failed to initialize persistence');
                });

        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.showError('Failed to initialize authentication system');
            throw error;
        }
    }

    bindEvents() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => {
            this.switchTab('login');
        });

        document.getElementById('registerTab').addEventListener('click', () => {
            this.switchTab('register');
        });

        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

        // Close error message
        document.querySelector('.auth-error-close')?.addEventListener('click', () => {
            this.clearError();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());

        // Input validation
        this.setupInputValidation();
    }

    switchTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
        }

        this.clearError();
        this.clearFormErrors();
    }

    setupInputValidation() {
        // Login form validation
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');

        loginEmail.addEventListener('input', () => {
            this.validateEmail(loginEmail, 'loginEmailError');
        });

        loginPassword.addEventListener('input', () => {
            this.validatePassword(loginPassword, 'loginPasswordError');
        });

        // Register form validation
        const regEmail = document.getElementById('regEmail');
        const regPassword = document.getElementById('regPassword');
        const regFirstName = document.getElementById('regFirstName');
        const regLastName = document.getElementById('regLastName');

        regEmail.addEventListener('input', () => {
            this.validateEmail(regEmail, 'regEmailError');
        });

        regPassword.addEventListener('input', () => {
            this.validatePassword(regPassword, 'regPasswordError');
        });

        regFirstName.addEventListener('input', () => {
            this.validateName(regFirstName, 'regFirstNameError');
        });

        regLastName.addEventListener('input', () => {
            this.validateName(regLastName, 'regLastNameError');
        });
    }

    validateEmail(input, errorId) {
        const errorElement = document.getElementById(errorId);
        if (!input.value) {
            errorElement.textContent = 'Email is required';
            return false;
        }
        if (!this.emailRegex.test(input.value)) {
            errorElement.textContent = 'Please enter a valid email address';
            return false;
        }
        errorElement.textContent = '';
        return true;
    }

    validatePassword(input, errorId) {
        const errorElement = document.getElementById(errorId);
        if (!input.value) {
            errorElement.textContent = 'Password is required';
            return false;
        }
        if (input.value.length < 6) {
            errorElement.textContent = 'Password must be at least 6 characters';
            return false;
        }
        errorElement.textContent = '';
        return true;
    }

    validateName(input, errorId) {
        const errorElement = document.getElementById(errorId);
        if (!input.value) {
            errorElement.textContent = 'This field is required';
            return false;
        }
        if (input.value.length < 2) {
            errorElement.textContent = 'Must be at least 2 characters';
            return false;
        }
        errorElement.textContent = '';
        return true;
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validate inputs
        const isEmailValid = this.validateEmail(
            document.getElementById('loginEmail'), 
            'loginEmailError'
        );
        const isPasswordValid = this.validatePassword(
            document.getElementById('loginPassword'), 
            'loginPasswordError'
        );
        
        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        this.setLoading(true, 'login');
        
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.clearError();
            this.clearFormErrors();
        } catch (error) {
            console.error('Login error:', error);
            this.showError(this.getAuthErrorMessage(error));
        } finally {
            this.setLoading(false, 'login');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const firstName = document.getElementById('regFirstName').value.trim();
        const lastName = document.getElementById('regLastName').value.trim();
        
        // Validate all inputs
        const isEmailValid = this.validateEmail(
            document.getElementById('regEmail'), 
            'regEmailError'
        );
        const isPasswordValid = this.validatePassword(
            document.getElementById('regPassword'), 
            'regPasswordError'
        );
        const isFirstNameValid = this.validateName(
            document.getElementById('regFirstName'), 
            'regFirstNameError'
        );
        const isLastNameValid = this.validateName(
            document.getElementById('regLastName'), 
            'regLastNameError'
        );
        
        if (!isEmailValid || !isPasswordValid || !isFirstNameValid || !isLastNameValid) {
            return;
        }

        this.setLoading(true, 'register');
        
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // Create user profile in Firestore
            await this.db.collection('workers').doc(userCredential.user.uid).set({
                firstName,
                lastName,
                email,
                role: 'worker',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
            
            this.clearError();
            this.clearFormErrors();
        } catch (error) {
            console.error('Registration error:', error);
            this.showError(this.getAuthErrorMessage(error));
        } finally {
            this.setLoading(false, 'register');
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.clearError();
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Error during logout. Please try again.');
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

                // Initialize calendar
                if (!this.calendarInstance) {
                    await this.initializeCalendarWithTimeout();
                }
            } catch (error) {
                console.error('Error after login:', error);
                this.showError('Error initializing calendar. Please try again.');
                
                // Reset UI state on error
                authContainer.classList.add('active');
                calendarContainer.classList.remove('active');
            }
        } else {
            // User is signed out
            authContainer.classList.add('active');
            calendarContainer.classList.remove('active');
            
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = '';
            }
            
            // Clean up calendar instance
            this.calendarInstance = null;
        }
    }

    setLoading(isLoading, form) {
        const button = document.querySelector(`#${form}FormElement .btn-auth`);
        const spinner = button.querySelector('.btn-spinner');
        const text = button.querySelector('.btn-text');
        
        if (isLoading) {
            button.disabled = true;
            spinner.classList.remove('hidden');
            text.classList.add('hidden');
        } else {
            button.disabled = false;
            spinner.classList.add('hidden');
            text.classList.remove('hidden');
        }
    }

    showError(message) {
        if (this.errorContainer && this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorContainer.removeAttribute('aria-hidden');
        }
    }

    clearError() {
        if (this.errorContainer) {
            this.errorContainer.setAttribute('aria-hidden', 'true');
        }
    }

    clearFormErrors() {
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Invalid password';
            case 'auth/email-already-in-use':
                return 'This email is already registered';
            case 'auth/weak-password':
                return 'Password must be at least 6 characters';
            case 'auth/invalid-email':
                return 'Invalid email format';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later';
            case 'auth/operation-not-allowed':
                return 'Operation not allowed. Please contact support';
            case 'auth/popup-closed-by-user':
                return 'Authentication window was closed';
            default:
                return error.message || 'An error occurred during authentication';
        }
    }

    async initializeCalendarWithTimeout(retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        const timeout = 5000; // 5 seconds

        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Calendar initialization timed out')), timeout);
            });

            const initPromise = this.initializeCalendar();
            await Promise.race([initPromise, timeoutPromise]);
        } catch (error) {
            console.error(`Calendar initialization error (attempt ${retryCount + 1}):`, error);
            
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.initializeCalendarWithTimeout(retryCount + 1);
            }
            throw new Error('Failed to initialize calendar after multiple attempts');
        }
    }

    async initializeCalendar() {
        return new Promise((resolve, reject) => {
            // Ensure modal element exists
            const modalElement = document.getElementById('timeEntryModal');
            if (!modalElement) {
                reject(new Error('Modal element not found in DOM'));
                return;
            }

            // Ensure TimeTrackingCalendar exists
            if (typeof TimeTrackingCalendar === 'undefined') {
                reject(new Error('Calendar component not loaded'));
                return;
            }

            try {
                if (!this.calendarInstance) {
                    this.calendarInstance = new TimeTrackingCalendar();
                }
                resolve(this.calendarInstance);
            } catch (error) {
                reject(error);
            }
        });
    }
}

// Export globally
window.AuthManager = AuthManager;