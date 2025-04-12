from flask import Flask, request, jsonify, render_template, send_file
import os
from werkzeug.middleware.proxy_fix import ProxyFix
import sys
from flask_cors import CORS  # Import CORS support

# Add the chatbot directory to the path so we can import the chatbot module
sys.path.append(os.path.join(os.path.dirname(__file__), 'chatbot'))

# Import the chatbot functionality
from chatbot import safety_chatbot

# Import fake call service
from fake_call_service import fake_call_service

app = Flask(__name__)
# Enable CORS for all routes
CORS(app)
app.wsgi_app = ProxyFix(app.wsgi_app)

# Serve static HTML files
@app.route('/')
def index():
    return render_template('chatbot.html')

# Also serve the chatbot.html file directly from the root path
@app.route('/chatbot.html')
def chatbot_html():
    return render_template('chatbot.html')

# API endpoint for chatbot
@app.route('/api/chatbot', methods=['POST'])
def chat():
    data = request.json
    if not data or 'prompt' not in data:
        return jsonify({'error': 'No prompt provided'}), 400
    
    prompt = data['prompt']
    try:
        response = safety_chatbot(prompt)
        return jsonify({'response': response})
    except Exception as e:
        print(f"Error processing chat request: {e}")
        return jsonify({'error': str(e)}), 500

# API endpoint for fake call ringtone
@app.route('/api/fake_call/ringtone')
def get_ringtone():
    try:
        # Check if we have a default ringtone in the audio directory
        audio_dir = os.path.join(os.path.dirname(__file__), 'chatbot/audio')
        
        # Look for any MP3 file in the audio directory
        mp3_files = [f for f in os.listdir(audio_dir) if f.endswith('.mp3')]
        
        if mp3_files:
            # Use the first MP3 file found
            ringtone_path = os.path.join(audio_dir, mp3_files[0])
            response = send_file(ringtone_path, mimetype='audio/mpeg')
            # Add CORS headers for audio file
            response.headers['Access-Control-Allow-Origin'] = '*'
            print(f"Serving ringtone file: {ringtone_path}")
            return response
        else:
            return jsonify({'error': 'No ringtone available'}), 404
    except Exception as e:
        print(f"Error serving ringtone: {e}")
        return jsonify({'error': str(e)}), 500

# API endpoint for initiating a fake call
@app.route('/api/fake_call/initiate', methods=['POST'])
def initiate_fake_call():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract call details
        caller_name = data.get('caller_name', 'Unknown')
        delay = data.get('delay', 10)  # Default 10 seconds
        ringtone_id = data.get('ringtone_id', None)
        
        # Use the fake call service to schedule the call
        call_data = fake_call_service.schedule_fake_call(
            caller_id='user', 
            caller_name=caller_name, 
            delay=delay,
            ringtone_id=ringtone_id
        )
        
        print(f"Fake call initiated: {call_data}")
        
        # Return success response
        return jsonify({
            'status': 'success',
            'message': f'Fake call from {caller_name} scheduled in {delay} seconds',
            'call_data': call_data
        })
    except Exception as e:
        print(f"Error initiating fake call: {e}")
        return jsonify({'error': str(e)}), 500

# Helper function to get available ringtones
@app.route('/api/fake_call/available-ringtones', methods=['GET'])
def get_available_ringtones():
    try:
        # Use the fake call service to get available ringtones
        ringtones = fake_call_service.list_available_ringtones()
        return jsonify({'ringtones': ringtones})
    except Exception as e:
        print(f"Error getting available ringtones: {e}")
        return jsonify({'error': str(e)}), 500

# API endpoint for getting a specific ringtone
@app.route('/api/fake_call/ringtone/<filename>')
def get_specific_ringtone(filename):
    try:
        # Get the ringtone path from the service
        ringtone_path = fake_call_service.get_ringtone_path(filename)
        
        if ringtone_path and os.path.exists(ringtone_path):
            response = send_file(ringtone_path, mimetype='audio/mpeg')
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        else:
            return jsonify({'error': 'Ringtone not found'}), 404
    except Exception as e:
        print(f"Error serving specific ringtone: {e}")
        return jsonify({'error': str(e)}), 500

# API endpoint for cancelling a fake call
@app.route('/api/fake_call/cancel/<call_id>', methods=['POST'])
def cancel_fake_call(call_id):
    try:
        result = fake_call_service.cancel_fake_call(call_id)
        return jsonify(result)
    except Exception as e:
        print(f"Error cancelling fake call: {e}")
        return jsonify({'error': str(e)}), 500

# Start the server with templates properly set up
if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    # Move chatbot.html to templates if it exists in the current directory
    chatbot_html = os.path.join(os.path.dirname(__file__), 'chatbot.html')
    if os.path.exists(chatbot_html):
        import shutil
        shutil.copy(chatbot_html, os.path.join(templates_dir, 'chatbot.html'))
        print(f"Copied chatbot.html to {templates_dir}")
    
    print("Starting Flask server for SafeHer Chatbot...")
    app.run(debug=True, host='0.0.0.0', port=5001) 