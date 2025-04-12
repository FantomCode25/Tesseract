/**
 * Security Code Verification Module
 * 
 * This module handles the safety verification system with:
 * - Numeric security code setup
 * - Periodic verification requirements
 * - Emergency triggers for failed verifications
 */

// Constants
const STORAGE_KEY_SECURITY_CODE = 'securityCode';
const STORAGE_KEY_CHECK_INTERVAL = 'checkInterval';
const STORAGE_KEY_LAST_VERIFIED = 'lastVerified';
const VERIFICATION_COUNTDOWN_SECONDS = 30;
const MAX_FAILED_ATTEMPTS = 3;

// Global variables
let securityCode = null;
let safetyCheckInterval = 5 * 60 * 1000; // Default: 5 minutes in milliseconds
let checkIntervalMinutes = 5; // Default: 5 minutes
let verificationCountdown = null;
let verificationTimeout = null;
let lastVerifiedTime = null;
let failedAttempts = 0;
let verificationModal = null;
let trackerActive = false;

/**
 * Initialize the security code module
 */
function initSecurityCodeModule() {
    console.log('Initializing security code module');
    
    // Load security settings from storage
    loadSecuritySettings();
    
    // Get reference to the verification modal
    verificationModal = new bootstrap.Modal(document.getElementById('securityVerificationModal'));
    
    // Add event listeners
    document.getElementById('travelDetailsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }
        
        // Show emergency contacts modal first
        const contactsModal = new bootstrap.Modal(document.getElementById('emergencyContactModal'));
        contactsModal.show();
        
        // Listen for save contacts button
        document.getElementById('saveContacts').addEventListener('click', function() {
            contactsModal.hide();
            // After contacts are saved, show security code setup
            showSecurityCodeSetupModal();
        });
    });
    
    // Set up the security code submission handler
    document.getElementById('securityCodeSetupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleSecurityCodeSetup();
    });
    
    // Set up verification form submission handler
    document.getElementById('securityVerificationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleSecurityVerification();
    });
    
    // Listen for end tracking button
    document.getElementById('endTracking').addEventListener('click', endTracking);
}

/**
 * Load security settings from localStorage
 */
function loadSecuritySettings() {
    // Try to load security code
    const savedCode = localStorage.getItem(STORAGE_KEY_SECURITY_CODE);
    if (savedCode) {
        securityCode = savedCode;
        console.log('Loaded saved security code');
    }
    
    // Try to load check interval
    const savedInterval = localStorage.getItem(STORAGE_KEY_CHECK_INTERVAL);
    if (savedInterval) {
        checkIntervalMinutes = parseInt(savedInterval);
        safetyCheckInterval = checkIntervalMinutes * 60 * 1000;
        console.log(`Loaded saved check interval: ${checkIntervalMinutes} minutes`);
    }
    
    // Try to load last verified time
    const savedLastVerified = localStorage.getItem(STORAGE_KEY_LAST_VERIFIED);
    if (savedLastVerified) {
        lastVerifiedTime = new Date(parseInt(savedLastVerified));
        console.log(`Last verified: ${lastVerifiedTime}`);
    }
}

/**
 * Show the security code setup modal
 */
function showSecurityCodeSetupModal() {
    const securityModal = new bootstrap.Modal(document.getElementById('securityCodeModal'));
    securityModal.show();
}

/**
 * Handle security code setup form submission
 */
function handleSecurityCodeSetup() {
    const codeInput = document.getElementById('securityCodeInput');
    const intervalInput = document.getElementById('checkIntervalInput');
    const errorElement = document.getElementById('securityCodeError');
    
    // Validate numeric code
    const code = codeInput.value.trim();
    const interval = parseInt(intervalInput.value);
    
    // Validate code is numeric
    if (!/^\d+$/.test(code)) {
        errorElement.textContent = 'Security code must contain only numbers.';
        errorElement.classList.remove('d-none');
        return;
    }
    
    // Validate code length
    if (code.length < 4 || code.length > 8) {
        errorElement.textContent = 'Security code must be 4-8 digits long.';
        errorElement.classList.remove('d-none');
        return;
    }
    
    // Validate interval
    if (isNaN(interval) || interval < 1 || interval > 60) {
        errorElement.textContent = 'Check interval must be between 1 and 60 minutes.';
        errorElement.classList.remove('d-none');
        return;
    }
    
    // Save security code and interval
    securityCode = code;
    checkIntervalMinutes = interval;
    safetyCheckInterval = checkIntervalMinutes * 60 * 1000;
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEY_SECURITY_CODE, securityCode);
    localStorage.setItem(STORAGE_KEY_CHECK_INTERVAL, checkIntervalMinutes);
    
    // Record verification time
    lastVerifiedTime = new Date();
    localStorage.setItem(STORAGE_KEY_LAST_VERIFIED, lastVerifiedTime.getTime().toString());
    
    // Hide the modal
    const securityModal = bootstrap.Modal.getInstance(document.getElementById('securityCodeModal'));
    securityModal.hide();
    
    // Start tracking
    startTracking();
    
    // Show success notification
    showNotification('Security Code Set', 'Your tracking session has started successfully.');
    
    // Update the tracking code display (show last two digits only)
    const trackingCodeDisplay = document.getElementById('trackingCode');
    if (trackingCodeDisplay) {
        const maskedCode = '••••' + securityCode.slice(-2);
        trackingCodeDisplay.textContent = maskedCode;
    }
    
    console.log(`Security code set with check interval of ${checkIntervalMinutes} minutes`);
}

/**
 * Start the security verification system
 */
function startSecurityChecks() {
    trackerActive = true;
    
    // Schedule the first check
    scheduleNextCheck();
    
    // Update UI
    updateCheckCountdown();
}

/**
 * Schedule the next security check
 */
function scheduleNextCheck() {
    // Clear any existing timeout
    if (verificationTimeout) {
        clearTimeout(verificationTimeout);
    }
    
    // Calculate time until next check
    const now = new Date();
    const timeSinceLastCheck = lastVerifiedTime ? now - lastVerifiedTime : 0;
    const timeUntilNextCheck = Math.max(0, safetyCheckInterval - timeSinceLastCheck);
    
    console.log(`Next check in ${Math.round(timeUntilNextCheck / 1000)} seconds`);
    
    // Schedule next check
    verificationTimeout = setTimeout(promptForVerification, timeUntilNextCheck);
}

/**
 * Update the check-in countdown display
 */
function updateCheckCountdown() {
    if (!trackerActive) return;
    
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return;
    
    const now = new Date();
    const timeSinceLastCheck = lastVerifiedTime ? now - lastVerifiedTime : 0;
    const timeUntilNextCheck = Math.max(0, safetyCheckInterval - timeSinceLastCheck);
    
    // Format as minutes:seconds
    const minutes = Math.floor(timeUntilNextCheck / 60000);
    const seconds = Math.floor((timeUntilNextCheck % 60000) / 1000);
    
    countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Schedule the next update
    setTimeout(updateCheckCountdown, 1000);
}

/**
 * Prompt the user for security verification
 */
function promptForVerification() {
    // Play alert sound
    const alertSound = document.getElementById('alertSound');
    if (alertSound) {
        alertSound.play().catch(error => console.warn('Error playing sound:', error));
    }
    
    // Reset verification countdown
    const countdownElement = document.getElementById('verificationCountdown');
    if (countdownElement) {
        countdownElement.textContent = VERIFICATION_COUNTDOWN_SECONDS.toString();
    }
    
    // Clear any previous verification errors
    const errorElement = document.getElementById('verificationError');
    if (errorElement) {
        errorElement.classList.add('d-none');
    }
    
    // Clear the verification input
    const verificationInput = document.getElementById('verificationCodeInput');
    if (verificationInput) {
        verificationInput.value = '';
    }
    
    // Show the verification modal
    verificationModal.show();
    
    // Start the countdown
    startVerificationCountdown();
    
    // Log the verification request
    logCheckInRequest();
}

/**
 * Start the verification countdown timer
 */
function startVerificationCountdown() {
    let secondsRemaining = VERIFICATION_COUNTDOWN_SECONDS;
    const countdownElement = document.getElementById('verificationCountdown');
    
    if (verificationCountdown) {
        clearInterval(verificationCountdown);
    }
    
    verificationCountdown = setInterval(() => {
        secondsRemaining--;
        
        if (countdownElement) {
            countdownElement.textContent = secondsRemaining.toString();
        }
        
        if (secondsRemaining <= 0) {
            clearInterval(verificationCountdown);
            handleVerificationTimeout();
        }
    }, 1000);
}

/**
 * Handle verification form submission
 */
function handleSecurityVerification() {
    const verificationInput = document.getElementById('verificationCodeInput');
    const errorElement = document.getElementById('verificationError');
    
    if (!verificationInput || !errorElement) return;
    
    const enteredCode = verificationInput.value.trim();
    
    // Check if the entered code matches
    if (enteredCode === securityCode) {
        // Success - stop the countdown
        clearInterval(verificationCountdown);
        
        // Update last verified time
        lastVerifiedTime = new Date();
        localStorage.setItem(STORAGE_KEY_LAST_VERIFIED, lastVerifiedTime.getTime().toString());
        
        // Hide the modal
        verificationModal.hide();
        
        // Reset failed attempts
        failedAttempts = 0;
        
        // Schedule the next check
        scheduleNextCheck();
        
        // Log the successful verification
        logVerificationSuccess();
        
        // Show success notification
        showNotification('Verification Complete', 'Thank you for confirming your safety.');
    } else {
        // Failed verification
        failedAttempts++;
        
        // Show error
        errorElement.textContent = `Incorrect code. ${MAX_FAILED_ATTEMPTS - failedAttempts} attempts remaining.`;
        errorElement.classList.remove('d-none');
        
        // If max attempts reached, trigger emergency
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            handleVerificationTimeout();
        }
        
        // Log the failed attempt
        logVerificationFailure();
    }
}

/**
 * Handle verification timeout or max failed attempts
 */
function handleVerificationTimeout() {
    // Stop the countdown
    clearInterval(verificationCountdown);
    
    // Hide the modal
    verificationModal.hide();
    
    // Log the missed verification
    logVerificationMissed();
    
    // Trigger emergency alert
    triggerEmergencyAlert();
}

/**
 * Trigger emergency alert
 */
function triggerEmergencyAlert() {
    // Get the current location
    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            
            // Prepare emergency message with location
            const emergencyMessage = {
                type: 'emergency',
                reason: failedAttempts >= MAX_FAILED_ATTEMPTS ? 'incorrect_code' : 'timeout',
                timestamp: new Date().toISOString(),
                location: { latitude, longitude },
                userId: firebase.auth().currentUser?.uid || 'unknown'
            };
            
            console.log('Triggering emergency alert:', emergencyMessage);
            
            // Send emergency notifications to all emergency contacts
            sendEmergencyNotifications(emergencyMessage);
            
            // Show alert notification
            showNotification('Emergency Alert Sent', 'Your emergency contacts have been notified about your safety concern.');
        })
        .catch(error => {
            console.error('Error getting position for emergency:', error);
            
            // Still try to send alert even without location
            const emergencyMessage = {
                type: 'emergency',
                reason: failedAttempts >= MAX_FAILED_ATTEMPTS ? 'incorrect_code' : 'timeout',
                timestamp: new Date().toISOString(),
                location: null,
                userId: firebase.auth().currentUser?.uid || 'unknown'
            };
            
            sendEmergencyNotifications(emergencyMessage);
        });
}

/**
 * Log verification events
 */
function logCheckInRequest() {
    console.log(`Security verification requested at ${new Date().toISOString()}`);
    // In a real app, you would log this to the server
}

function logVerificationSuccess() {
    console.log(`Security verification successful at ${new Date().toISOString()}`);
    // In a real app, you would log this to the server
}

function logVerificationFailure() {
    console.log(`Security verification failed (attempt ${failedAttempts}) at ${new Date().toISOString()}`);
    // In a real app, you would log this to the server
}

function logVerificationMissed() {
    console.log(`Security verification missed at ${new Date().toISOString()}`);
    // In a real app, you would log this to the server
}

/**
 * End tracking session
 */
function endTracking() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to end your tracking session?')) {
        // Stop tracking
        trackerActive = false;
        
        // Clear timeouts and intervals
        if (verificationTimeout) {
            clearTimeout(verificationTimeout);
        }
        
        if (verificationCountdown) {
            clearInterval(verificationCountdown);
        }
        
        // Reset UI to initial state
        const initialForm = document.getElementById('initialForm');
        const trackingView = document.getElementById('trackingView');
        
        if (initialForm && trackingView) {
            trackingView.style.display = 'none';
            initialForm.style.display = 'block';
        }
        
        // Clear form
        document.getElementById('travelDetailsForm').reset();
        document.getElementById('travelDetailsForm').classList.remove('was-validated');
        
        // Clear security code
        securityCode = null;
        failedAttempts = 0;
        lastVerifiedTime = null;
        
        // Show end notification
        showNotification('Tracking Ended', 'Your tracking session has ended successfully.');
    }
}

// Initialize the module when DOM is ready
document.addEventListener('DOMContentLoaded', initSecurityCodeModule); 