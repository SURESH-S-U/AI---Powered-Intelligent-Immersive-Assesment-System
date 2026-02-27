const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// --- ADDED GOOGLE LIBRARY ---
const { OAuth2Client } = require('google-auth-library');

dotenv.config();
const app = express();
// --- INITIALIZE GOOGLE CLIENT ---
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(
  cors({
    origin: [
      "https://ai-powered-intelligent-immersive-as.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS ---

const UserSchema = new mongoose.Schema({
    username: String, 
    email: { type: String, unique: true }, 
    password: { type: String, required: false }, // --- UPDATED TO OPTIONAL FOR GOOGLE USERS ---
    level: { type: String, default: "Beginner" },
    googleId: { type: String }, // --- ADDED TO TRACK GOOGLE LOGINS ---
    picture: String // --- ADDED TO STORE PROFILE IMAGE URL ---
});
const User = mongoose.model("User", UserSchema);

const AssessmentSchema = new mongoose.Schema({
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
                temperature: 1.0 
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

// --- ROUTES ---

// --- NEW GOOGLE LOGIN ROUTE ---
app.post("/google-login", async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // 1. Extract 'picture' from the Google payload
        const { email, name, sub, picture } = payload; 

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                username: name,
                email: email,
                googleId: sub,
                level: "Beginner"
            });
            await user.save();
        }

        const appToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "NEXA_SECRET");
        
        // 2. Send the picture URL back to the frontend
        res.json({ 
            token: appToken, 
            user: { 
                id: user._id, 
                name: user.username, 
                level: user.level,
                picture: picture // <--- This is the Gmail image URL
            } 
        });
    } catch (e) { res.status(400).json({ error: "Google Auth Failed" }); }
});

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
            res.json({ 
                token, 
                user: { id: user._id, name: user.username, level: user.level, picture: user.picture } // --- ADDED picture TO RESPONSE ---
            });
        } else { res.status(401).json({ error: "Invalid Credentials" }); }
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.post("/generate-assessment", async (req, res) => {
    const { type, domains, limit, difficulty } = req.body;
    const isMCQ = (type === 'multi' || type === 'general');
    
    const randomSeed = Math.random().toString(36).substring(7);
    let topicDescription = (type === 'general') 
        ? `highly diverse, random, and unpredictable general knowledge topics (Seed: ${randomSeed}).` 
        : `a balanced mix of: ${domains.join(", ")}`;

    try {
        let prompt = "";

        if (isMCQ) {
            prompt = `Generate ${limit || 3} Multiple Choice Questions for ${topicDescription} (${difficulty}).
            - Provide 4 options.
            - Exactly one option MUST be the correct answer.
            JSON format: {"questions": [{"challenge": "text", "options": ["A","B","C","D"]}]}`;
        } else {
            // Updated Scenario Prompt: Focus on brevity and quick reading
            prompt = `Generate ${limit || 3} SHORT Scenario challenges for ${topicDescription} (${difficulty}).
            Guidelines:
            1. The scenario must be very concise (MAX 2-3 sentences).
            2. It must be readable and answerable by a user within 30 seconds.
            3. Do NOT use "Which of the following" or provide options.
            4. The user will type their own answer.
            5. Ensure a mix of topics if multiple domains are provided.
            JSON format: {"questions": [{"challenge": "Brief scenario description..."}]}`;
        }

        const aiResponse = await callGitHubAI(prompt);
        res.json(cleanJSON(aiResponse));
    } catch (e) { res.status(500).json({ error: "AI Generation Error" }); }
});

app.post("/evaluate-batch", async (req, res) => {
    const { userId, username, answers, domains, sessionId, type, difficulty } = req.body;
    
    try {
        // Updated Prompt: Added strict instructions to catch gibberish/random text
        const evalPrompt = `
            Evaluate these user answers for the given challenges: ${JSON.stringify(answers)}. 
            
            Strict Guidelines:
            1. If an answer is gibberish, random characters (e.g., "asdfgh"), or completely irrelevant to the question, you MUST give a score of 0.
            2. For valid answers, provide a score from 0-10 and brief feedback.
            
            JSON Format: {"results": [{"score": 0-10, "feedback": "string"}]}
        `;

        const aiResponse = await callGitHubAI(evalPrompt);
        const data = cleanJSON(aiResponse);

        const savePromises = data.results.map((resItem, idx) => {
            return new Assessment({
                userId, 
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
    } catch (e) { 
        console.error("Evaluation Error:", e);
        res.status(500).json({ error: "Evaluation processing failed" }); 
    }
});

app.get("/history/:userId", async (req, res) => {
    try {
        const results = await Assessment.find({ userId: req.params.userId }).sort({ timestamp: -1 });
        res.json(results);
    } catch (e) { res.status(500).json({ error: "History retrieval failed" }); }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server active on ${PORT}`));