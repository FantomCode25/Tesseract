/**
 * Location Tracking Module
 * 
 * This module handles real-time location tracking with path history,
 * geofencing, and location data management.
 */

// Global variables
let map, userMarker, watchPositionId;
let pathCoordinates = [];
let pathLine;
let lastLocation = null;
let isTracking = false;
let locationUpdateFrequency = 10000; // 10 seconds
let locationHistory = [];
let locationAccuracyCircle;

// Default map center (Bengaluru)
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

/**
 * Initialize the map and location tracking components
 */
function initLocationTracking() {
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    // Initialize map
    map = new google.maps.Map(mapContainer, {
        center: DEFAULT_CENTER,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT
        },
        fullscreenControl: true,
        streetViewControl: false,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
        }
    });
    
    // Create user marker (initially hidden)
    userMarker = new google.maps.Marker({
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2
        },
        visible: false
    });
    
    // Create accuracy circle (initially hidden)
    locationAccuracyCircle = new google.maps.Circle({
        map: map,
        fillColor: '#4285F4',
        fillOpacity: 0.2,
        strokeColor: '#4285F4',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        visible: false
    });
    
    // Create path line
    pathLine = new google.maps.Polyline({
        map: map,
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 3
    });
    
    // Add event listeners
    setupLocationButtons();
    
    // Try to get initial location
    getCurrentLocation()
        .then(position => {
            updateMapLocation(position);
        })
        .catch(error => {
            console.error('Error getting initial location:', error);
            showToast('Location Error', 'Could not get your current location. Please check your permissions.', 'error');
        });
}

/**
 * Set up tracking control buttons
 */
function setupLocationButtons() {
    // Start tracking button
    const startTrackingBtn = document.getElementById('startTrackingBtn');
    if (startTrackingBtn) {
        startTrackingBtn.addEventListener('click', startTracking);
    }
    
    // Stop tracking button
    const stopTrackingBtn = document.getElementById('stopTrackingBtn');
    if (stopTrackingBtn) {
        stopTrackingBtn.addEventListener('click', stopTracking);
    }
    
    // Emergency button
    const emergencyBtn = document.getElementById('emergencyBtn');
    if (emergencyBtn) {
        emergencyBtn.addEventListener('click', triggerEmergency);
    }
}

/**
 * Start location tracking
 */
function startTracking() {
    if (isTracking) {
        console.log('Already tracking location');
        return;
    }
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
        showToast('Not Available', 'Geolocation is not supported by your browser', 'error');
        return;
    }
    
    // Reset path data
    pathCoordinates = [];
    locationHistory = [];
    
    // Update UI
    document.getElementById('startTrackingBtn').classList.add('d-none');
    document.getElementById('stopTrackingBtn').classList.remove('d-none');
    document.getElementById('trackingStatus').textContent = 'Tracking Active';
    document.getElementById('trackingStatus').classList.add('text-success');
    
    // Start watching position
    watchPositionId = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        handleLocationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    isTracking = true;
    
    // Record start time
    const startTime = new Date();
    localStorage.setItem('trackingStartTime', startTime.toISOString());
    
    // Log and show toast
    console.log('Location tracking started');
    showToast('Tracking Started', 'Your location is now being tracked');
    
    // Trigger initial security code setup if not already set
    if (!isSecurityCodeSet()) {
        showSecurityCodeSetupModal();
    }
}

/**
 * Stop location tracking
 */
function stopTracking() {
    if (!isTracking) {
        console.log('Not currently tracking location');
        return;
    }
    
    // Stop watching position
    if (watchPositionId) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
    }
    
    // Update UI
    document.getElementById('startTrackingBtn').classList.remove('d-none');
    document.getElementById('stopTrackingBtn').classList.add('d-none');
    document.getElementById('trackingStatus').textContent = 'Not Tracking';
    document.getElementById('trackingStatus').classList.remove('text-success');
    
    isTracking = false;
    
    // Record end time and tracking data
    const endTime = new Date();
    const startTimeStr = localStorage.getItem('trackingStartTime');
    const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
    const duration = (endTime - startTime) / 1000 / 60; // in minutes
    
    // Save tracking data
    saveTrackingSession({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration.toFixed(2),
        pathPoints: locationHistory.length,
        locationHistory: locationHistory
    });
    
    // Show tracking summary
    showTrackingSummary(startTime, endTime, duration, locationHistory.length);
    
    // Log and show toast
    console.log('Location tracking stopped');
    showToast('Tracking Ended', `Your location was tracked for ${duration.toFixed(2)} minutes`);
}

/**
 * Handle location update from watchPosition
 * @param {GeolocationPosition} position - New position from geolocation API
 */
function handleLocationUpdate(position) {
    if (!isTracking) return;
    
    const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp
    };
    
    // Update map with new location
    updateMapLocation(position);
    
    // Add to path coordinates
    const latLng = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
    );
    
    pathCoordinates.push(latLng);
    pathLine.setPath(pathCoordinates);
    
    // Update last location
    lastLocation = location;
    
    // Add to location history with address
    getAddressFromCoordinates(location.latitude, location.longitude)
        .then(address => {
            const locationWithAddress = {
                ...location,
                address: address,
                timestamp: new Date().toISOString()
            };
            
            locationHistory.push(locationWithAddress);
            
            // Update location info display
            updateLocationInfoDisplay(locationWithAddress);
        })
        .catch(error => {
            // Still add to history but without address
            const locationWithoutAddress = {
                ...location,
                address: 'Unknown',
                timestamp: new Date().toISOString()
            };
            
            locationHistory.push(locationWithoutAddress);
            updateLocationInfoDisplay(locationWithoutAddress);
        });
}

/**
 * Handle location error
 * @param {GeolocationPositionError} error - Error from geolocation API
 */
function handleLocationError(error) {
    console.error('Geolocation error:', error);
    
    let errorMessage;
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location services for this site.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings.';
            break;
        case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        default:
            errorMessage = 'An unknown error occurred while getting your location.';
    }
    
    showToast('Location Error', errorMessage, 'error');
    
    // If we're trying to track but can't get location, may need to stop tracking
    if (isTracking && (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE)) {
        stopTracking();
        
        // This could be an emergency situation if tracking was expected
        const alertReason = 'Location tracking failed - device may have lost connectivity or location services were disabled';
        triggerEmergencyAlert(alertReason);
    }
}

/**
 * Update map with new location
 * @param {GeolocationPosition} position - New position from geolocation API
 */
function updateMapLocation(position) {
    const latLng = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
    );
    
    // Update marker
    userMarker.setPosition(latLng);
    userMarker.setVisible(true);
    
    // Update accuracy circle
    locationAccuracyCircle.setCenter(latLng);
    locationAccuracyCircle.setRadius(position.coords.accuracy);
    locationAccuracyCircle.setVisible(true);
    
    // Center map on new location if tracking is active
    if (isTracking) {
        map.setCenter(latLng);
    }
}

/**
 * Get current location once
 * @returns {Promise} Promise resolving with GeolocationPosition
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
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
 * Get address from coordinates using Google Maps Geocoding API
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise} Promise resolving with address string
 */
function getAddressFromCoordinates(latitude, longitude) {
    return new Promise((resolve, reject) => {
        // In real implementation, this would use the Geocoding API
        // For simplicity, we're simulating it
        const geocoder = new google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };
        
        geocoder.geocode({ location: latlng }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                resolve(results[0].formatted_address);
            } else {
                reject(new Error('Could not get address from coordinates'));
            }
        });
    });
}

/**
 * Update location info display
 * @param {Object} location - Location object with address
 */
function updateLocationInfoDisplay(location) {
    const locationInfoElement = document.getElementById('currentLocationInfo');
    if (!locationInfoElement) return;
    
    const date = new Date(location.timestamp);
    const formattedTime = date.toLocaleTimeString();
    
    locationInfoElement.innerHTML = `
        <div class="d-flex align-items-center mb-2">
            <i class="fas fa-map-marker-alt text-danger me-2"></i>
            <strong>Current Location:</strong>
        </div>
        <p>${location.address}</p>
        <div class="d-flex justify-content-between text-muted small">
            <span>Updated: ${formattedTime}</span>
            <span>Accuracy: ${Math.round(location.accuracy)}m</span>
        </div>
    `;
}

/**
 * Save tracking session to local storage
 * @param {Object} sessionData - Data about the tracking session
 */
function saveTrackingSession(sessionData) {
    // Get existing sessions
    let sessions = JSON.parse(localStorage.getItem('trackingSessions') || '[]');
    
    // Add new session
    sessions.push({
        id: Date.now().toString(),
        ...sessionData
    });
    
    // Only keep the last 10 sessions
    if (sessions.length > 10) {
        sessions = sessions.slice(-10);
    }
    
    // Save back to storage
    localStorage.setItem('trackingSessions', JSON.stringify(sessions));
}

/**
 * Show tracking summary after session ends
 * @param {Date} startTime - Session start time
 * @param {Date} endTime - Session end time
 * @param {number} duration - Session duration in minutes
 * @param {number} pointsCount - Number of location points recorded
 */
function showTrackingSummary(startTime, endTime, duration, pointsCount) {
    // Create toast with summary
    const message = `
        <div class="mb-2">Trip summary:</div>
        <div class="small">
            <div><strong>Start:</strong> ${startTime.toLocaleTimeString()}</div>
            <div><strong>End:</strong> ${endTime.toLocaleTimeString()}</div>
            <div><strong>Duration:</strong> ${duration.toFixed(2)} minutes</div>
            <div><strong>Points tracked:</strong> ${pointsCount}</div>
        </div>
    `;
    
    showToast('Tracking Summary', message);
}

/**
 * Trigger emergency alert
 * @param {string} reason - Reason for emergency
 */
function triggerEmergency(reason = 'Emergency button pressed') {
    // Play alert sound
    playAlertSound();
    
    // Get current location
    getCurrentLocation()
        .then(position => {
            const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Send emergency alerts with current location
            sendEmergencyAlerts({
                reason: reason,
                timestamp: new Date().toISOString(),
                location: location
            });
            
            // Show emergency confirmation
            showToast('Emergency Alert Sent', 'Emergency contacts have been notified with your current location', 'warning');
        })
        .catch(error => {
            console.error('Error getting location for emergency:', error);
            
            // Still send alerts but without location
            sendEmergencyAlerts({
                reason: reason + ' (location unavailable)',
                timestamp: new Date().toISOString(),
                location: lastLocation || 'Unknown'
            });
            
            showToast('Emergency Alert Sent', 'Emergency contacts have been notified, but your current location could not be determined', 'warning');
        });
}

/**
 * Check if security code is set
 * @returns {boolean} True if security code is set
 */
function isSecurityCodeSet() {
    return !!localStorage.getItem('securityCode');
}

/**
 * Initialize location tracking when the map is loaded
 */
function initMap() {
    // This function is called by the Google Maps API when it's loaded
    initLocationTracking();
} 