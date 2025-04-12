"""
Fake Call Service Module

This module provides functionality for generating fake calls in the SafeHer application.
It adapts the original fake_call.py module to work with the Flask server.
"""

import os
import glob
import json
import time
from threading import Timer
from datetime import datetime

class FakeCallService:
    """Manages fake call generation for the SafeHer application"""
    
    def __init__(self):
        """Initialize the fake call service"""
        self.audio_dir = os.path.join(os.path.dirname(__file__), 'chatbot/audio')
        self.active_calls = {}  # Store active call timers
        self._ensure_audio_dir()
    
    def _ensure_audio_dir(self):
        """Ensure the audio directory exists"""
        if not os.path.exists(self.audio_dir):
            os.makedirs(self.audio_dir)
            print(f"Created audio directory at {self.audio_dir}")
    
    def list_available_ringtones(self):
        """List all available ringtones"""
        ringtones = []
        
        # Get all MP3 files in the audio directory
        mp3_files = glob.glob(os.path.join(self.audio_dir, "*.mp3"))
        
        for file_path in mp3_files:
            filename = os.path.basename(file_path)
            name = filename.replace('.mp3', '').replace('_', ' ').title()
            ringtones.append({
                "id": filename,
                "name": name,
                "path": f"/api/fake_call/ringtone/{filename}"
            })
        
        return ringtones
    
    def get_ringtone_path(self, ringtone_id=None):
        """Get the path to a ringtone file"""
        # If no specific ringtone is requested, use the first available one
        if ringtone_id is None:
            mp3_files = glob.glob(os.path.join(self.audio_dir, "*.mp3"))
            if mp3_files:
                return mp3_files[0]
            return None
        
        # Check if the requested ringtone exists
        ringtone_path = os.path.join(self.audio_dir, ringtone_id)
        if os.path.exists(ringtone_path) and ringtone_path.endswith('.mp3'):
            return ringtone_path
        
        return None
    
    def schedule_fake_call(self, caller_id, caller_name, delay=10, ringtone_id=None):
        """Schedule a fake call to occur after the specified delay"""
        # Generate a unique call ID
        call_id = f"call_{int(time.time())}_{caller_id}"
        
        # Get the ringtone path
        ringtone_path = self.get_ringtone_path(ringtone_id)
        if not ringtone_path:
            print("No ringtone found for the fake call")
        
        # Create call data
        call_data = {
            "id": call_id,
            "caller_id": caller_id,
            "caller_name": caller_name,
            "scheduled_time": (datetime.now().timestamp() + delay),
            "ringtone": ringtone_path,
            "status": "scheduled"
        }
        
        # Store the call data
        self.active_calls[call_id] = call_data
        
        print(f"Scheduled fake call: {call_data}")
        
        # Return call data for the client
        return {
            "call_id": call_id,
            "caller_name": caller_name,
            "delay": delay,
            "scheduled_time": call_data["scheduled_time"],
            "status": "scheduled"
        }
    
    def cancel_fake_call(self, call_id):
        """Cancel a scheduled fake call"""
        if call_id in self.active_calls:
            call_data = self.active_calls.pop(call_id)
            call_data["status"] = "cancelled"
            print(f"Cancelled fake call: {call_data}")
            return {"status": "success", "message": "Call cancelled"}
        
        return {"status": "error", "message": "Call not found"}

# Create a global instance of the service
fake_call_service = FakeCallService() 