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

mongoose.connect(process.env.MONGO_URI).then(() => console.log("🚀 DB Connected"));

const User = mongoose.model("User", new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String
}));

const Assessment = mongoose.model("Assessment", new mongoose.Schema({
    username: String, mode: String, scenario: String, answer: String, score: Number, logic: Number, tone: Number, feedback: String, timestamp: { type: Date, default: Date.now }
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseAIResponse = (text) => {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) { return null; }
};

app.post("/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save().then(() => res.json({ message: "Done" })).catch(() => res.status(400).json({ error: "Err" }));
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user._id, name: user.name }, "secret_key");
        res.json({ token, name: user.name });
    } else res.status(401).json({ error: "Invalid" });
});

// --- UPDATED AI GENERATION FOR REAL-WORLD SITUATIONS ---
app.post("/generate-assessment", async (req, res) => {
    try {
        const { mode, questionCount } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Specific Real-World Contexts per Mode
        const modeContexts = {
            1: "Visual Protocol: Situations where you observe a detail in public (e.g., a hazard, a person's behavior, or a misplaced item).",
            2: "Logical Protocol: Situations involving money, fairness, rules, or work-place ethics.",
            3: "Intelligence Protocol: Complex social conflicts, helping someone in need, or resolving a misunderstanding."
        };

        const prompt = `
            Act as a situational psychologist. Create a unique, simple REAL-LIFE challenge.
            Theme: ${modeContexts[mode]}
            Question: ${questionCount} of 5.

            Guidelines:
            - Write 3 sentences describing a relatable situation (office, street, mall, family).
            - Ask a direct question: "What do you do?" or "How do you respond?"
            - Be highly specific and different from common tropes.
            - Provide keywords for a realistic, photographic image.

            RETURN ONLY RAW JSON:
            {
                "challenge": "3-sentence real-world story + question",
                "imagePrompt": "photorealistic keywords of the scene",
                "hint": "Social clue"
            }
        `;

        const result = await model.generateContent(prompt);
        let data = parseAIResponse(result.response.text());
        
        // Fallback if AI fails to give JSON
        if (!data) {
            data = {
                challenge: "You are in a meeting and notice your boss is accidentally sharing a private, embarrassing email on the big screen. No one else has noticed yet. How do you handle this?",
                imagePrompt: "office meeting room, projector screen, embarrassed employees, cinematic",
                hint: "Think about professional discretion."
            };
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: "AI error" }); }
});

app.post("/evaluate", async (req, res) => {
    const { username, mode, challenge, answer } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Analyze user response: "${answer}" to this situation: "${challenge}". 
    Evaluate their ethics, logic, and tone. 
    Return ONLY JSON: {"score": 1-10, "logic": 1-100, "tone": 1-100, "feedback": "One short sentence."}`;
    
    try {
        const result = await model.generateContent(prompt);
        const data = parseAIResponse(result.response.text());
        const modeNames = { 1: "Visual", 2: "Logical", 3: "Intelligence" };
        const record = new Assessment({ username, mode: modeNames[mode], scenario: challenge, answer, ...data });
        await record.save();
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Eval error" }); }
});

app.get("/history/:username", async (req, res) => {
    const data = await Assessment.find({ username: req.params.username }).sort({ timestamp: -1 });
    res.json(data);
});

app.listen(5000, () => console.log("🚀 Port 5000"));