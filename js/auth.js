// auth.js
(function() {
    class AuthManager {
        constructor() {
            // Initialize state
            this.isInitialized = false;
            this.initializationAttempts = 0;
            this.maxInitAttempts = 3;
            this.initializationDelay = 1000; // 1 second

            // Cache DOM elements
            this.elements = {
                authContainer: null,
                calendarContainer: null,
                userEmail: null,
                loginTab: null,
                registerTab: null,
                loginForm: null,
                registerForm: null,
                logoutBtn: null
            };

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

                // Initialize DOM elements
                this.initializeElements();

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

        initializeElements() {
            this.elements = {
                authContainer: document.getElementById('authContainer'),
                calendarContainer: document.getElementById('calendarContainer'),
                userEmail: document.getElementById('userEmail'),
                loginTab: document.getElementById('loginTab'),
                registerTab: document.getElementById('registerTab'),
                loginForm: document.getElementById('loginForm'),
                registerForm: document.getElementById('registerForm'),
                logoutBtn: document.getElementById('logoutBtn')
            };

            // Verify required elements exist
            const missingElements = Object.entries(this.elements)
                .filter(([key, element]) => !element)
                .map(([key]) => key);

            if (missingElements.length > 0) {
                throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
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
            try {
                this.showLoading();

                if (user) {
                    console.log('User signed in:', user.uid);
                    
                    // Verify Firestore access
                    await this.verifyFirestoreAccess(user.uid);
                    
                    // Update UI for authenticated state
                    this.updateUIForAuthenticatedUser(user);

                    // Initialize calendar if needed
                    await this.initializeCalendar();
                } else {
                    console.log('User signed out');
                    this.updateUIForSignedOutUser();
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

        updateUIForAuthenticatedUser(user) {
            this.elements.authContainer.classList.remove('active');
            this.elements.calendarContainer.classList.add('active');
            this.elements.userEmail.textContent = user.email;
        }

        updateUIForSignedOutUser() {
            this.elements.authContainer.classList.add('active');
            this.elements.calendarContainer.classList.remove('active');
            this.elements.userEmail.textContent = '';
            
            // Clean up calendar instance
            if (window.calendar) {
                window.calendar = null;
            }
        }

        // ... [Rest of the auth.js code remains the same]
    }

    // Make AuthManager available globally
    window.AuthManager = AuthManager;
    console.log('AuthManager loaded and registered');
})();