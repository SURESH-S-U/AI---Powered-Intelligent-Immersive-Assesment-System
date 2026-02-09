const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err));

const User = mongoose.model("User", new mongoose.Schema({
    username: String, 
    email: { type: String, unique: true }, 
    password: { type: String }, 
    level: { type: String, default: "Beginner" }
}));

const Assessment = mongoose.model("Assessment", new mongoose.Schema({
    username: String, 
    domain: String, 
    score: Number, 
    feedback: String, 
    challenge: String, 
    answer: String, 
    sessionId: String, 
    type: String, 
    timestamp: { type: Date, default: Date.now }
}));

const callGitHubAI = async (prompt) => {
    try {
        const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You are an expert assessment engine. Output ONLY valid JSON. Avoid common questions; use unique, deep-thinking scenarios." },
                    { role: "user", content: prompt }
                ],
                model: "gpt-4o-mini",
                temperature: 0.9 // High randomness to prevent repetition
            })
        });
        const result = await response.json();
        return result.choices[0].message.content;
    } catch (error) { throw error; }
};

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
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            const token = jwt.sign({ id: user._id }, "SECRET");
            res.json({ token, user: { name: user.username, level: user.level } });
        } else { res.status(401).json({ error: "Invalid Credentials" }); }
    } catch (e) { res.status(500).json({ error: "Auth Error" }); }
});

app.post("/generate-assessment", async (req, res) => {
    const { type, domains, limit, level } = req.body;
    const isGeneral = type === 'general';
    
    // Meta-Question logic: Randomize sub-topics to prevent repetition
    const metaTopics = ["obscure history", "theoretical physics", "modern ethics", "space exploration", "rare biology", "lost civilizations"];
    const randomMeta = metaTopics[Math.floor(Math.random() * metaTopics.length)];
    
    const domainStr = isGeneral ? `a mix of ${randomMeta} and general logic` : domains.join(", ");
    const count = limit || 3;

    try {
        let prompt = `Generate ${count} unique questions. Topic: ${domainStr}. Level: ${level}. 
        Type: ${type === 'adaptive' ? 'Scenario-based logic' : 'Multiple Choice'}.
        Seed: ${Date.now()}. 
        Constraint: MUST be non-repetitive. Use high-level vocabulary.
        Format: {"questions": [{"challenge": "string", "options": ["only if MCQ"]}]}`;

        const aiResponse = await callGitHubAI(prompt);
        const data = cleanJSON(aiResponse);
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Generation Failed" }); }
});

app.post("/evaluate-batch", async (req, res) => {
    const { username, answers, domains, sessionId, type } = req.body;
    try {
        const evalPrompt = `Evaluate these answers for ${type} assessment. 
        Context: ${domains?.join(", ") || 'General'}.
        Scoring: For MCQ/General, give exactly 10 for correct, 0 for incorrect. For Adaptive, give 0-10 based on depth.
        Answers: ${JSON.stringify(answers)}.
        Format: {"results": [{"score": 0-10, "feedback": "string"}]}`;

        const aiResponse = await callGitHubAI(evalPrompt);
        const data = cleanJSON(aiResponse);

        const savePromises = data.results.map((resItem, idx) => {
            return new Assessment({
                username, 
                domain: domains?.join(", ") || "General Knowledge", 
                challenge: answers[idx].challenge, 
                answer: answers[idx].answer, 
                sessionId, type, score: resItem.score, feedback: resItem.feedback 
            }).save();
        });
        await Promise.all(savePromises);
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Eval Failed" }); }
});

app.get("/history/:username", async (req, res) => {
    try {
        const results = await Assessment.find({ username: req.params.username }).sort({ timestamp: -1 });
        res.json(results);
    } catch (e) { res.status(500).json({ error: "History retrieval failed" }); }
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));