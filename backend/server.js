const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Setup Environment Variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 2. Connect to MongoDB
// Make sure your .env file has: MONGO_URI=mongodb+srv://...
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Assessment Database Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 3. Define the Assessment Schema
const AssessmentSchema = new mongoose.Schema({
  username: String,
  questionNumber: Number,
  scenario: String,
  userAnswer: String,
  score: Number,
  tone: Number,
  logic: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});

const Assessment = mongoose.model("Assessment", AssessmentSchema);

// 4. Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 5. THE MAIN ROUTE: Evaluate Answer & Generate Next Scenario
app.post("/evaluate-and-generate", async (req, res) => {
  try {
    const { username, currentScenario, userAnswer, questionCount } = req.body;

    // Use the stable flash model
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // The prompt that handles both grading and dynamic question generation
    const prompt = `
      You are an Intelligent Assessment System. 
      User: ${username}
      Current Question Number: ${questionCount} of 10

      EVALUATE THIS SESSION:
      Scenario: "${currentScenario}"
      User Answer: "${userAnswer}"

      TASK:
      1. Rate the answer 1-10 for 'score', 'tone', and 'logic'.
      2. Provide a short 1-sentence feedback.
      3. Generate the NEXT Scenario:
         - If questionCount < 10: Create a new realistic work scenario. If they scored high, make it harder. If low, make it simpler.
         - If questionCount is 10: Set nextScenario to "COMPLETED".

      RETURN ONLY A RAW JSON OBJECT. No markdown, no backticks.
      Format: {"score": 8, "tone": 7, "logic": 9, "feedback": "Your text here", "nextScenario": "Next scenario text here"}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Cleaning the response (Removing backticks if AI adds them)
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    // 6. Save the data to MongoDB for the final report/history
    const record = new Assessment({
      username,
      questionNumber: questionCount,
      scenario: currentScenario,
      userAnswer: userAnswer,
      score: data.score,
      tone: data.tone,
      logic: data.logic,
      feedback: data.feedback
    });
    await record.save();

    // 7. Send result to Frontend
    res.json(data);

  } catch (error) {
    console.error("AI or DB Error:", error.message);
    res.status(500).json({ error: "System encountered an error. Please retry." });
  }
});

// 8. Dashboard Route: Get all history for a user
app.get("/history/:username", async (req, res) => {
  try {
    const history = await Assessment.find({ username: req.params.username }).sort({ questionNumber: 1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch history" });
  }
});

// 9. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`----------------------------------------`);
    console.log(`🚀 Intelligent Server Running on Port ${PORT}`);
    console.log(`🤖 AI Model: gemini-flash-latest`);
    console.log(`----------------------------------------`);
});