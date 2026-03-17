const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');

dotenv.config();
const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors({ 
    origin: ["https://ai-powered-intelligent-immersive-as.vercel.app", "http://localhost:3000"], 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"], 
    credentials: true 
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({ 
    username: String, 
    email: { type: String, unique: true }, 
    password: { type: String, required: false }, 
    level: { type: String, default: "Beginner" }, 
    googleId: { type: String }, 
    picture: String 
});
const User = mongoose.model("User", UserSchema);

// --- Room Schema ---
const RoomSchema = new mongoose.Schema({ 
    roomCode: { type: String, unique: true }, 
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    creatorName: String, 
    settings: {
        type: { type: String },
        qCount: { type: Number },
        difficulty: { type: String },
        timer: { type: Number },
        hostAttendance: { type: String, default: 'attend' } // ADDED THIS
    }, 
    questions: Array, 
    status: { type: String, default: 'waiting' }, 
    startTime: { type: Date }, 
    participants: Array, 
    timestamp: { type: Date, default: Date.now } 
});
const Room = mongoose.model("Room", RoomSchema);

const AssessmentSchema = new mongoose.Schema({ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    username: String, 
    domain: String, 
    score: Number, 
    feedback: String, 
    challenge: String, 
    answer: String, 
    correctAnswer: String, 
    sessionId: String, 
    type: String, 
    difficulty: { type: String, default: "Beginner" }, 
    suggestion: String, 
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
                    { role: "system", content: "You are an advanced AI assessment engine. Output strictly valid JSON." }, 
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

app.post("/google-login", async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const { email, name, sub, picture } = payload; 
        let user = await User.findOne({ email });
        if (!user) { user = new User({ username: name, email: email, googleId: sub, level: "Beginner" }); await user.save(); }
        const appToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "NEXA_SECRET");
        res.json({ token: appToken, user: { id: user._id, name: user.username, level: user.level, picture: picture } });
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
            res.json({ token, user: { id: user._id, name: user.username, level: user.level, picture: user.picture } }); 
        } else { res.status(401).json({ error: "Invalid Credentials" }); } 
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// CREATE ROOM: Added "concise" prompt for adaptive mode
// CREATE ROOM: Now supports both AI generation AND Direct JSON Import

app.post("/create-room", async (req, res) => {
    // 1. Added 'customQuestions' to the destructuring
    const { creatorId, username, roomCode, settings, studyMaterial, customQuestions } = req.body;
    const { type, qCount, difficulty, timer } = settings;

    try {
        let roomQuestions;

        // 2. CHECK: If user provided their own questions via JSON, use them directly
        if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
            roomQuestions = customQuestions;
        } 
        // 3. OTHERWISE: Use the AI to generate questions (Existing Logic)
        else {
            let prompt = `Generate ${qCount} ${difficulty} level questions based on: ${studyMaterial || "General Knowledge"}. 
            Format: Return a JSON object with a "questions" array. 
            Each question must have: "challenge", "options" (array of 4 strings), "correctAnswer", and "explanation".`;
            
            if (type === 'adaptive') {
                prompt = `Generate ${qCount} situational scenarios for ${difficulty} level based on ${studyMaterial}. 
                CRITICAL: Each scenario must be concise enough to be read and answered within ${timer} seconds. 
                Format: JSON object with "questions" array. Each: {"challenge": "scenario text"}.`;
            }

            const aiResponse = await callGitHubAI(prompt);
            const data = cleanJSON(aiResponse);
            roomQuestions = data.questions;
        }

        const room = new Room({ 
            creatorId, 
            creatorName: username,
            roomCode, 
            settings, 
            questions: roomQuestions, // This will now be either AI-generated or your Custom JSON
            status: 'waiting' 
        });

        await room.save();
        res.json({ success: true, room });
    } catch (e) { 
        console.error("Room Creation Error:", e);
        res.status(500).json({ error: "Generation Error" }); 
    }
});

app.post("/room/:code/join", async (req, res) => {
    const { userId, username, picture } = req.body;
    try {
        const room = await Room.findOneAndUpdate(
            { roomCode: req.params.code },
            { $addToSet: { participants: { userId, username, picture } } }, 
            { new: true }
        );
        if (!room) return res.status(404).json({ error: "Room not found" });
        res.json(room);
    } catch (e) { res.status(500).json({ error: "Join Error" }); }
});

app.put("/room/:code/start", async (req, res) => {
    try { 
        const updatedRoom = await Room.findOneAndUpdate(
            { roomCode: req.params.code }, 
            { status: 'in-progress', startTime: new Date() },
            { new: true } 
        ); 
        res.json({ success: true, room: updatedRoom }); 
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.get("/room/:code", async (req, res) => {
    try { 
        const room = await Room.findOne({ roomCode: req.params.code }); 
        if (!room) return res.status(404).json({ error: "Not found" }); 
        res.json(room); 
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// INDIVIDUAL ASSESSMENT: Added "concise" prompt
app.post("/generate-assessment", async (req, res) => {
    const { type, domains, limit, difficulty } = req.body;
    try {
        let prompt = "";
        
        // Decide source material
        const sourceMaterial = (type === 'general') 
            ? "Global General Knowledge (Science, History, Tech, Geography, and Arts)" 
            : domains.join(", ");

        if (type === 'adaptive') {
            prompt = `Generate ${limit} ${difficulty} situational scenarios for: ${sourceMaterial}. 
            CRITICAL: Each scenario must be LESS THAN 25 WORDS. 
            Format: JSON object with a "questions" array. Each item: {"challenge": "scenario text"}.`;
        } else {
            // MCQ or General Knowledge
            prompt = `Generate ${limit} ${difficulty} level MCQ questions based on: ${sourceMaterial}. 
            Format: Return a JSON object with a "questions" array. 
            Each question must have: "challenge", "options" (array of 4 strings), "correctAnswer", and "explanation".`;
        }
        
        const aiResponse = await callGitHubAI(prompt);
        const data = cleanJSON(aiResponse);
        res.json(data || { questions: [] });
    } catch (e) { res.status(500).json({ error: "Generation Error" }); }
});

// EVALUATION BATCH
app.post("/evaluate-batch", async (req, res) => {
    const { userId, username, answers, domains, sessionId, type, difficulty } = req.body;
    try {
        let evaluatedResults = [];
        let suggestion = "";

        if (type === 'adaptive') {
            const evalPrompt = `Evaluate situational responses: ${JSON.stringify(answers)}. 
            Score each 0-10 based on accuracy and logic. Provide feedback and a "suggestion" string.
            Format: {"results": [{"score": 0, "feedback": ""}], "suggestion": "topics"}`;
            const aiResponse = await callGitHubAI(evalPrompt);
            const data = cleanJSON(aiResponse);
            evaluatedResults = data.results || [];
            suggestion = data.suggestion || "Continue refining situational analysis.";
        } else {
            // MCQ and General Knowledge evaluation
            evaluatedResults = answers.map(ans => {
                const isCorrect = ans.answer?.trim() === ans.correctAnswer?.trim();
                return {
                    score: isCorrect ? 10 : 0,
                    feedback: isCorrect ? "Correct answer." : `Incorrect. The correct answer was: ${ans.correctAnswer}`
                };
            });
            const aiReviewPrompt = `User answered these questions: ${JSON.stringify(answers)}. Analyze mistakes and suggest 3 topics to study. Return JSON: {"suggestion": "string"}`;
            const aiResponse = await callGitHubAI(aiReviewPrompt);
            const data = cleanJSON(aiResponse);
            suggestion = data?.suggestion || "Review core concepts for better accuracy.";
        }

        const total = evaluatedResults.reduce((acc, curr) => acc + curr.score, 0);
        if (total === (answers.length * 10) && total > 0) {
            suggestion = "Outstanding! Perfect neural synchronization achieved. Mastery confirmed.";
        }

        // Save History
        const savePromises = evaluatedResults.map((resItem, idx) => {
            return new Assessment({ 
                userId, username, 
                domain: (type === 'general') ? "General Knowledge" : domains.join(", "), 
                challenge: answers[idx].challenge, 
                answer: answers[idx].answer, 
                correctAnswer: answers[idx].correctAnswer || "",
                sessionId, type, difficulty, 
                score: resItem.score, 
                feedback: resItem.feedback,
                suggestion: suggestion 
            }).save();
        });

        await Promise.all(savePromises);
        res.json({ results: evaluatedResults, suggestion });
    } catch (e) { res.status(500).json({ error: "Evaluation Error" }); }
});

// ROOM RESULTS: Fixed leaderboard privacy logic and group by userId
app.get("/room-results/:roomCode", async (req, res) => {
    const { roomCode } = req.params; 
    const { userId } = req.query;
    try {
        const room = await Room.findOne({ roomCode });
        if (!room) return res.status(404).json({ error: "Room not found" });

        const allResults = await Assessment.find({ sessionId: roomCode });
        const isAdmin = room.creatorId.toString() === userId;
        const hostAttendance = room.settings.hostAttendance; // 'attend' or 'monitor'

        // Group by User
        const userStats = {};
        allResults.forEach(r => { 
            const uId = r.userId.toString();
            if (!userStats[uId]) userStats[uId] = { username: r.username, score: 0, count: 0, userId: uId }; 
            userStats[uId].score += r.score; 
            userStats[uId].count += 1; 
        });

        // 1. Create Leaderboard Array
        let leaderboard = Object.values(userStats).map(u => ({ 
            username: u.username, 
            userId: u.userId, 
            score: Math.round((u.score / (u.count * 10)) * 100) 
        })).sort((a,b) => b.score - a.score);

        // 2. TYPE 2 Logic: If Host selected 'monitor', exclude them from the leaderboard for everyone
        if (hostAttendance === 'monitor') {
            leaderboard = leaderboard.filter(entry => entry.userId !== room.creatorId.toString());
        } 
        // Note: In Type 1 ('attend'), the host will naturally be in allResults, so they remain in leaderboard.

        // 3. Dense Ranking Logic (#1, #1, #2, #2, #3)
        let currentRank = 0;
        let lastScore = -1;
        leaderboard = leaderboard.map((entry) => {
            if (entry.score !== lastScore) {
                currentRank++;
                lastScore = entry.score;
            }
            return { ...entry, rank: currentRank };
        });

        // 4. Report Visibility: Admin sees all, Participants see only their own
        const reports = isAdmin 
            ? allResults 
            : allResults.filter(r => r.userId.toString() === userId);
        
        res.json({ 
            success: true,
            leaderboard, 
            reports, 
            isAdmin, 
            creatorId: room.creatorId,
            hostAttendance: hostAttendance
        });
    } catch (e) { res.status(500).json({ error: "Error fetching results" }); }
});

app.get("/history/:userId", async (req, res) => {
    try { 
        const results = await Assessment.find({ userId: req.params.userId }).sort({ timestamp: -1 }); 
        res.json(results); 
    } catch (e) { res.status(500).json({ error: "History Error" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server active on ${PORT}`));