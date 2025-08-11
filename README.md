# JaggerNAUT - AI Fitness Coach

JaggerNAUT is a web-based AI fitness application that uses your webcam to track your exercises in real-time. It leverages Google's MediaPipe for pose detection and Gemini for AI-powered feedback and diet planning.

## Features

- **Real-Time Exercise Tracking:** Counts reps for Bicep Curls, Shoulder Press, Squats, Pushups, and Pull-ups.
- **AI Coach:** Get personalized feedback on your workout summary.
- **AI Diet Planner:** Generate a sample meal plan based on your goals and stats.
- **Health Tools:** Includes BMI and Daily Calorie calculators.
- **Secure API Handling:** API keys are managed on a backend server, not exposed on the frontend.

## Project Structure


/jaggernaut-ai-fitness
|-- node_modules/
|-- .env                # Stores your secret API key
|-- .gitignore          # Tells Git to ignore .env and node_modules
|-- client.js           # Frontend JavaScript logic
|-- index.html          # Main application page
|-- package.json        # Project configuration and dependencies
|-- package-lock.json   # Records dependency versions
|-- README.md           # This file
|-- server.js           # Secure backend server (Node.js)
|-- style.css           # All CSS styles


## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm) installed on your machine.
- A valid Google Gemini API key.

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd jaggernaut-ai-fitness
    ```

2.  **Install Dependencies:**
    Run the following command in your project's root directory to install the necessary backend packages:
    ```bash
    npm install
    ```

3.  **Create Environment File:**
    Create a file named `.env` in the root of the project and add your Google Gemini API key:
    ```
    API_KEY=YOUR_SECRET_API_KEY_HERE
    ```

4.  **Start the Server:**
    Run the following command to start the backend server:
    ```bash
    npm start
    ```
    You should see a confirmation message: `JaggerNAUT server running at http://localhost:3000`.

5.  **Launch the Application:**
    Open the `index.html` file in your web browser. A simple way to do this is with a tool like the "Live Server" extension in Visual Studio Code, which also handles page reloads automatically.

The AI features should now work perfectly without exposing your API key.
