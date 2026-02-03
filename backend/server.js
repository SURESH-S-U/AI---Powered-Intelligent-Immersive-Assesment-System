const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Setup Environment Variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 2. Initialize Gemini AI
// Make sure your .env file has: GEMINI_API_KEY=your_key_here
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3. The Main Assessment Route
app.post("/evaluate", async (req, res) => {
    try {
        const { scenario, userAnswer } = req.body;

        // Use the model we found in your diagnostic list
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // We tell the AI exactly how to behave
        const prompt = `
        You are an expert examiner. 
        Scenario: ${scenario}
        User Answer: ${userAnswer}

        Task: 
        1. Evaluate the answer based on logic and professionalism.
        2. Give a score out of 10.
        3. Give 1 short sentence of feedback.

        IMPORTANT: Return ONLY a raw JSON object. No markdown, no backticks, no extra text.
        Format: {"score": 8, "feedback": "Your answer was very professional."}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // CLEANING: AI sometimes adds ```json ... ``` blocks. This removes them.
        const cleanJson = text.replace(/```json|```/g, "").trim();
        
        console.log("AI Response received:", cleanJson);

        // Parse the AI's string into a real JavaScript Object
        const data = JSON.parse(cleanJson);

        // DECISION TREE: Change the next level based on the score
        let nextLevel = "easy";
        if (data.score >= 7) {
            nextLevel = "hard";
        } else if (data.score >= 4) {
            nextLevel = "medium";
        }

        // Send the final result back to your React website
        res.json({
            score: data.score,
            feedback: data.feedback,
            nextLevel: nextLevel
        });

    } catch (error) {
        console.error("ERROR IN BACKEND:", error.message);
        res.status(500).json({ 
            error: "The AI is currently processing. Please try again in a moment.",
            details: error.message 
        });
    }
});

// 4. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🤖 Using Model: gemini-2.0-flash`);
    console.log(`========================================`);
});