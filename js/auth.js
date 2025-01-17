// auth.js
(function() {
    class AuthManager {
        constructor() {
            console.log('Initializing AuthManager...');
            
            // Initialize Firebase Auth and Firestore
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Set auth persistence to LOCAL
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('Auth persistence set to LOCAL');
                    
                    // Only set up auth state observer after persistence is set
                    this.auth.onAuthStateChanged(user => this.handleAuthStateChange(user));
                })
                .catch((error) => {
                    console.error('Error setting persistence:', error);
                });

            // Bind events
            this.bindEvents();
        }

        async handleAuthStateChange(user) {
            const authContainer = document.getElementById('authContainer');
            const calendarContainer = document.getElementById('calendarContainer');

            if (user) {
                console.log('User signed in:', user.uid);
                
                try {
                    // Verify Firestore access
                    await this.db.collection('workers').doc(user.uid).get();
                    
                    // Update UI
                    authContainer.classList.remove('active');
                    calendarContainer.classList.add('active');
                    document.getElementById('userEmail').textContent = user.email;

                    // Create calendar instance
                    if (!window.calendar && window.TimeTrackingCalendar) {
                        console.log('Creating new calendar instance');
                        try {
                            window.calendar = new TimeTrackingCalendar();
                        } catch (error) {
                            console.error('Error creating calendar:', error);
                            // If calendar creation fails, show error and log out
                            alert('Error initializing calendar. Please try logging in again.');
                            this.auth.signOut();
                        }
                    }
                } catch (error) {
                    console.error('Error verifying Firestore access:', error);
                    // If Firestore access fails, log out
                    alert('Error accessing data. Please try logging in again.');
                    this.auth.signOut();
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

    // Make AuthManager available globally
window.AuthManager = AuthManager;
    console.log('AuthManager loaded and registered');
})();