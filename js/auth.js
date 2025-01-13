// auth.js
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

        // Add error display
        this.errorDiv = document.createElement('div');
        this.errorDiv.style.color = '#dc2626';
        this.errorDiv.style.marginTop = '10px';
        this.errorDiv.style.textAlign = 'center';
        document.getElementById('loginForm').appendChild(this.errorDiv.cloneNode(true));
        document.getElementById('registerForm').appendChild(this.errorDiv.cloneNode(true));

        this.bindEvents();
        this.initAuthStateObserver();
    }

    showError(message, formId) {
        const errorDiv = document.querySelector(`#${formId} div[style*="color: #dc2626"]`);
        errorDiv.textContent = message;
        setTimeout(() => {
            errorDiv.textContent = '';
        }, 5000);
    }

    bindEvents() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchTab('register'));

        // Form submissions with error checking
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted'); // Debug log
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                console.log('Login successful:', userCredential.user.email); // Debug log
            } catch (error) {
                console.error('Login error:', error); // Debug log
                this.showError(error.message, 'loginForm');
            }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Register form submitted'); // Debug log

            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const firstName = document.getElementById('regFirstName').value;
            const lastName = document.getElementById('regLastName').value;

            try {
                console.log('Creating user with email:', email); // Debug log
                const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                console.log('User created:', userCredential.user.uid); // Debug log

                // Add user profile to Firestore
                await this.db.collection('users').doc(userCredential.user.uid).set({
                    firstName,
                    lastName,
                    email,
                    createdAt: new Date().toISOString()
                });
                console.log('User profile created in Firestore'); // Debug log
            } catch (error) {
                console.error('Registration error:', error); // Debug log
                this.showError(error.message, 'registerForm');
            }
        });

        // Logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    initAuthStateObserver() {
        this.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? user.email : 'signed out'); // Debug log
            
            const authContainer = document.getElementById('authContainer');
            const calendarContainer = document.getElementById('calendarContainer');
            const userEmailSpan = document.getElementById('userEmail');

            if (user) {
                authContainer.classList.remove('active');
                calendarContainer.classList.add('active');
                userEmailSpan.textContent = user.email;
                
                if (!window.calendar) {
                    window.calendar = new TimeTrackingCalendar();
                }
            } else {
                authContainer.classList.add('active');
                calendarContainer.classList.remove('active');
                userEmailSpan.textContent = '';
                window.calendar = null;
            }
        });
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
    }

    async logout() {
        try {
            await this.auth.signOut();
            console.log('User signed out successfully'); // Debug log
        } catch (error) {
            console.error('Logout error:', error); // Debug log
            alert('Error signing out: ' + error.message);
        }
    }
}

// Initialize auth manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing AuthManager'); // Debug log
    window.authManager = new AuthManager();
});