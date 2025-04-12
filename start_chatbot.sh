#!/bin/bash

# Function to stop processes
stop_processes() {
    echo "Stopping any running Flask and Streamlit processes..."
    pkill -f "python chatbot_server.py" || true
    pkill -f "streamlit run app.py" || true
    sleep 2
}

# Check if required audio files exist
check_audio_files() {
    if [ ! -d "audio" ]; then
        mkdir -p audio
    fi
    
    if [ ! -f "audio/ringtone.mp3" ]; then
        echo "Downloading sample ringtone..."
        curl -s -o audio/ringtone.mp3 https://www.soundjay.com/phone/sounds/telephone-ring-01a.mp3
    fi
}

# Function to start the Flask server
start_flask_server() {
    echo "Starting Flask server..."
    cd /Users/rajeshsambaragi/Downloads/hackathon/chatbot
    source .venv/bin/activate
    python chatbot_server.py &
    sleep 3
    echo "Flask server is running in the background"
}

# Function to start the Streamlit app
start_streamlit_app() {
    echo "Starting Streamlit app..."
    cd /Users/rajeshsambaragi/Downloads/hackathon/chatbot
    source .venv/bin/activate
    streamlit run app.py &
    sleep 3
    echo "Streamlit app is running in the background"
}

# Main execution
stop_processes
check_audio_files
start_flask_server
start_streamlit_app

echo "Chatbot is now running!"
echo "- Flask server: http://localhost:5000"
echo "- Streamlit app: http://localhost:8501"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep the script running
wait 