// auth.js
(function() {
    class AuthManager {
        constructor() {
            // Initialize Firebase
            const firebaseConfig = {
                apiKey: "AIzaSyB1dlHRhLA71PxCgVLjOieUcUF22DWx6zY",
                authDomain: "autonomy-heroes.firebaseapp.com",
                projectId: "autonomy-heroes",
                storageBucket: "autonomy-heroes.firebasestorage.app",
                messagingSenderId: "266526530869",
                appId: "1:266526530869:web:ea95143735be497ca8007c"
            };

            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            this.auth = firebase.auth();
            this.db = firebase.firestore();

            this.bindEvents();
            this.initAuthStateObserver();
        }

        initAuthStateObserver() {
            this.auth.onAuthStateChanged((user) => {
                const authContainer = document.getElementById('authContainer');
                const calendarContainer = document.getElementById('calendarContainer');

                if (user) {
                    console.log('User signed in:', user.uid);
                    authContainer.classList.remove('active');
                    calendarContainer.classList.add('active');
                    document.getElementById('userEmail').textContent = user.email;

                    let retryCount = 0;
                    const maxRetries = 10;

                    const initCalendar = () => {
                        if (window.TimeTrackingCalendar) {
                            console.log('Calendar found, initializing...');
                            if (!window.calendar) {
                                window.calendar = new TimeTrackingCalendar();
                            }
                        } else if (retryCount < maxRetries) {
                            console.log(`Retry ${retryCount + 1} of ${maxRetries}`);
                            retryCount++;
                            setTimeout(initCalendar, 100);
                        } else {
                            console.error('Failed to load TimeTrackingCalendar after max retries');
                        }
                    };

                    initCalendar();
                } else {
                    console.log('User signed out');
                    authContainer.classList.add('active');
                    calendarContainer.classList.remove('active');
                    document.getElementById('userEmail').textContent = '';
                    if (window.calendar) {
                        window.calendar = null;
                    }
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
                // Success is handled by the auth state observer
            } catch (error) {
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
        // Create user in Firebase Auth
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Create worker document
        await this.db.collection('workers').doc(userId).set({
            firstName,
            lastName,
            email,
            role: 'worker',
            createdAt: new Date().toISOString(),
            status: 'active'
        });

        // Success is handled by the auth state observer
    } catch (error) {
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

    // Initialize auth manager when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        window.authManager = new AuthManager();
    });
})();