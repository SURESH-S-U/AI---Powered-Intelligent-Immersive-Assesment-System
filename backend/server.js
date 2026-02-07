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
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : null;
    } catch (e) { return null; }
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
    const { type, domains, limit } = req.body;
    const domainStr = domains?.length > 0 ? domains.join(", ") : "General";
    const count = limit || 3;
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        let prompt = "";
        
        if (type === 'adaptive') {
            prompt = `Generate ${count} unique, short scenario-based logic questions about ${domainStr}. 
            Format each as: Scenario: [Context] Question: [Question]? 
            JSON format: {"questions": [{"challenge": "..."}]}`;
        } else {
            prompt = `Generate ${count} unique multiple choice questions about ${domainStr}. 
            JSON format: {"questions": [{"challenge": "...", "options": ["A", "B", "C", "D"]}]}`;
        }

        const result = await model.generateContent(prompt);
        const data = cleanJSON(result.response.text());
        res.json(data || { questions: [] });
    } catch (e) {
        res.status(500).json({ error: "AI Error" });
    }
});

app.post("/evaluate-batch", async (req, res) => {
    const { username, answers, domains, sessionId, type } = req.body;
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const evalPrompt = `Evaluate these ${answers.length} answers for an assessment. 
        Input: ${JSON.stringify(answers)}. 
        For each, provide a score (0-10) and brief feedback. 
        JSON ONLY: {"results": [{"score": 0-10, "feedback": "..."}]}`;

        const result = await model.generateContent(evalPrompt);
        const data = cleanJSON(result.response.text());

        // Save each to DB for history
        const savePromises = data.results.map((resItem, idx) => {
            return new Assessment({
                username, 
                domain: domains?.join(", "), 
                challenge: answers[idx].challenge, 
                answer: answers[idx].answer, 
                sessionId, 
                type, 
                score: resItem.score, 
                feedback: resItem.feedback 
            }).save();
        });

        await Promise.all(savePromises);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "Batch Evaluation Failed" });
    }
});

app.get("/history/:username", async (req, res) => {
    res.json(await Assessment.find({ username: req.params.username }).sort({ timestamp: -1 }));
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));