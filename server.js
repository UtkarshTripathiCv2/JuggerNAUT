import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config'; // Loads variables from .env file

const app = express();
const port = 3000;

app.use(cors()); // Allows your HTML file to talk to this server
app.use(express.json()); // Allows server to read JSON from requests

// This is the secure endpoint your webpage will call
app.post('/get-ai-response', async (req, res) => {
    // Get the prompt that your webpage sent
    const userPrompt = req.body.prompt;
    const apiKey = process.env.API_KEY; // Get the secret API key from the .env file

    if (!userPrompt || !apiKey) {
        return res.status(400).json({ error: 'Prompt or API key is missing.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }]
    };

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            // Forward the error from the Gemini API for better debugging
            const errorBody = await apiResponse.text();
            console.error("Gemini API Error:", errorBody);
            throw new Error(`API request failed with status ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        // Send the result from Google's API back to your webpage
        res.json(result);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
});

app.listen(port, () => {
    console.log(`JaggerNAUT server running at http://localhost:${port}`);
    console.log('Waiting for requests from the webpage...');
});
