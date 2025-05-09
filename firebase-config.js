const firebaseConfig = {
    apiKey: "AIzaSyAq9DUyvi9d5lxlNCz3JjFEVqpt1uFKyKs",
    authDomain: "safewomen-b3cd6.firebaseapp.com",
    projectId: "safewomen-b3cd6",
    storageBucket: "safewomen-b3cd6.appspot.com",
    messagingSenderId: "203857390402",
    appId: "1:203857390402:web:0c9330a8834a627a3436db"
};

console.log('firebase-config.js loaded');

/**
 * Firebase initialization and configuration
 */

// Make sure Firebase is available
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK is not loaded! Make sure the Firebase scripts are included before this file.');
    // Create a global error that will be visible to users
    const errorMsg = 'Firebase SDK not loaded. Please check your internet connection and refresh the page.';
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '0';
            errorDiv.style.left = '0';
            errorDiv.style.right = '0';
            errorDiv.style.backgroundColor = '#ff6b6b';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '10px';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.zIndex = '9999';
            errorDiv.innerText = errorMsg;
            document.body.prepend(errorDiv);
        });
    }
    throw new Error(errorMsg);
}

// Initialize Firebase
try {
    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
        console.log('Initializing Firebase app with config:', JSON.stringify(firebaseConfig));
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } else {
        console.log('Firebase already initialized, using existing app');
        // Get the existing app
        firebase.app();
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    alert('Error initializing Firebase: ' + error.message);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configure auth for redirection and language
auth.useDeviceLanguage();

// Set persistence to LOCAL for better user experience
// This ensures the user stays logged in even after closing the browser tab
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Auth persistence successfully set to LOCAL');
    })
    .catch((error) => {
        console.error("Error setting auth persistence:", error);
        // If setting persistence fails, alert the user or try fallback to session persistence
        if (error.code === 'auth/invalid-persistence-type') {
            console.warn('Falling back to SESSION persistence');
            return auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }
    });
    
// Check if we're on the auth page to prevent redirection loops
const isAuthPage = window.location.pathname.includes('auth.html');
console.log('Current page is auth page:', isAuthPage);

// Enable offline persistence for Firestore to allow app to work offline
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log('Firestore persistence enabled with multi-tab synchronization');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open. Only one tab can use persistence at a time.');
        } else if (err.code === 'unimplemented') {
            console.log('Persistence not supported by current browser');
        } else {
            console.error('Error enabling Firestore persistence:', err);
        }
    }); 

// Monitor auth state changes for debugging with improved logging
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Auth state changed: User is signed in', user.uid);
        
        // Store user data in localStorage for access across pages
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email.split('@')[0])}&background=FF9A8B&color=fff`,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem('safeher_user', JSON.stringify(userData));
        console.log('User data saved to localStorage');
        
        // Try to update UI with user data
        try {
            updateUserInterface(userData);
        } catch (e) {
            console.warn('Could not update UI automatically, elements might not exist on this page', e);
        }
        
        // Check if we need to redirect to dashboard (only if not on any valid app pages)
        const validAppPages = ['dashboard.html', 'safety-map.html', 'live-tracker.html', 'community.html', 'chatbot.html'];
        const isOnValidPage = validAppPages.some(page => window.location.pathname.includes(page));
        
        if (!isAuthPage && !isOnValidPage) {
            console.log('User authenticated but not on a valid app page, redirecting to dashboard...');
            // Check for dashboard.html being nearby
            fetch('dashboard.html', { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        console.log('dashboard.html exists, redirecting...');
                        window.location.href = 'dashboard.html';
                    } else {
                        console.warn('dashboard.html not found at this path');
                    }
                })
                .catch(error => {
                    console.error('Error checking for dashboard.html:', error);
                });
        }
    } else {
        console.log('Auth state changed: User is signed out');
        // Clear user data from localStorage when signed out
        localStorage.removeItem('safeher_user');
        
        // If not on auth page, redirect to auth
        if (!isAuthPage) {
            console.log('User is not authenticated and not on auth page, redirecting to login');
            window.location.href = 'auth.html';
        }
    }
});

/**
 * Updates the user interface with user information
 * @param {Object} userData - The user data object
 */
function updateUserInterface(userData) {
    if (!userData) return;
    
    // Find user elements on the page
    const userNameElements = document.querySelectorAll('.user-name, .user-info h6');
    const userEmailElements = document.querySelectorAll('.user-email, .user-info small');
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    
    // Update user name elements
    userNameElements.forEach(element => {
        if (element) element.textContent = userData.displayName;
    });
    
    // Update user email elements
    userEmailElements.forEach(element => {
        if (element) element.textContent = userData.email;
    });
    
    // Update user avatar elements
    userAvatarElements.forEach(element => {
        if (element) element.src = userData.photoURL;
    });
    
    // Dispatch a custom event for other scripts to handle
    document.dispatchEvent(new CustomEvent('userDataUpdated', { 
        detail: userData 
    }));
}

// Check if user is logged in when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('safeher_user');
    if (userData) {
        try {
            // User is logged in, update UI
            updateUserInterface(JSON.parse(userData));
        } catch (e) {
            console.warn('Error parsing user data or updating UI:', e);
        }
    }
}); 













