#!/bin/bash

# Open the chatbot in the default browser
echo "Opening the chatbot in your default browser..."

# Try to use the appropriate command based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:5001/
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:5001/
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start http://localhost:5001/
else
    echo "Please manually open this URL in your browser: http://localhost:5001/"
fi

echo "If the browser doesn't open automatically, please visit http://localhost:5001/ manually."
echo "Make sure the server is running using 'bash run_chatbot.sh' first." 