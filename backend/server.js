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
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS ---

const UserSchema = new mongoose.Schema({
    username: String, 
    email: { type: String, unique: true }, 
    password: { type: String }, 
    level: { type: String, default: "Beginner" }
});
const User = mongoose.model("User", UserSchema);

const AssessmentSchema = new mongoose.Schema({
    // Fixed: userId is required to link all data to the specific user profile
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String, 
    domain: String, 
    score: Number, 
    feedback: String, 
    challenge: String, 
    answer: String, 
    sessionId: String, 
    type: String, 
    difficulty: { type: String, default: "Beginner" },
    timestamp: { type: Date, default: Date.now }
});
const Assessment = mongoose.model("Assessment", AssessmentSchema);

// --- AI UTILS ---

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
                    { role: "system", content: "You are an advanced AI assessment engine. You must ONLY output valid JSON." },
                    { role: "user", content: prompt }
                ],
                model: "gpt-4o-mini",
                temperature: 0.7 
            })
        });
        const result = await response.json();
        return result.choices[0].message.content;
    } catch (error) {
        throw error;
    }
};

const cleanJSON = (text) => {
    try {
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : null;
    } catch (e) { return null; }
};

// --- ROUTES ---

app.post("/register", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ ...req.body, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ success: true });
    } catch (e) { res.status(400).json({ error: "Email exists" }); }
});

app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "NEXA_SECRET");
            // Fixed: Consistently returning 'id' so frontend can track the folder
            res.json({ 
                token, 
                user: { id: user._id, name: user.username, level: user.level } 
            });
        } else { res.status(401).json({ error: "Invalid Credentials" }); }
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.post("/generate-assessment", async (req, res) => {
    const { type, domains, limit, difficulty } = req.body;
    const isMCQ = (type === 'multi' || type === 'general');
    let topicDescription = domains.join(", ");

    try {
        let prompt = `Generate ${limit || 3} ${isMCQ ? 'MCQ' : 'Scenario'} questions for ${topicDescription} (${difficulty}). JSON format: {"questions": [{"challenge": "text", "options": ["A","B","C","D"]}]}`;
        const aiResponse = await callGitHubAI(prompt);
        res.json(cleanJSON(aiResponse));
    } catch (e) { res.status(500).json({ error: "AI Generation Error" }); }
});

app.post("/evaluate-batch", async (req, res) => {
    // Correctly extracting userId from the body sent by frontend
    const { userId, username, answers, domains, sessionId, type, difficulty } = req.body;
    
    try {
        const evalPrompt = `Evaluate these answers: ${JSON.stringify(answers)}. JSON Format: {"results": [{"score": 0-10, "feedback": "string"}]}`;
        const aiResponse = await callGitHubAI(evalPrompt);
        const data = cleanJSON(aiResponse);

        const savePromises = data.results.map((resItem, idx) => {
            return new Assessment({
                userId, // Linking to the unique MongoDB ID
                username, 
                domain: (type === 'general' ? "General Knowledge" : domains.join(", ")), 
                challenge: answers[idx].challenge, 
                answer: answers[idx].answer, 
                sessionId, type, difficulty,
                score: resItem.score, 
                feedback: resItem.feedback 
            }).save();
        });
        await Promise.all(savePromises);
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Evaluation processing failed" }); }
});

// GET History for a specific "User Folder" using their unique ID
app.get("/history/:userId", async (req, res) => {
    try {
        // Querying by userId (the ObjectId) instead of the plain string name
        const results = await Assessment.find({ userId: req.params.userId }).sort({ timestamp: -1 });
        res.json(results);
    } catch (e) { res.status(500).json({ error: "History retrieval failed" }); }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server active on ${PORT}`));