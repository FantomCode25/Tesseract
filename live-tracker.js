/**
 * Live Tracker with Security Verification
 * 
 * This script implements a robust live tracking system with the following features:
 * - Numeric security code verification
 * - Real-time location tracking
 * - Periodic safety check-ins
 * - Emergency notifications for missed check-ins
 */

// Global variables
let map, marker, watchId, securityCode;
let safetyCheckInterval = 60000; // 1 minute in milliseconds
let countdownInterval;
let trackerActive = false;
let lastCheckInTime = null;
let userPath = [];
let pathLine;
let locationHistory = [];
let checkInCountdown = 0;
let failedAttempts = 0;
let isInitialized = false; // Add initialization tracking flag

// Configuration
const LOCATION_UPDATE_FREQUENCY = 10000; // 10 seconds
const MAX_FAILED_ATTEMPTS = 3;
const EMERGENCY_COUNTDOWN = 30; // seconds before alert after failed check-in
const CODE_LENGTH = 6; // length of security code (changed from 4 to 6)

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.warn('Live tracker already initialized, skipping duplicate initialization');
        return;
    }
    
    // Set initialization flag
    isInitialized = true;
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the Google Map
 */
function initMap() {
    console.log("Initializing map for live tracker...");
    
    // Skip if map is already initialized
    if (map) {
        console.log("Map already initialized, skipping");
        return;
    }
    
    // Default location (Bengaluru)
    const defaultLocation = { lat: 12.9716, lng: 77.5946 };
    
    // Get map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("Map container not found, cannot initialize map");
        return;
    }
    
    // Create the map
    try {
        map = new google.maps.Map(mapContainer, {
            center: defaultLocation,
            zoom: 15,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });
        
        // Create the marker (initially hidden)
        marker = new google.maps.Marker({
            position: defaultLocation,
            map: null, // Hide initially
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 2
            },
            title: "Your Location"
        });
        
        // Try to get the user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Center map on user's location
                    map.setCenter(userLocation);
                    marker.setPosition(userLocation);
                },
                error => {
                    console.warn("Error getting user location:", error);
                    showAlert("Location Error", "Could not get your current location. Default location is being used.");
                }
            );
        }
        
        // Create path line
        pathLine = new google.maps.Polyline({
            path: [],
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        
        console.log("Map initialization completed successfully");
    } catch (e) {
        console.error("Error initializing map:", e);
        showAlert("Map Error", "Could not initialize the map. Please try refreshing the page.");
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Start tracking button
    const startBtn = document.getElementById('startTracking');
    if (startBtn) {
        // Remove any existing listeners to prevent duplicates
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        
        // Add new listener
        newStartBtn.addEventListener('click', prepareTracking);
    }
    
    // Stop tracking button
    const stopBtn = document.getElementById('stopTracking');
    if (stopBtn) {
        // Remove any existing listeners to prevent duplicates
        const newStopBtn = stopBtn.cloneNode(true);
        stopBtn.parentNode.replaceChild(newStopBtn, stopBtn);
        
        // Add new listener
        newStopBtn.addEventListener('click', stopTracking);
    }
    
    // Setup security code button
    const setupCodeBtn = document.getElementById('setupCode');
    if (setupCodeBtn) {
        // Remove any existing listeners to prevent duplicates
        const newSetupCodeBtn = setupCodeBtn.cloneNode(true);
        setupCodeBtn.parentNode.replaceChild(newSetupCodeBtn, setupCodeBtn);
        
        // Add new listener
        newSetupCodeBtn.addEventListener('click', showSecurityCodeSetup);
    }
    
    // Setup emergency contacts button
    const setupContactsBtn = document.getElementById('setupContacts');
    if (setupContactsBtn) {
        // Remove any existing listeners to prevent duplicates
        const newSetupContactsBtn = setupContactsBtn.cloneNode(true);
        setupContactsBtn.parentNode.replaceChild(newSetupContactsBtn, setupContactsBtn);
        
        // Add new listener
        newSetupContactsBtn.addEventListener('click', showEmergencyContactSetup);
    }
    
    console.log('Live tracker event listeners set up successfully');
}

/**
 * Prepare tracking session by checking prerequisites
 */
function prepareTracking() {
    // Check if security code is set
    if (!localStorage.getItem('securityCode')) {
        showSecurityCodeSetup(true);
        return;
    }
    
    // Check if emergency contacts are set
    const contacts = getEmergencyContacts();
    if (!contacts || contacts.length === 0) {
        showEmergencyContactSetup(true);
        return;
    }
    
    // Start tracking
    startTracking();
}

/**
 * Show security code setup modal
 * @param {boolean} continueTracking - Whether to continue tracking after setup
 */
function showSecurityCodeSetup(continueTracking = false) {
    // Get the modal
    const modal = document.getElementById('securityCodeModal');
    
    // Add continue button if needed
    const actionContainer = document.getElementById('codeActionContainer');
    if (actionContainer) {
        if (continueTracking) {
            actionContainer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="saveCodeContinue">Save & Continue</button>
            `;
            
            // Add event listener for save and continue
            const continueBtn = document.getElementById('saveCodeContinue');
            if (continueBtn) {
                continueBtn.addEventListener('click', function() {
                    if (saveSecurityCode()) {
                        // Close the modal
                        const bsModal = bootstrap.Modal.getInstance(modal);
                        if (bsModal) {
                            bsModal.hide();
                        }
                        
                        // Continue with tracking
                        prepareTracking();
                    }
                });
            }
        } else {
            actionContainer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="saveCode">Save</button>
            `;
            
            // Add event listener for save
            const saveBtn = document.getElementById('saveCode');
            if (saveBtn) {
                saveBtn.addEventListener('click', saveSecurityCode);
            }
        }
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = document.getElementById('code1');
        if (firstInput) {
            firstInput.focus();
        }
    }, 500);
}

/**
 * Save the security code
 * @return {boolean} Whether the code was saved successfully
 */
function saveSecurityCode() {
    // Get code inputs
    const codeInputs = document.querySelectorAll('.code-input');
    let code = '';
    
    // Concatenate code digits
    codeInputs.forEach(input => {
        code += input.value;
    });
    
    // Validate code
    if (code.length !== CODE_LENGTH) {
        showCodeError(`Please enter a complete ${CODE_LENGTH}-digit code.`);
        return false;
    }
    
    if (!/^\d+$/.test(code)) {
        showCodeError('Security code must contain only numbers (0-9). Letters and special characters are not allowed.');
        return false;
    }
    
    // Save code
    localStorage.setItem('securityCode', code);
    securityCode = code;
    
    // Show success message
    const alertContainer = document.getElementById('codeAlert');
    if (alertContainer) {
        alertContainer.className = 'alert alert-success';
        alertContainer.textContent = 'Security code saved successfully!';
        alertContainer.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            alertContainer.style.display = 'none';
        }, 3000);
    }
    
    return true;
}

/**
 * Show an error in the code setup modal
 */
function showCodeError(message) {
    const alertContainer = document.getElementById('codeAlert');
    if (alertContainer) {
        alertContainer.className = 'alert alert-danger';
        alertContainer.textContent = message;
        alertContainer.style.display = 'block';
    }
}

/**
 * Show emergency contact setup modal
 * @param {boolean} continueTracking - Whether to continue tracking after setup
 */
function showEmergencyContactSetup(continueTracking = false) {
    // Get the modal
    const modal = document.getElementById('emergencyContactModal');
    
    // Add continue button if needed
    const actionContainer = document.getElementById('contactActionContainer');
    if (actionContainer && continueTracking) {
        actionContainer.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="continueTracking">Save & Continue</button>
        `;
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Start tracking the user's location
 */
function startTracking() {
    // Check if already tracking
    if (trackerActive) {
        console.warn('Tracking already active, ignoring duplicate start request');
        return;
    }
    
    console.log('Starting live tracking...');
    
    // Load security code
    securityCode = localStorage.getItem('securityCode');
    if (!securityCode) {
        showAlert('Setup Required', 'Please set up your security code first.');
        showSecurityCodeSetup(true);
        return;
    }
    
    // Check if we have emergency contacts
    const contacts = getEmergencyContacts();
    if (!contacts || contacts.length === 0) {
        showAlert('Setup Required', 'Please set up at least one emergency contact.');
        showEmergencyContactSetup(true);
        return;
    }
    
    // Start tracking
    trackerActive = true;
    userPath = [];
    locationHistory = [];
    lastCheckInTime = new Date();
    failedAttempts = 0;

            // Update UI
    updateTrackingUI(true);
    
    // Show marker
    marker.setMap(map);
    
    // Clear existing path
    pathLine.setPath([]);
    pathLine.setMap(map);
    
    // Clear any existing geolocation watches
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    
    // Clear any existing countdown timers
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Start watching location
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            updateLocation,
            handleLocationError,
                {
                    enableHighAccuracy: true,
                timeout: 30000,
                    maximumAge: 0
                }
            );
        
        // Set up safety check timer
        setupSafetyCheck();
        
        // Log start time
        console.log('Tracking started at', new Date().toLocaleTimeString());
    } else {
        showAlert('Error', 'Geolocation is not supported by your browser.');
        stopTracking();
    }
}

/**
 * Update the tracking UI
 * @param {boolean} isTracking - Whether tracking is active
 */
function updateTrackingUI(isTracking) {
    // Update buttons
    const startBtn = document.getElementById('startTracking');
    const stopBtn = document.getElementById('stopTracking');
    const setupCodeBtn = document.getElementById('setupCode');
    const setupContactsBtn = document.getElementById('setupContacts');
    
    if (startBtn) startBtn.style.display = isTracking ? 'none' : 'block';
    if (stopBtn) stopBtn.style.display = isTracking ? 'block' : 'none';
    if (setupCodeBtn) setupCodeBtn.disabled = isTracking;
    if (setupContactsBtn) setupContactsBtn.disabled = isTracking;
    
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
        statusIndicator.className = isTracking ? 'status-indicator active' : 'status-indicator';
        statusIndicator.innerHTML = isTracking ? 
            '<i class="fas fa-broadcast-tower"></i> LIVE' : 
            '<i class="fas fa-power-off"></i> OFFLINE';
    }
    
    // Update tracking info panel
    const trackingInfo = document.getElementById('trackingInfo');
    if (trackingInfo) {
        trackingInfo.style.display = isTracking ? 'block' : 'none';
    }
}

/**
 * Update location based on geolocation data
 */
function updateLocation(position) {
    // Get current location
    const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

    // Update marker position
    marker.setPosition(currentLocation);
    
    // Center map if this is the first update
    if (userPath.length === 0) {
        map.setCenter(currentLocation);
    }
    
    // Add to path
    userPath.push(currentLocation);
    pathLine.setPath(userPath);
    
    // Store location with timestamp
    locationHistory.push({
        location: currentLocation,
        timestamp: new Date(),
        accuracy: position.coords.accuracy
    });
    
    // Update tracking info
    updateTrackingInfo(position);
}

/**
 * Update tracking information display
 */
function updateTrackingInfo(position) {
    if (!position) return;
    
    // Format current time
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    // Calculate time since last check-in
    let timeSinceCheckIn = '';
    if (lastCheckInTime) {
        const diffMs = now - lastCheckInTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        timeSinceCheckIn = `${diffMins}m ${diffSecs}s`;
    }
    
    // Update info elements
    const timeElement = document.getElementById('currentTime');
    const coordsElement = document.getElementById('currentCoords');
    const accuracyElement = document.getElementById('locationAccuracy');
    const lastCheckElement = document.getElementById('lastCheckIn');
    const nextCheckElement = document.getElementById('nextCheckIn');
    
    if (timeElement) timeElement.textContent = timeString;
    if (coordsElement) coordsElement.textContent = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    if (accuracyElement) accuracyElement.textContent = `±${Math.round(position.coords.accuracy)} meters`;
    if (lastCheckElement && lastCheckInTime) lastCheckElement.textContent = lastCheckInTime.toLocaleTimeString();
    if (nextCheckElement) nextCheckElement.textContent = `${timeSinceCheckIn} / 1m 0s`;
}

/**
 * Handle geolocation errors
 */
function handleLocationError(error) {
    console.error('Geolocation error:', error);
    
    let errorMessage;
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied. Please enable location permissions.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please check your device settings.";
            break;
        case error.TIMEOUT:
            errorMessage = "The request to get location timed out. Please try again.";
            break;
        default:
            errorMessage = "An unknown error occurred while trying to get your location.";
    }
    
    showAlert('Location Error', errorMessage);
    
    // If we can't get location, stop tracking
    if (trackerActive) {
        stopTracking();
    }
}

/**
 * Set up safety check timer
 */
function setupSafetyCheck() {
    // Clear existing timers
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Set up countdown timer
    const checkInterval = safetyCheckInterval / 1000; // Convert to seconds
    checkInCountdown = checkInterval;
    
    countdownInterval = setInterval(() => {
        // Update countdown
        checkInCountdown--;
        
        // Update UI
        const nextCheckElement = document.getElementById('nextCheckIn');
        if (nextCheckElement) {
            const minutes = Math.floor(checkInCountdown / 60);
            const seconds = checkInCountdown % 60;
            
            // Get time since last check
            const now = new Date();
            const diffMs = now - lastCheckInTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);
            
            nextCheckElement.textContent = `${diffMins}m ${diffSecs}s / ${minutes}m ${seconds}s`;
            
            // Highlight when close to next check-in
            if (checkInCountdown <= 10) {
                nextCheckElement.className = 'text-danger';
            } else if (checkInCountdown <= 30) {
                nextCheckElement.className = 'text-warning';
            } else {
                nextCheckElement.className = '';
            }
        }
        
        // If it's time for a check-in
        if (checkInCountdown <= 0) {
            // Request check-in
            requestSafetyCheckIn();
            
            // Reset countdown
            checkInCountdown = checkInterval;
        }
    }, 1000);
}

/**
 * Request a safety check-in from the user
 */
function requestSafetyCheckIn() {
    // Play alert sound
    const alertSound = document.getElementById('alertSound');
    if (alertSound) {
        alertSound.play().catch(e => console.warn('Could not play alert sound:', e));
    }
    
    // Show verification modal
    const modal = document.getElementById('verificationModal');
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Set up countdown for emergency
    let countdown = EMERGENCY_COUNTDOWN;
    const countdownElement = document.getElementById('verificationCountdown');
    
    // Clear inputs
    const codeInputs = document.querySelectorAll('.verification-input');
    codeInputs.forEach(input => {
        input.value = '';
    });
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = document.getElementById('verify1');
        if (firstInput) {
            firstInput.focus();
        }
    }, 500);
    
    // Start emergency countdown
    const emergencyTimer = setInterval(() => {
        countdown--;
        
        if (countdownElement) {
            countdownElement.textContent = countdown;
            
            // Update styling
            if (countdown <= 10) {
                countdownElement.className = 'text-danger';
            } else if (countdown <= 20) {
                countdownElement.className = 'text-warning';
            }
        }
        
        // If time runs out, trigger emergency
        if (countdown <= 0) {
            clearInterval(emergencyTimer);
            
            // Close modal
            const verificationModal = bootstrap.Modal.getInstance(modal);
            if (verificationModal) {
                verificationModal.hide();
            }
            
            // Trigger emergency
            handleFailedVerification("No response to safety check");
        }
    }, 1000);
    
    // Store timer reference in modal to clear it if the modal is dismissed
    modal._emergencyTimer = emergencyTimer;
    
    // Set up verify button
    const verifyBtn = document.getElementById('verifyCode');
    if (verifyBtn) {
        // Remove existing listeners
        const newVerifyBtn = verifyBtn.cloneNode(true);
        verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
        
        // Add new listener
        newVerifyBtn.addEventListener('click', () => {
            // Get entered code
            let enteredCode = '';
            codeInputs.forEach(input => {
                enteredCode += input.value;
            });
            
            // Verify code
            if (enteredCode === securityCode) {
                // Success - clear timer
                clearInterval(emergencyTimer);
                
                // Update last check-in time
                lastCheckInTime = new Date();
                
                // Reset failed attempts
                failedAttempts = 0;
                
                // Close modal
                const verificationModal = bootstrap.Modal.getInstance(modal);
                if (verificationModal) {
                    verificationModal.hide();
                }
                
                // Show success notification
                showAlert('Check-In Successful', 'Safety check-in confirmed. Tracking continues.', 'success');
            } else {
                // Failure - increment attempts
                failedAttempts++;
                
                // Show error
                const errorElement = document.getElementById('verificationError');
                if (errorElement) {
                    errorElement.textContent = `Incorrect code. ${MAX_FAILED_ATTEMPTS - failedAttempts} attempts remaining.`;
                    errorElement.style.display = 'block';
                }
                
                // Clear inputs
                codeInputs.forEach(input => {
                    input.value = '';
                });
                
                // Focus on first input
                const firstInput = document.getElementById('verify1');
                if (firstInput) {
                    firstInput.focus();
                }
                
                // If too many failed attempts, trigger emergency
                if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                    // Clear timer
                    clearInterval(emergencyTimer);
                    
                    // Close modal
                    const verificationModal = bootstrap.Modal.getInstance(modal);
                    if (verificationModal) {
                        verificationModal.hide();
                    }
                    
                    // Trigger emergency
                    handleFailedVerification("Multiple incorrect code entries");
                }
            }
        });
    }
    
    // Setup cancel button
    const cancelBtn = document.getElementById('cancelVerification');
    if (cancelBtn) {
        // Remove existing listeners
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Add new listener
        newCancelBtn.addEventListener('click', () => {
            // Clear timer
            clearInterval(emergencyTimer);
            
            // Handle as failed verification
            handleFailedVerification("User canceled verification");
        });
    }
    
    // Handle modal close event
    modal.addEventListener('hidden.bs.modal', () => {
        // Clear the emergency timer if it exists
        if (modal._emergencyTimer) {
            clearInterval(modal._emergencyTimer);
        }
    });
}

/**
 * Handle a failed verification attempt
 */
function handleFailedVerification(reason) {
    console.warn('Verification failed:', reason);
    
    // Send emergency alerts
    sendEmergencyAlerts(reason);
    
    // Continue tracking but update UI to show alert status
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator emergency';
        statusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ALERT SENT';
    }
    
    // Show alert on screen
    showAlert('EMERGENCY ALERT SENT', 'Your emergency contacts have been notified of a potential safety concern.', 'danger', false);
}

/**
 * Send emergency alerts to contacts
 */
function sendEmergencyAlerts(reason) {
    // Get contacts
    const contacts = getEmergencyContacts();
    if (!contacts || contacts.length === 0) {
        console.error('No emergency contacts found');
        return;
    }
    
    // Get last known location
    let lastLocation = null;
    if (locationHistory.length > 0) {
        lastLocation = locationHistory[locationHistory.length - 1].location;
    }
    
    // Create emergency data
    const emergencyData = {
        reason: reason,
        timestamp: new Date().toISOString(),
        location: lastLocation,
        locationHistory: locationHistory,
        contacts: contacts
    };
    
    // Log emergency data
    console.log('EMERGENCY ALERT TRIGGERED:', emergencyData);
    
    // In a real application, this would make API calls to a server
    // which would send SMS, push notifications, or call emergency contacts
    
    // Simulate server request
    const alertUrl = 'https://example.com/api/emergency-alert';
    
    // For demonstration purposes only - in production, use a real API endpoint
    console.log(`Would send emergency data to ${alertUrl}:`, emergencyData);
    
    // Create simulated response for demo purposes
    setTimeout(() => {
        // Simulate successful alert sending
        console.log('Emergency alerts sent successfully to:', contacts.map(c => c.name).join(', '));
        
        // Update sent status for UI
        document.getElementById('alertStatus').innerHTML = 'Alert sent to ' + contacts.length + ' contacts';
    }, 2000);
}

/**
 * Get emergency contacts from storage
 */
function getEmergencyContacts() {
    try {
        return JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
    } catch (e) {
        console.error('Error loading emergency contacts:', e);
        return [];
    }
}

/**
 * Stop tracking the user's location
 */
function stopTracking() {
    console.log('Stopping live tracking...');

    // If not tracking, just return
    if (!trackerActive) {
        console.warn('No active tracking session to stop');
        return;
    }
    
    // Clear watch
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // Clear timers
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // Close any open verification modals
    try {
        const verificationModal = document.getElementById('verificationModal');
        if (verificationModal) {
            const bsModal = bootstrap.Modal.getInstance(verificationModal);
            if (bsModal) {
                bsModal.hide();
            }
            
            // Clear any emergency timers
            if (verificationModal._emergencyTimer) {
                clearInterval(verificationModal._emergencyTimer);
                verificationModal._emergencyTimer = null;
            }
        }
    } catch (e) {
        console.error('Error closing verification modal:', e);
    }
    
    // Update state
    trackerActive = false;
    
    // Update UI
    updateTrackingUI(false);
    
    // Hide marker
    if (marker) {
        marker.setMap(null);
    }
    
    // Keep location history for records until page reload
    // but clear the active path display
    if (pathLine) {
        pathLine.setPath([]);
        pathLine.setMap(null);
    }
    
    // Log stop time
    console.log('Tracking stopped at', new Date().toLocaleTimeString());
    console.log('Total locations recorded:', locationHistory.length);
    
    // Show confirmation message to user
    showAlert('Tracking Ended', 'Your safety tracking session has been stopped.', 'info');
}

/**
 * Show an alert to the user
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, warning, danger, info)
 * @param {boolean} autoClose - Whether to auto-close the alert
 */
function showAlert(title, message, type = 'warning', autoClose = true) {
    // Get alert container
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    
    // Create alert element
    const alertId = 'alert-' + Date.now();
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.id = alertId;
    alertElement.role = 'alert';
    
    // Set content
    alertElement.innerHTML = `
        <strong>${title}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    alertsContainer.appendChild(alertElement);
    
    // Auto-close after delay
    if (autoClose) {
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                // Use Bootstrap's alert dismiss
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

/**
 * Setup code input auto-progression
 */
function setupCodeInputs() {
    // Get all code inputs
    const codeInputs = document.querySelectorAll('.code-input, .verification-input');
    
    codeInputs.forEach((input, index) => {
        // Add focus styling
        input.addEventListener('focus', function() {
            this.select();
        });
        
        // Add input handling
        input.addEventListener('input', function() {
            // Ensure only numbers
            this.value = this.value.replace(/\D/g, '');
            
            // Auto-advance to next input
            if (this.value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        });
        
        // Add keydown handling
        input.addEventListener('keydown', function(e) {
            // Allow backspace to go back
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
    });
}

// Call setupCodeInputs when document is ready
document.addEventListener('DOMContentLoaded', setupCodeInputs); 