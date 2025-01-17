// auth.js
(function() {
    class AuthManager {
        constructor() {
            console.log('Initializing AuthManager...');
            
            // Initialize Firebase Auth and Firestore
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Set up initial auth state check
            this.auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });

            // Bind events immediately
            this.bindEvents();
        }

        // Update handleAuthStateChange method in auth.js
handleAuthStateChange(user) {
    try {
        const authContainer = document.getElementById('authContainer');
        const calendarContainer = document.getElementById('calendarContainer');

        if (user) {
            console.log('User signed in:', user.uid);
            
            // Update UI
            authContainer.classList.remove('active');
            calendarContainer.classList.add('active');
            document.getElementById('userEmail').textContent = user.email;

            // Initialize calendar with retry logic
            const initializeCalendar = () => {
                if (window.TimeTrackingCalendar) {
                    console.log('Creating new calendar instance');
                    if (!window.calendar) {
                        try {
                            window.calendar = new TimeTrackingCalendar();
                            if (!window.calendar) {
                                throw new Error('Calendar creation failed');
                            }
                        } catch (error) {
                            console.error('Error creating calendar:', error);
                            // Retry after a short delay
                            setTimeout(initializeCalendar, 100);
                        }
                    }
                } else {
                    console.log('Waiting for TimeTrackingCalendar to be available...');
                    setTimeout(initializeCalendar, 100);
                }
            };

            initializeCalendar();
        } else {
            console.log('User signed out');
            authContainer.classList.add('active');
            calendarContainer.classList.remove('active');
            document.getElementById('userEmail').textContent = '';
            if (window.calendar) {
                window.calendar = null;
            }
        }
    } catch (error) {
        console.error('Auth state change error:', error);
    }
}

        bindEvents() {
            // Tab switching
            document.getElementById('loginTab').addEventListener('click', () => {
                document.getElementById('loginTab').classList.add('active');
                document.getElementById('registerTab').classList.remove('active');
                document.getElementById('loginForm').classList.add('active');
                document.getElementById('registerForm').classList.remove('active');
            });

            document.getElementById('registerTab').addEventListener('click', () => {
                document.getElementById('registerTab').classList.add('active');
                document.getElementById('loginTab').classList.remove('active');
                document.getElementById('registerForm').classList.add('active');
                document.getElementById('loginForm').classList.remove('active');
            });

            // Login form
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                try {
                    await this.auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    console.error('Login error:', error);
                    alert(error.message);
                }
            });

            // Register form
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                const firstName = document.getElementById('regFirstName').value;
                const lastName = document.getElementById('regLastName').value;

                try {
                    const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                    const userId = userCredential.user.uid;

                    await this.db.collection('workers').doc(userId).set({
                        firstName,
                        lastName,
                        email,
                        role: 'worker',
                        createdAt: new Date().toISOString(),
                        status: 'active'
                    });
                } catch (error) {
                    console.error('Registration error:', error);
                    alert(error.message);
                }
            });

            // Logout
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.auth.signOut().catch(error => {
                    console.error('Logout error:', error);
                    alert(error.message);
                });
            });
        }
    }

    // Initialize auth manager when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.authManager) {
                window.authManager = new AuthManager();
            }
        });
    } else {
        if (!window.authManager) {
            window.authManager = new AuthManager();
        }
    }
})();