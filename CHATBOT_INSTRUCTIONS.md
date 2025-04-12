# SafeHer AI Chatbot - Complete Guide

This guide provides step-by-step instructions for setting up and using the SafeHer AI Chatbot.

## Quick Start Guide

1. **Start the Server**:
   ```bash
   bash run_chatbot.sh
   ```

2. **Open the Chatbot in Your Browser**:
   ```bash
   bash open_chatbot.sh
   ```
   Or manually navigate to: http://localhost:5001/

## Detailed Instructions

### First-Time Setup

1. **Create a Virtual Environment** (only needed first time):
   ```bash
   python3 -m venv chatbot_env
   ```

2. **Install Required Packages** (only needed first time):
   ```bash
   source chatbot_env/bin/activate
   pip install flask google-generativeai pygame werkzeug flask-cors requests
   ```

3. **Make sure you have a ringtone file**:
   The fake call feature needs at least one MP3 file in the `chatbot/audio` directory.
   There should already be a file called `friend_emergency.mp3` in that directory.

### Running the Chatbot

1. **Start the Server**:
   ```bash
   bash run_chatbot.sh
   ```
   This script activates the virtual environment and starts the Flask server.

2. **Access the Chatbot**:
   - Open your browser and go to: http://localhost:5001/
   - Or run: `bash open_chatbot.sh` to open it automatically

3. **Using the Chatbot Interface**:
   - **Chat**: Type your safety-related questions in the chat input box
   - **Quick Actions**: Click on the predefined buttons for common safety topics
   - **Fake Call**: Configure and generate a fake call to help leave uncomfortable situations

### Troubleshooting

1. **Server Won't Start**:
   - Make sure the virtual environment is properly set up
   - Check if another process is using port 5001
   - Try running: `pkill -f chatbot_server.py` to kill any existing server processes

2. **Can't Connect to API**:
   - Verify the server is running
   - Check browser console for CORS errors
   - Test the API directly using: `python test_chatbot_api.py`

3. **No Audio for Fake Call**:
   - Ensure you have at least one MP3 file in the `chatbot/audio` directory
   - Check browser console for any audio playback errors

### Integration with Main Application

The chatbot is designed to work with the main SafeHer application. It includes:
- Same visual style and navigation
- Firebase authentication integration
- Consistent user experience

The `chatbot.html` file should be accessible from your main application at the URL path `/chatbot.html`

### Common Commands

```bash
# Start the server
bash run_chatbot.sh

# Open in browser
bash open_chatbot.sh

# Test the API
python test_chatbot_api.py

# Stop the server
pkill -f chatbot_server.py

# Update packages
source chatbot_env/bin/activate && pip install -U flask google-generativeai
```

### Advanced Configuration

- **API Key**: To use your own Google Gemini API key, set it as an environment variable:
  ```bash
  export GOOGLE_API_KEY="your-api-key-here"
  ```

- **Custom Port**: To change the port, edit the `chatbot_server.py` file and modify the port number (currently 5001).

- **Adding Ringtones**: Add more MP3 files to the `chatbot/audio` directory for variety in fake calls. 