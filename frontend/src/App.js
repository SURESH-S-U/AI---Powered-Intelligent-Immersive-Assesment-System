import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Award, Loader2, LogIn, UserPlus, Eye, ShieldCheck, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

// --- STYLED SUB-COMPONENTS (Defined outside to prevent focus loss) ---
const GlassCard = ({ children, className = "", delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5, delay }}
        className={`glass-card ${className}`}
    >
        {children}
    </motion.div>
);

const App = () => {
    // UI & Auth States
    const [step, setStep] = useState("auth"); 
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: "", email: "", password: "" });
    const [token, setToken] = useState(localStorage.getItem("token"));

    // Assessment States
    const [mode, setMode] = useState(null);
    const [qCount, setQCount] = useState(1);
    const [scenario, setScenario] = useState(null);
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [scoreHistory, setScoreHistory] = useState([]);

    // --- API HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        const endpoint = isLogin ? "/auth/login" : "/auth/register";
        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                if (isLogin) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("userName", data.name);
                    setToken(data.token);
                    setStep("selection");
                } else {
                    alert("Registration successful! Please login.");
                    setIsLogin(true);
                }
            } else {
                alert(data.error || "Authentication failed");
            }
        } catch (err) {
            alert("Cannot connect to backend server.");
        }
        setLoading(false);
    };

    const startMode = async (mId) => {
        setMode(mId);
        await fetchNewChallenge(mId, 1);
        setStep("test");
    };

    const fetchNewChallenge = async (mId, count) => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/generate-assessment", {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: mId, questionCount: count })
            });
            const data = await res.json();
            setScenario(data);
        } catch (e) { 
            alert("Failed to generate AI challenge.");
        }
        setLoading(false);
    };

    const submitAnswer = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/evaluate", {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    username: localStorage.getItem("userName"), 
                    mode, 
                    challenge: scenario.challenge, 
                    answer 
                })
            });
            const result = await res.json();
            setEvaluation(result);
            setScoreHistory(prev => [...prev, result.score]);
        } catch (e) { 
            alert("Evaluation failed.");
        }
        setLoading(false);
    };

    const proceed = () => {
        if (qCount >= 10) return setStep("report");
        setEvaluation(null);
        setAnswer("");
        setQCount(qCount + 1);
        fetchNewChallenge(mode, qCount + 1);
    };

    return (
        <div className="app-container">
            <div className="bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <div className="container position-relative py-5 min-vh-100 d-flex flex-column justify-content-center">
                <AnimatePresence mode="wait">
                    
                    {/* STEP 1: AUTHENTICATION */}
                    {step === "auth" && (
                        <div className="row justify-content-center" key="auth-section">
                            <div className="col-md-5">
                                <GlassCard className="p-5">
                                    <div className="text-center mb-4">
                                        <div className="d-inline-block mb-3">
                                            <div className="icon-badge"><Brain size={40} className="text-cyan" /></div>
                                        </div>
                                        <h2 className="fw-bold tracking-tight text-gradient">NEXA INTEL</h2>
                                        <p className="text-white-50">Cognitive Neural Assessment Portal</p>
                                    </div>
                                    
                                    <form onSubmit={handleAuth}>
                                        {!isLogin && (
                                            <div className="mb-3">
                                                <label className="input-label">Identity Name</label>
                                                <input name="name" value={formData.name} onChange={handleInputChange} className="custom-input" placeholder="Enter full name" />
                                            </div>
                                        )}
                                        <div className="mb-3">
                                            <label className="input-label">Neural Email</label>
                                            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="custom-input" placeholder="name@nexus.ai" />
                                        </div>
                                        <div className="mb-4">
                                            <label className="input-label">Access Key</label>
                                            <input name="password" type="password" value={formData.password} onChange={handleInputChange} className="custom-input" placeholder="••••••••" />
                                        </div>
                                        <button type="submit" className="btn-glow-primary w-100 mb-3" disabled={loading}>
                                            {loading ? <Loader2 className="spinner me-2" /> : isLogin ? "Initialize Session" : "Create Profile"}
                                        </button>
                                    </form>
                                    <p className="text-center mt-3 small text-white-50 cursor-pointer hover-white" onClick={() => setIsLogin(!isLogin)}>
                                        {isLogin ? "New candidate? Generate access" : "Existing entity? Verify identity"}
                                    </p>
                                </GlassCard>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: MODE SELECTION */}
                    {step === "selection" && (
                        <motion.div key="selection-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                            <div className="mb-5">
                                <span className="badge rounded-pill bg-primary bg-opacity-25 text-primary px-3 py-2 mb-3">Phase 02: Protocol Selection</span>
                                <h1 className="display-4 fw-bold mb-2">Choose Your Pathway</h1>
                            </div>
                            <div className="row g-4 justify-content-center">
                                {[
                                    { id: 1, name: "Enigma Protocol", icon: <Eye />, color: "cyan", desc: "Visual Puzzles & Riddles" },
                                    { id: 2, name: "Nexus Protocol", icon: <ShieldCheck />, color: "emerald", desc: "Crisis & Situations" },
                                    { id: 3, name: "Omega Protocol", icon: <Zap />, color: "amber", desc: "Hybrid Stress Test" }
                                ].map((m) => (
                                    <div key={m.id} className="col-md-4 col-lg-3">
                                        <div className="mode-card" onClick={() => startMode(m.id)}>
                                            <div className={`mode-icon bg-${m.color}`}>{m.icon}</div>
                                            <h4 className="fw-bold">{m.name}</h4>
                                            <p className="small opacity-75 mb-4">{m.desc}</p>
                                            <div className="mode-footer"><span>Initialize</span><ArrowRight size={16} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: ASSESSMENT TEST */}
                    {step === "test" && scenario && (
                        <div className="row justify-content-center g-4" key="test-section">
                            <div className="col-lg-12">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <h5 className="mb-0 fw-bold">{localStorage.getItem("userName")}</h5>
                                        <span className="small text-white-50">Protocol Active</span>
                                    </div>
                                    <div className="text-end">
                                        <div className="small fw-bold mb-1">SYNC: {qCount}/10</div>
                                        <div className="progress-container"><motion.div className="progress-fill" animate={{ width: `${qCount*10}%` }} /></div>
                                    </div>
                                </div>
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="image-viewport">
                                            <img src={`https://image.pollinations.ai/prompt/${scenario.imagePrompt}?width=800&height=800&nologo=true&seed=${qCount}`} alt="AI Scene" />
                                            <div className="viewport-overlay"></div>
                                            <div className="scanline"></div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <GlassCard className="h-100 p-4 d-flex flex-column justify-content-between">
                                            <div>
                                                <div className="d-flex align-items-center mb-3">
                                                    <Sparkles size={18} className="text-primary me-2" />
                                                    <span className="text-uppercase small tracking-widest opacity-50">Challenge</span>
                                                </div>
                                                <h3 className="fw-bold mb-4">{scenario.challenge}</h3>
                                                {!evaluation ? (
                                                    <textarea className="custom-textarea" rows="7" placeholder="Synthesize response..." value={answer} onChange={e => setAnswer(e.target.value)} />
                                                ) : (
                                                    <div className="evaluation-box text-center">
                                                        <div className="score-ring"><span className="score-value">{evaluation.score}</span><span className="score-max">/10</span></div>
                                                        <p className="evaluation-feedback mt-3">"{evaluation.feedback}"</p>
                                                        <div className="d-flex justify-content-center gap-3 mt-2 small">
                                                            <span className="text-cyan">Logic: {evaluation.logic}%</span>
                                                            <span className="text-emerald">Tone: {evaluation.tone}%</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4">
                                                {!evaluation ? (
                                                    <button className="btn-glow-primary w-100 py-3" onClick={submitAnswer} disabled={loading || !answer}>
                                                        {loading ? <Loader2 className="spinner me-2" /> : "Verify Intelligence"}
                                                    </button>
                                                ) : (
                                                    <button className="btn-glow-outline w-100 py-3" onClick={proceed}>Advance Simulation <ArrowRight size={18} className="ms-2" /></button>
                                                )}
                                            </div>
                                        </GlassCard>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: FINAL REPORT */}
                    {step === "report" && (
                        <div className="text-center py-5" key="report-section">
                            <Award size={100} className="text-warning mb-4" />
                            <h1 className="display-2 fw-black text-gradient">COMPLETE</h1>
                            <div className="row justify-content-center mt-4">
                                <div className="col-md-5">
                                    <GlassCard className="p-5">
                                        <BarChart3 size={40} className="text-primary mb-3" />
                                        <h5 className="text-white-50">Average Intelligence Score</h5>
                                        <div className="display-1 fw-bold">{(scoreHistory.reduce((a, b) => a + b, 0) / 10).toFixed(1)}</div>
                                        <button className="btn-glow-primary w-100 mt-4" onClick={() => window.location.reload()}>Restart Neural Link</button>
                                    </GlassCard>
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                :root { --bg-dark: #020617; --primary: #3b82f6; --cyan: #06b6d4; --emerald: #10b981; --amber: #f59e0b; }
                body { background-color: var(--bg-dark); color: white; font-family: 'Inter', sans-serif; overflow-x: hidden; }
                .app-container { min-height: 100vh; position: relative; }
                .bg-blobs { position: fixed; inset: 0; z-index: 0; }
                .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; }
                .blob-1 { width: 500px; height: 500px; background: var(--primary); top: -10%; left: -10%; }
                .blob-2 { width: 600px; height: 600px; background: #6366f1; bottom: -10%; right: -10%; }
                .blob-3 { width: 400px; height: 400px; background: var(--cyan); top: 30%; left: 40%; }
                .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; }
                .text-gradient { background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .input-label { display: block; font-size: 0.75rem; text-transform: uppercase; color: rgba(255, 255, 255, 0.5); margin-bottom: 0.5rem; }
                .custom-input, .custom-textarea { width: 100%; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 0.75rem 1rem; color: white; }
                .custom-input:focus, .custom-textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
                .btn-glow-primary { background: var(--primary); color: white; border: none; border-radius: 100px; padding: 0.75rem 1.5rem; font-weight: 600; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); transition: 0.3s; }
                .btn-glow-primary:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(59, 130, 246, 0.5); }
                .btn-glow-outline { background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 100px; padding: 0.75rem 1.5rem; transition: 0.3s; }
                .mode-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 2rem; cursor: pointer; transition: 0.3s; height: 100%; }
                .mode-card:hover { background: rgba(255, 255, 255, 0.07); transform: translateY(-10px); border-color: var(--primary); }
                .mode-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
                .bg-cyan { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
                .bg-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; }
                .bg-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
                .image-viewport { height: 500px; border-radius: 24px; overflow: hidden; position: relative; border: 1px solid rgba(255, 255, 255, 0.1); }
                .image-viewport img { width: 100%; height: 100%; object-fit: cover; }
                .viewport-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); }
                .scanline { width: 100%; height: 2px; background: rgba(255, 255, 255, 0.1); position: absolute; top: 0; animation: scan 4s linear infinite; }
                @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
                .progress-container { width: 120px; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; overflow: hidden; }
                .progress-fill { height: 100%; background: var(--primary); }
                .score-ring { width: 100px; height: 100px; border: 4px solid var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                .score-value { font-size: 2.5rem; font-weight: 900; }
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default App;