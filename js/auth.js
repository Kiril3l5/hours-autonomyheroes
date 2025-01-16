// auth.js
(function() {
    class AuthManager {
        constructor() {
            console.log('Initializing AuthManager...');
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Initialize right away if TimeTrackingCalendar is available
            if (window.TimeTrackingCalendar) {
                this.bindEvents();
                this.initAuthStateObserver();
            } else {
                this.waitForDependencies();
            }
        }

        waitForDependencies() {
            let attempts = 0;
            const maxAttempts = 50;
            const interval = 100;

            const checkDependencies = () => {
                if (window.TimeTrackingCalendar) {
                    console.log('TimeTrackingCalendar found');
                    this.bindEvents();
                    this.initAuthStateObserver();
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    console.error('Dependencies not found after', attempts, 'attempts');
                    return;
                }
                
                setTimeout(checkDependencies, interval);
            };

            checkDependencies();
        }

        initAuthStateObserver() {
            this.auth.onAuthStateChanged((user) => {
                try {
                    const authContainer = document.getElementById('authContainer');
                    const calendarContainer = document.getElementById('calendarContainer');

                    if (user) {
                        console.log('User signed in:', user.uid);
                        authContainer.classList.remove('active');
                        calendarContainer.classList.add('active');
                        document.getElementById('userEmail').textContent = user.email;

                        if (!window.calendar) {
                            console.log('Creating new calendar instance');
                            window.calendar = new TimeTrackingCalendar();
                        }
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
            });
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
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, creating AuthManager');
        if (!window.authManager) {
            window.authManager = new AuthManager();
        }
    });
})();