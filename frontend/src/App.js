import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Award, Loader2, Eye, ShieldCheck, BarChart3, ArrowRight, Sparkles, LogOut, Target, TrendingUp, Activity } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

const GlassCard = ({ children, className = "" }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`glass-card ${className}`}>{children}</motion.div>
);

const App = () => {
    // PERSISTENCE LOGIC
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [step, setStep] = useState(localStorage.getItem("step") || (localStorage.getItem("token") ? "selection" : "auth"));
    const [mode, setMode] = useState(JSON.parse(localStorage.getItem("mode")) || null);
    const [qCount, setQCount] = useState(JSON.parse(localStorage.getItem("qCount")) || 1);
    const [scenario, setScenario] = useState(JSON.parse(localStorage.getItem("scenario")) || null);
    const [answer, setAnswer] = useState(localStorage.getItem("answer") || "");
    const [scoreHistory, setScoreHistory] = useState(JSON.parse(localStorage.getItem("scoreHistory")) || []);
    
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [stats, setStats] = useState({ avg: 0, total: 0, high: 0 });

    useEffect(() => {
        localStorage.setItem("step", step);
        localStorage.setItem("mode", JSON.stringify(mode));
        localStorage.setItem("qCount", JSON.stringify(qCount));
        localStorage.setItem("scenario", JSON.stringify(scenario));
        localStorage.setItem("answer", answer);
        localStorage.setItem("scoreHistory", JSON.stringify(scoreHistory));
    }, [step, mode, qCount, scenario, answer, scoreHistory]);

    const fetchDashboard = useCallback(async () => {
        const user = localStorage.getItem("userName");
        if (!user) return;
        try {
            const res = await fetch(`http://localhost:5000/history/${user}`);
            const data = await res.json();
            if (data.length > 0) {
                const scores = data.map(i => i.score);
                setStats({ avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1), total: data.length, high: Math.max(...scores) });
            }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { if (token) fetchDashboard(); }, [token, fetchDashboard]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        const endpoint = isLogin ? "/auth/login" : "/auth/register";
        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
            const data = await res.json();
            if (res.ok) {
                if (isLogin) {
                    localStorage.setItem("token", data.token); localStorage.setItem("userName", data.name);
                    setToken(data.token); setStep("selection");
                } else { alert("Login now."); setIsLogin(true); }
            } else alert(data.error);
        } catch (err) { alert("Server error"); }
        setLoading(false);
    };

    const fetchChallenge = async (mId, count) => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/generate-assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: mId, questionCount: count }) });
            const data = await res.json();
            setScenario(data);
        } catch (e) { alert("AI sync error"); }
        setLoading(false);
    };

    const startMode = async (mId) => {
        // Clear old test data so it doesn't show old questions on refresh
        setScenario(null); setAnswer(""); setEvaluation(null); setQCount(1); setScoreHistory([]);
        setMode(mId); setStep("test");
        await fetchChallenge(mId, 1);
    };

    const submitAnswer = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: localStorage.getItem("userName"), mode, challenge: scenario.challenge, answer }) });
            const data = await res.json();
            setEvaluation(data); setScoreHistory(prev => [...prev, data.score]);
        } catch (e) { alert("Eval error"); }
        setLoading(false);
    };

    const nextStep = () => {
        if (qCount >= 5) { setStep("report"); fetchDashboard(); }
        else { setEvaluation(null); setAnswer(""); const nextQ = qCount + 1; setQCount(nextQ); fetchChallenge(mode, nextQ); }
    };

    const logout = () => { localStorage.clear(); window.location.reload(); };

    return (
        <div className="app-container">
            <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div><div className="blob blob-3"></div></div>

            {token && (
                <div className="position-fixed top-0 end-0 p-4" style={{ zIndex: 100 }}>
                    <button onClick={logout} className="btn-glow-outline d-flex align-items-center gap-2 px-3 py-2"><LogOut size={16} /> Terminate Link</button>
                </div>
            )}

            <div className="container position-relative py-5 min-vh-100 d-flex flex-column justify-content-center">
                <AnimatePresence mode="wait">

                    {step === "auth" && (
                        <div className="row justify-content-center" key="auth">
                            <div className="col-md-5">
                                <GlassCard className="p-5 text-center">
                                    <div className="icon-badge mb-3"><Brain size={40} className="text-cyan" /></div>
                                    <h2 className="fw-bold text-gradient">NEXA INTEL</h2>
                                    <form onSubmit={handleAuth} className="mt-4 text-start">
                                        {!isLogin && <div className="mb-3"><label className="input-label">Name</label><input className="custom-input" onChange={e => setFormData({...formData, name: e.target.value})} /></div>}
                                        <div className="mb-3"><label className="input-label">Email</label><input className="custom-input" type="email" onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                                        <div className="mb-4"><label className="input-label">Access Key</label><input className="custom-input" type="password" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                                        <button className="btn-glow-primary w-100">{loading ? <Loader2 className="spinner" /> : isLogin ? "Initialize Session" : "Create Profile"}</button>
                                    </form>
                                    <p className="mt-3 small opacity-50 cursor-pointer" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Generate Profile" : "Login"}</p>
                                </GlassCard>
                            </div>
                        </div>
                    )}

                    {step === "selection" && (
                        <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                            {/* DASHBOARD BAR */}
                            <div className="row justify-content-center mb-5">
                                <div className="col-md-10">
                                    <GlassCard className="p-4 bg-primary bg-opacity-10 border-primary border-opacity-20">
                                        <div className="row align-items-center g-3">
                                            <div className="col-md-3 border-end border-white border-opacity-10 text-start ps-4">
                                                <div className="small opacity-50 uppercase tracking-widest">Subject</div>
                                                <h5 className="fw-bold mb-0 text-gradient">{localStorage.getItem("userName")}</h5>
                                            </div>
                                            <div className="col-md-3"><div className="small opacity-50 mb-1"><Activity size={14}/> Total Tests</div><h4 className="fw-black mb-0">{stats.total}</h4></div>
                                            <div className="col-md-3"><div className="small opacity-50 mb-1"><Target size={14}/> Avg Precision</div><h4 className="fw-black mb-0">{stats.avg}</h4></div>
                                            <div className="col-md-3"><div className="small opacity-50 mb-1"><TrendingUp size={14}/> Peak Intel</div><h4 className="fw-black mb-0">{stats.high}</h4></div>
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>

                            <h1 className="display-4 fw-bold mb-5">Neural Protocols</h1>
                            <div className="row g-4 justify-content-center">
                                {[
                                    { id: 1, name: "Visual", icon: <Eye />, color: "cyan", desc: "Observation & Perception" },
                                    { id: 2, name: "Logical", icon: <ShieldCheck />, color: "emerald", desc: "Ethics & Reason" },
                                    { id: 3, name: "Intelligence", icon: <Zap />, color: "amber", desc: "Conflict Resolution" }
                                ].map((m) => (
                                    <div key={m.id} className="col-md-4 col-lg-3">
                                        <div className="mode-card" onClick={() => startMode(m.id)}>
                                            <div className={`mode-icon bg-${m.color}`}>{m.icon}</div>
                                            <h4 className="fw-bold">{m.name}</h4>
                                            <p className="small opacity-75">{m.desc}</p>
                                            <div className="mode-footer mt-4"><span>Initialize</span><ArrowRight size={16} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === "test" && (
                        <div className="row justify-content-center g-4" key="test">
                            <div className="col-lg-12">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div><h5 className="mb-0 fw-bold">Simulation Active</h5><span className="small opacity-50">Protocol {mode === 1 ? 'Visual' : mode === 2 ? 'Logical' : 'Intelligence'}</span></div>
                                    <div className="text-end">
                                        <div className="small fw-bold mb-1">SYNC: {qCount}/5</div>
                                        <div className="progress-container"><motion.div className="progress-fill" animate={{ width: `${qCount * 20}%` }} /></div>
                                    </div>
                                </div>
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="image-viewport">
                                            {loading ? <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-dark"><Loader2 className="spinner text-primary" size={40}/></div> : 
                                            <img src={`https://image.pollinations.ai/prompt/${scenario?.imagePrompt}?width=800&height=800&nologo=true&seed=${qCount}`} alt="Scene" />}
                                            <div className="scanline"></div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <GlassCard className="h-100 p-4 d-flex flex-column justify-content-between">
                                            <div>
                                                <div className="d-flex align-items-center mb-3 opacity-50 small uppercase tracking-widest"><Sparkles size={16} className="me-2 text-primary" /> Challenge</div>
                                                {loading ? <div className="placeholder-glow"><span className="placeholder col-12 bg-secondary"></span><span className="placeholder col-8 bg-secondary"></span></div> : 
                                                <h4 className="fw-bold mb-4">{scenario?.challenge}</h4>}
                                                
                                                {!evaluation ? (
                                                    <textarea className="custom-textarea" rows="6" placeholder="Describe your reaction..." value={answer} onChange={e => setAnswer(e.target.value)} disabled={loading} />
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="score-ring"><span className="score-value">{evaluation.score}</span></div>
                                                        <p className="mt-3 italic opacity-75">"{evaluation.feedback}"</p>
                                                        <div className="d-flex justify-content-center gap-4 mt-2 small">
                                                            <span className="text-cyan">Logic: {evaluation.logic}%</span>
                                                            <span className="text-emerald">Tone: {evaluation.tone}%</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4">
                                                {!evaluation ? (
                                                    <button className="btn-glow-primary w-100 py-3" onClick={submitAnswer} disabled={loading || !answer}>{loading ? <Loader2 className="spinner" /> : "Verify Session"}</button>
                                                ) : (
                                                    <button className="btn-glow-outline w-100 py-3" onClick={nextStep}>Advance Link <ArrowRight size={18} /></button>
                                                )}
                                            </div>
                                        </GlassCard>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "report" && (
                        <div className="text-center py-5" key="report">
                            <Award size={100} className="text-warning mb-4" />
                            <h1 className="display-2 fw-black text-gradient">SYNC COMPLETE</h1>
                            <div className="col-md-5 mx-auto mt-4">
                                <GlassCard className="p-5">
                                    <BarChart3 size={40} className="text-primary mb-3" />
                                    <h5 className="opacity-50">Session Accuracy</h5>
                                    <div className="display-1 fw-bold">{(scoreHistory.reduce((a, b) => a + b, 0) / 5).toFixed(1)}</div>
                                    <button className="btn-glow-primary w-100 mt-4" onClick={() => {
                                        ["mode", "qCount", "scenario", "scoreHistory", "step"].forEach(k => localStorage.removeItem(k));
                                        setStep("selection");
                                    }}>Return to Nexus</button>
                                </GlassCard>
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
                .custom-input:focus, .custom-textarea:focus { outline: none; border-color: var(--primary); }
                .btn-glow-primary { background: var(--primary); color: white; border: none; border-radius: 100px; padding: 0.75rem 1.5rem; font-weight: 600; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); transition: 0.3s; cursor: pointer; }
                .btn-glow-primary:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(59, 130, 246, 0.5); }
                .btn-glow-outline { background: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 100px; padding: 0.75rem 1.5rem; cursor: pointer; }
                .mode-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 2rem; cursor: pointer; transition: 0.3s; height: 100%; }
                .mode-card:hover { transform: translateY(-10px); border-color: var(--primary); }
                .mode-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
                .bg-cyan { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
                .bg-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; }
                .bg-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
                .image-viewport { height: 500px; border-radius: 24px; overflow: hidden; position: relative; border: 1px solid rgba(255, 255, 255, 0.1); }
                .image-viewport img { width: 100%; height: 100%; object-fit: cover; }
                .scanline { width: 100%; height: 2px; background: rgba(255, 255, 255, 0.1); position: absolute; top: 0; animation: scan 4s linear infinite; }
                @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
                .progress-container { width: 120px; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; overflow: hidden; }
                .progress-fill { height: 100%; background: var(--primary); }
                .score-ring { width: 100px; height: 100px; border: 4px solid var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                .score-value { font-size: 2.5rem; font-weight: 900; }
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .fw-black { font-weight: 900; }
                .uppercase { text-transform: uppercase; }
                .italic { font-style: italic; }
            `}</style>
        </div>
    );
};

export default App;