const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ MongoDB Connected"));

const User = mongoose.model("User", new mongoose.Schema({
    username: String, email: { type: String, unique: true }, password: { type: String }, level: { type: String, default: "Beginner" }
}));

const Assessment = mongoose.model("Assessment", new mongoose.Schema({
    username: String, domain: String, score: Number, feedback: String, challenge: String, answer: String, sessionId: String, type: String, timestamp: { type: Date, default: Date.now }
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cleanJSON = (text) => {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
    } catch (e) { return null; }
};

const localBackups = {
    adaptive: [
        { challenge: "Scenario: You are designing a database for an e-commerce site. Question: How would you handle many-to-many relationships between Products and Orders?", correct: "junction table" },
        { challenge: "Scenario: A web page is loading very slowly due to large images. Question: Describe the best approach to optimize image delivery without losing quality.", correct: "compression" }
    ],
    multi: [
        { challenge: "Scenario: Coding a landing page. Question: Which HTML tag is for the largest heading?", options: ["<h6>", "<h1>", "<head>", "<header>"], correct: "<h1>" },
        { challenge: "Scenario: You need a list with bullets. Question: Which tag defines an unordered list?", options: ["<ol>", "<ul>", "<li>", "<list>"], correct: "<ul>" }
    ],
    general: [
        { challenge: "Scenario: Space exploration. Question: Which planet is the largest in our solar system?", options: ["Mars", "Jupiter", "Saturn", "Neptune"], correct: "Jupiter" },
        { challenge: "Scenario: Web standards. Question: What does CSS stand for?", options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], correct: "Cascading Style Sheets" }
    ]
};

app.post("/register", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await new User({ ...req.body, password: hashedPassword }).save();
        res.status(201).json({ success: true });
    } catch (e) { res.status(400).json({ error: "Email exists" }); }
});

app.post("/login", async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user._id }, "NEXA_SECRET");
        res.json({ token, user: { name: user.username, level: user.level } });
    } else res.status(401).json({ error: "Invalid Credentials" });
});

app.post("/generate-assessment", async (req, res) => {
    const { type, domains } = req.body;
    const domainStr = domains?.length > 0 ? domains.join(", ") : "General";
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        // Prompt modification for Adaptive Scenario (No options)
        let prompt = "";
        if (type === 'adaptive') {
            prompt = `Create a complex scenario-based logic question about ${domainStr}. Do NOT provide multiple choice options. The question must require a descriptive text answer. Format: Scenario: [Context] Question: [Question]? JSON ONLY: {"challenge": "Scenario: ... Question: ..."}`;
        } else {
            prompt = `Create a beginner ${type} assessment about ${domainStr}. Provide 4 multiple choice options. Format: Scenario: [Context] Question: [Question]? JSON ONLY: {"challenge": "Scenario: ... Question: ...", "options": ["A", "B", "C", "D"]}`;
        }

        const result = await model.generateContent(prompt);
        const data = cleanJSON(result.response.text());
        if (!data) throw new Error();
        res.json(data);
    } catch (e) {
        const pool = localBackups[type] || localBackups.adaptive;
        const random = pool[Math.floor(Math.random() * pool.length)];
        res.json({ ...random, isFallback: true });
    }
});

app.post("/evaluate", async (req, res) => {
    const { answer, challenge, sessionId, username, domains, type } = req.body;
    
    try {
        // Local Match Check
        const allLocal = [...localBackups.adaptive, ...localBackups.multi, ...localBackups.general];
        const localMatch = allLocal.find(q => q.challenge === challenge);

        if (localMatch) {
            const isCorrect = answer.toLowerCase().includes(localMatch.correct.toLowerCase());
            const localResult = {
                score: isCorrect ? 10 : 0,
                feedback: isCorrect ? "Excellent. Correct." : `Incorrect. The anticipated answer was: ${localMatch.correct}.`
            };
            await new Assessment({ username, domain: domains?.join(", "), challenge, answer, sessionId, type, ...localResult }).save();
            return res.json(localResult);
        }

        // AI Grading
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        let evalPrompt = "";
        
        if (type === 'adaptive') {
            evalPrompt = `Grading a scenario-based answer. Scenario/Question: ${challenge}. User's Descriptive Answer: "${answer}". Grade accuracy from 0 to 10. If answer is vague or wrong, give lower score. Provide constructive feedback. JSON ONLY: {"score": 0-10, "feedback": "..."}`;
        } else {
            evalPrompt = `Evaluate this multiple choice answer. Question: ${challenge}. User selected: "${answer}". If correct, score 10. If wrong, score 0 and state the correct answer. JSON ONLY: {"score": 0 or 10, "feedback": "..."}`;
        }

        const result = await model.generateContent(evalPrompt);
        const data = cleanJSON(result.response.text());
        
        await new Assessment({ username, domain: domains?.join(", "), challenge, answer, sessionId, type, ...data }).save();
        res.json(data);
    } catch (e) {
        res.json({ score: 0, feedback: "Neural Link Busy. Manual evaluation recommended." });
    }
});

app.get("/history/:username", async (req, res) => {
    res.json(await Assessment.find({ username: req.params.username }).sort({ timestamp: -1 }));
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));