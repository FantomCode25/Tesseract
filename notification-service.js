/**
 * Emergency Notification Service
 * 
 * This module handles sending emergency notifications to saved contacts
 * and provides functions for managing contacts and alert preferences.
 */

// Global variables
let emergencyContacts = [];
let lastNotificationTimestamp = null;
const MIN_NOTIFICATION_INTERVAL = 60000; // Minimum interval between notifications (1 minute)

// Storage keys
const CONTACTS_STORAGE_KEY = 'emergencyContacts';
const ALERT_HISTORY_KEY = 'alertHistory';

/**
 * Initialize the notification service
 */
function initNotificationService() {
    // Load contacts from storage
    loadEmergencyContacts();
    
    // Set up event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const addContactBtn = document.getElementById('addContactBtn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', addContactField);
        }
        
        const saveContactsBtn = document.getElementById('saveContactsBtn');
        if (saveContactsBtn) {
            saveContactsBtn.addEventListener('click', saveEmergencyContacts);
        }
        
        // Handle test alert button if exists
        const testAlertBtn = document.getElementById('testAlertBtn');
        if (testAlertBtn) {
            testAlertBtn.addEventListener('click', sendTestAlert);
        }
    });
}

/**
 * Load emergency contacts from localStorage
 */
function loadEmergencyContacts() {
    const storedContacts = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (storedContacts) {
        try {
            emergencyContacts = JSON.parse(storedContacts);
            console.log('Loaded emergency contacts:', emergencyContacts.length);
        } catch (error) {
            console.error('Error parsing stored contacts:', error);
            emergencyContacts = [];
        }
    }
}

/**
 * Save emergency contacts to localStorage
 */
function saveEmergencyContacts() {
    // Collect contacts from form if it exists
    const contactsForm = document.getElementById('emergencyContactsForm');
    if (contactsForm) {
        const formContacts = [];
        const rows = contactsForm.querySelectorAll('.contact-row');
        
        rows.forEach(row => {
            const nameInput = row.querySelector('input[name^="contactName"]');
            const phoneInput = row.querySelector('input[name^="contactPhone"]');
            const relationInput = row.querySelector('select[name^="contactRelation"]');
            
            if (nameInput && phoneInput && nameInput.value.trim() && phoneInput.value.trim()) {
                formContacts.push({
                    name: nameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    relation: relationInput ? relationInput.value : 'other',
                    id: Date.now() + Math.random().toString(36).substr(2, 5)
                });
            }
        });
        
        if (formContacts.length > 0) {
            emergencyContacts = formContacts;
        }
    }
    
    // Save to localStorage
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(emergencyContacts));
    
    // Show confirmation
    showToast('Contacts Saved', `${emergencyContacts.length} emergency contacts have been saved`);
    
    // Hide modal if it exists
    const contactModal = document.getElementById('emergencyContactModal');
    if (contactModal && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getInstance(contactModal);
        if (bsModal) {
            bsModal.hide();
        }
    }
    
    // Validate if we have enough contacts to start tracking
    validateRequirementsForTracking();
    
    return emergencyContacts.length > 0;
}

/**
 * Add a new contact field to the form
 */
function addContactField() {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    
    const contactCount = contactsList.querySelectorAll('.contact-row').length;
    const newIndex = contactCount + 1;
    
    const contactRow = document.createElement('div');
    contactRow.className = 'contact-row mb-3 p-3 border rounded';
    contactRow.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Contact #${newIndex}</h6>
            <button type="button" class="btn btn-sm btn-outline-danger remove-contact">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="row g-2">
            <div class="col-md-5 mb-2">
                <label for="contactName${newIndex}" class="form-label">Name</label>
                <input type="text" class="form-control" id="contactName${newIndex}" name="contactName${newIndex}" placeholder="Full Name" required>
            </div>
            <div class="col-md-4 mb-2">
                <label for="contactPhone${newIndex}" class="form-label">Phone Number</label>
                <input type="tel" class="form-control" id="contactPhone${newIndex}" name="contactPhone${newIndex}" placeholder="+91 9999999999" required>
            </div>
            <div class="col-md-3 mb-2">
                <label for="contactRelation${newIndex}" class="form-label">Relation</label>
                <select class="form-select" id="contactRelation${newIndex}" name="contactRelation${newIndex}">
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="colleague">Colleague</option>
                    <option value="other">Other</option>
                </select>
            </div>
        </div>
    `;
    
    contactsList.appendChild(contactRow);
    
    // Add event listener to remove button
    const removeBtn = contactRow.querySelector('.remove-contact');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            contactRow.remove();
            // Renumber the contacts
            const rows = contactsList.querySelectorAll('.contact-row');
            rows.forEach((row, index) => {
                const heading = row.querySelector('h6');
                if (heading) {
                    heading.textContent = `Contact #${index + 1}`;
                }
            });
        });
    }
    
    // Focus on the name field
    const nameInput = contactRow.querySelector(`#contactName${newIndex}`);
    if (nameInput) {
        nameInput.focus();
    }
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
function validatePhoneNumber(phone) {
    // Basic validation - should be improved for production
    // Allows +, spaces, and digits, minimum 10 digits
    const phoneRegex = /^[+\d\s]{10,}$/;
    return phoneRegex.test(phone);
}

/**
 * Get all emergency contacts
 * @returns {Array} Array of emergency contact objects
 */
function getEmergencyContacts() {
    if (emergencyContacts.length === 0) {
        loadEmergencyContacts();
    }
    return emergencyContacts;
}

/**
 * Check if we have emergency contacts set up
 * @returns {boolean} Whether contacts are set up
 */
function hasEmergencyContacts() {
    return getEmergencyContacts().length > 0;
}

/**
 * Validate if all requirements are met for tracking
 * @returns {boolean} Whether all requirements are met
 */
function validateRequirementsForTracking() {
    const hasContacts = hasEmergencyContacts();
    const hasSecurityCode = localStorage.getItem('securityCode') !== null;
    
    const startTrackingBtn = document.getElementById('startTrackingBtn');
    if (startTrackingBtn) {
        if (hasContacts && hasSecurityCode) {
            startTrackingBtn.disabled = false;
            startTrackingBtn.title = 'Start live tracking';
        } else {
            startTrackingBtn.disabled = true;
            startTrackingBtn.title = hasContacts ? 
                'Please set up a security code first' : 
                'Please add at least one emergency contact';
        }
    }
    
    return hasContacts && hasSecurityCode;
}

/**
 * Send emergency alerts to all contacts
 * @param {Object} alertData - Data about the emergency
 */
function sendEmergencyAlerts(alertData) {
    const contacts = getEmergencyContacts();
    
    if (contacts.length === 0) {
        console.error('No emergency contacts found');
        showToast('Alert Failed', 'No emergency contacts found to send alerts to', 'error');
        return;
    }
    
    // Check if we've sent alerts too recently
    const now = Date.now();
    if (lastNotificationTimestamp && (now - lastNotificationTimestamp < MIN_NOTIFICATION_INTERVAL)) {
        console.log('Skipping alert, too soon after last notification');
        return;
    }
    
    // Update last notification time
    lastNotificationTimestamp = now;
    
    // Prepare alert message
    const location = typeof alertData.location === 'object' ? 
        `${alertData.location.latitude}, ${alertData.location.longitude}` : 
        'Unknown location';
    
    const reason = alertData.reason || 'Unknown reason';
    
    // Get Google Maps URL if we have coordinates
    let mapsUrl = '';
    if (typeof alertData.location === 'object') {
        mapsUrl = `https://www.google.com/maps?q=${alertData.location.latitude},${alertData.location.longitude}`;
    }
    
    // Compose message
    const message = `EMERGENCY ALERT: ${reason}. Location: ${location} ${mapsUrl ? `View map: ${mapsUrl}` : ''}`;
    
    // In a real app, we would send SMS/calls here
    // For this demo, we'll log to console and show UI alerts
    console.log('🚨 SENDING EMERGENCY ALERTS 🚨');
    console.log('Message:', message);
    console.log('Sending to:', contacts);
    
    // Log to alert history
    logAlertToHistory({
        timestamp: new Date().toISOString(),
        message: message,
        recipients: contacts.map(c => c.name),
        location: alertData.location,
        reason: reason
    });
    
    // Show emergency UI
    showEmergencyUI(alertData);
    
    // Play alert sound
    playAlertSound();
    
    // Return a promise that would resolve when alerts are sent
    return new Promise(resolve => {
        // Simulate API delay
        setTimeout(() => {
            showToast('Alerts Sent', `Emergency alerts sent to ${contacts.length} contacts`, 'warning');
            resolve({
                success: true,
                sentTo: contacts.length,
                timestamp: new Date().toISOString()
            });
        }, 1500);
    });
}

/**
 * Log alert to history in localStorage
 * @param {Object} alertData - Data about the alert
 */
function logAlertToHistory(alertData) {
    let alertHistory = [];
    
    try {
        const storedHistory = localStorage.getItem(ALERT_HISTORY_KEY);
        if (storedHistory) {
            alertHistory = JSON.parse(storedHistory);
        }
    } catch (error) {
        console.error('Error parsing alert history:', error);
    }
    
    // Add new alert
    alertHistory.push({
        ...alertData,
        id: Date.now()
    });
    
    // Limit history size (keep last 50 alerts)
    if (alertHistory.length > 50) {
        alertHistory = alertHistory.slice(-50);
    }
    
    // Save back to storage
    localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(alertHistory));
}

/**
 * Show emergency UI when alert is triggered
 * @param {Object} alertData - Data about the emergency
 */
function showEmergencyUI(alertData) {
    // Create or update emergency banner
    let emergencyBanner = document.getElementById('emergencyBanner');
    
    if (!emergencyBanner) {
        emergencyBanner = document.createElement('div');
        emergencyBanner.id = 'emergencyBanner';
        emergencyBanner.className = 'emergency-banner alert alert-danger d-flex align-items-center position-fixed top-0 start-0 end-0 m-0 rounded-0 z-3';
        emergencyBanner.style.display = 'flex';
        document.body.prepend(emergencyBanner);
    }
    
    // Format timestamp
    const timestamp = new Date(alertData.timestamp).toLocaleTimeString();
    
    // Set banner content
    emergencyBanner.innerHTML = `
        <div class="container-fluid py-2">
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>EMERGENCY ALERT:</strong> 
                    <span id="emergencyReason">${alertData.reason}</span>
                    <small class="ms-2 text-muted">${timestamp}</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-light ms-3" id="dismissEmergencyBtn">
                    Dismiss
                </button>
            </div>
        </div>
    `;
    
    // Show banner
    emergencyBanner.style.display = 'block';
    
    // Add event listener to dismiss button
    const dismissBtn = document.getElementById('dismissEmergencyBtn');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', function() {
            emergencyBanner.style.display = 'none';
        });
    }
    
    // Flash banner every 3 seconds
    let isVisible = true;
    const flashInterval = setInterval(() => {
        isVisible = !isVisible;
        emergencyBanner.style.opacity = isVisible ? '1' : '0.7';
    }, 500);
    
    // Store interval for later clearing
    window.emergencyFlashInterval = flashInterval;
}

/**
 * Send a test alert to verify notification setup
 */
function sendTestAlert() {
    getCurrentLocation()
        .then(position => {
            return sendEmergencyAlerts({
                reason: 'TEST ALERT - Please ignore',
                timestamp: new Date().toISOString(),
                location: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                },
                isTest: true
            });
        })
        .catch(error => {
            console.error('Error getting location for test alert:', error);
            return sendEmergencyAlerts({
                reason: 'TEST ALERT - Please ignore',
                timestamp: new Date().toISOString(),
                location: 'Unknown',
                isTest: true
            });
        });
}

/**
 * Get current location as a promise
 * @returns {Promise} Promise that resolves with position
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

/**
 * Play alert sound to notify user
 */
function playAlertSound() {
    const alertSound = document.getElementById('alertSound');
    if (alertSound) {
        alertSound.currentTime = 0;
        alertSound.play().catch(error => {
            console.error('Error playing alert sound:', error);
        });
    }
}

// Initialize the notification service
initNotificationService(); 