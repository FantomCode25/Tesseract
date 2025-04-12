import google.generativeai as genai
import os

# Configure API key 
API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyCWn-s64zRpZYsf5p6u1Z0pztC-VAsxpao")
genai.configure(api_key=API_KEY)

def safety_chatbot(prompt):
    """
    Process a user prompt and return a safety-focused response.
    
    Args:
        prompt (str): The user's input message
        
    Returns:
        str: The AI-generated safety response
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Ensure responses are safety-focused and actionable
        formatted_prompt = f"""
        You are a Women's Safety Assistant providing **quick and practical safety advice**.
        Your responses should be **brief (under 3 sentences)** and offer **real-time safety tips, emergency actions, self-defense advice, or legal rights**.

        User: {prompt}
        Response: 
        """

        response = model.generate_content(formatted_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating response: {e}")
        return "I'm sorry, I couldn't process your request at the moment. Please try again."
