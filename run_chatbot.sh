#!/bin/bash

# Path to virtual environment
VENV_PATH="chatbot_env"

# Check if the virtual environment exists
if [ -d "$VENV_PATH" ]; then
    echo "Using existing virtual environment at $VENV_PATH"
    # Activate the virtual environment
    source "$VENV_PATH/bin/activate"
else
    echo "Error: Virtual environment not found at $VENV_PATH"
    echo "Please run: python3 -m venv $VENV_PATH"
    echo "Then run: source $VENV_PATH/bin/activate && pip install flask google-generativeai pygame werkzeug"
    exit 1
fi

# Run the server
echo "Starting chatbot server with Python from virtual environment..."
python chatbot_server.py

# Deactivate the virtual environment when done
deactivate 