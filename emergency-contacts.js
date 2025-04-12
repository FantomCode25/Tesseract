/**
 * Emergency Contact Management System
 * 
 * This module handles the management of emergency contacts for the live tracker
 * including adding, removing, validating, and persisting contact information.
 */

// Global storage for emergency contacts
let emergencyContacts = [];
let contactCounter = 1;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load any existing contacts
    loadEmergencyContacts();
    
    // Set up event listeners
    const addContactBtn = document.getElementById('addContactBtn');
    if (addContactBtn) {
        addContactBtn.addEventListener('click', addNewContactField);
    }
    
    const saveContactsBtn = document.getElementById('saveContacts');
    if (saveContactsBtn) {
        saveContactsBtn.addEventListener('click', saveEmergencyContacts);
    }
});

/**
 * Add a new contact input field to the form
 */
function addNewContactField() {
    contactCounter++;
    const contactsList = document.getElementById('contactsList');
    
    if (!contactsList) return;
    
    const newContactHtml = `
        <div class="glass-card mb-3 contact-item">
            <div class="row g-3">
                <div class="col-md-4">
                    <label for="contactName${contactCounter}" class="form-label">Contact Name</label>
                    <input type="text" class="form-control" id="contactName${contactCounter}" required>
                </div>
                <div class="col-md-4">
                    <label for="contactPhone${contactCounter}" class="form-label">Phone Number</label>
                    <input type="tel" class="form-control" id="contactPhone${contactCounter}" required>
                </div>
                <div class="col-md-3">
                    <label for="contactRelation${contactCounter}" class="form-label">Relationship</label>
                    <select class="form-select" id="contactRelation${contactCounter}">
                        <option value="Family">Family</option>
                        <option value="Friend">Friend</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="col-md-1 d-flex align-items-end">
                    <button type="button" class="btn btn-outline-danger mb-3" onclick="removeContact(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    contactsList.insertAdjacentHTML('beforeend', newContactHtml);
}

/**
 * Remove a contact input field
 * @param {HTMLElement} button - The remove button that was clicked
 */
function removeContact(button) {
    const contactItem = button.closest('.contact-item');
    
    // Only allow removal if there's more than one contact
    const contactItems = document.querySelectorAll('.contact-item');
    if (contactItems.length > 1) {
        contactItem.remove();
    } else {
        showToast('Warning', 'At least one emergency contact is required');
    }
}

/**
 * Collect and validate all emergency contacts from the form
 * @returns {Array|null} Array of contact objects or null if validation fails
 */
function collectContactData() {
    const contactItems = document.querySelectorAll('.contact-item');
    const contacts = [];
    let isValid = true;
    
    contactItems.forEach((item, index) => {
        const nameInput = item.querySelector('input[id^="contactName"]');
        const phoneInput = item.querySelector('input[id^="contactPhone"]');
        const relationSelect = item.querySelector('select[id^="contactRelation"]');
        
        // Basic validation
        if (!nameInput.value.trim()) {
            nameInput.classList.add('is-invalid');
            isValid = false;
        } else {
            nameInput.classList.remove('is-invalid');
        }
        
        if (!phoneInput.value.trim() || !validatePhoneNumber(phoneInput.value)) {
            phoneInput.classList.add('is-invalid');
            isValid = false;
        } else {
            phoneInput.classList.remove('is-invalid');
        }
        
        contacts.push({
            id: index + 1,
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            relation: relationSelect.value,
            isPrimary: index === 0 // First contact is marked as primary
        });
    });
    
    return isValid ? contacts : null;
}

/**
 * Simple phone number validation
 * @param {string} phone - The phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
function validatePhoneNumber(phone) {
    // Basic validation - should be at least 10 digits
    return /^[+]?[\d\s()-]{10,15}$/.test(phone);
}

/**
 * Save all emergency contacts and close the modal
 */
function saveEmergencyContacts() {
    const contacts = collectContactData();
    
    if (!contacts) {
        showToast('Error', 'Please fix the errors in the form');
        return;
    }
    
    if (contacts.length === 0) {
        showToast('Error', 'At least one emergency contact is required');
        return;
    }
    
    // Save contacts to global variable and localStorage
    emergencyContacts = contacts;
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('emergencyContactModal'));
    if (modal) {
        modal.hide();
    }
    
    // If this is during setup, proceed to the security code setup
    if (window.shouldShowSecurityModal) {
        setTimeout(() => {
            showSecurityCodeModal();
        }, 500);
    }
    
    showToast('Success', 'Emergency contacts saved successfully');
}

/**
 * Load any existing emergency contacts from localStorage
 */
function loadEmergencyContacts() {
    const savedContacts = localStorage.getItem('emergencyContacts');
    
    if (savedContacts) {
        try {
            emergencyContacts = JSON.parse(savedContacts);
            
            // Update the contacts list UI if it exists
            const contactsList = document.getElementById('contactsList');
            if (contactsList) {
                // Clear existing contacts first
                contactsList.innerHTML = '';
                
                // Add each contact to the UI
                emergencyContacts.forEach((contact, index) => {
                    contactCounter = index + 1;
                    const contactHtml = `
                        <div class="glass-card mb-3 contact-item">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label for="contactName${contactCounter}" class="form-label">Contact Name</label>
                                    <input type="text" class="form-control" id="contactName${contactCounter}" value="${contact.name}" required>
                                </div>
                                <div class="col-md-4">
                                    <label for="contactPhone${contactCounter}" class="form-label">Phone Number</label>
                                    <input type="tel" class="form-control" id="contactPhone${contactCounter}" value="${contact.phone}" required>
                                </div>
                                <div class="col-md-3">
                                    <label for="contactRelation${contactCounter}" class="form-label">Relationship</label>
                                    <select class="form-select" id="contactRelation${contactCounter}">
                                        <option value="Family" ${contact.relation === 'Family' ? 'selected' : ''}>Family</option>
                                        <option value="Friend" ${contact.relation === 'Friend' ? 'selected' : ''}>Friend</option>
                                        <option value="Colleague" ${contact.relation === 'Colleague' ? 'selected' : ''}>Colleague</option>
                                        <option value="Other" ${contact.relation === 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                                <div class="col-md-1 d-flex align-items-end">
                                    <button type="button" class="btn btn-outline-danger mb-3" onclick="removeContact(this)">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    contactsList.insertAdjacentHTML('beforeend', contactHtml);
                });
            }
        } catch (e) {
            console.error('Error loading emergency contacts:', e);
            emergencyContacts = [];
        }
    }
}

/**
 * Get all emergency contacts
 * @returns {Array} Array of emergency contact objects
 */
function getEmergencyContacts() {
    // If we don't have contacts in memory, try loading from localStorage
    if (!emergencyContacts || emergencyContacts.length === 0) {
        loadEmergencyContacts();
    }
    
    return emergencyContacts;
}

/**
 * Send emergency alerts to all contacts
 * @param {Object} data - Data to include in the alert (location, timestamp, etc.)
 */
function sendEmergencyAlerts(data) {
    const contacts = getEmergencyContacts();
    
    if (!contacts || contacts.length === 0) {
        console.error('No emergency contacts found to send alerts to');
        return;
    }
    
    console.log(`Sending emergency alerts to ${contacts.length} contacts`);
    
    // In a real implementation, this would connect to a backend service
    // that would send SMS messages or make calls to the emergency contacts
    
    // Simulate sending alerts
    contacts.forEach(contact => {
        console.log(`ALERT: Sending emergency notification to ${contact.name} (${contact.phone})`);
        console.log(`Alert data:`, data);
        
        // In a real implementation, this would be a fetch() or API call to a backend service
        
        // Show a toast for demo purposes
        showToast('Emergency Alert Sent', `Notification sent to ${contact.name}`);
    });
    
    // Play alert sound
    playAlertSound();
    
    return contacts;
}

/**
 * Show a toast notification
 * @param {string} title - Title of the notification
 * @param {string} message - Message to display
 */
function showToast(title, message) {
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toast = document.getElementById('notificationToast');
    
    if (toastTitle && toastMessage && toast) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

/**
 * Play the alert sound
 */
function playAlertSound() {
    const alertSound = document.getElementById('alertSound');
    if (alertSound) {
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.error('Error playing alert sound:', e));
    }
} 