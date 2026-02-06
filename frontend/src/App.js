import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, BookOpen, BarChart3, LogOut, Brain, Zap, 
    Loader2, X, Plus, ArrowRight, Target, Globe, Award, TrendingUp, 
    History as HistoryIcon, Activity, ShieldCheck, Lock, Mail, User as UserIcon, Timer, TimerOff
} from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

const glassStyle = { background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px' };
const API_URL = "http://localhost:5000";

const App = () => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
    const [activeTab, setActiveTab] = useState("dashboard");
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!user?.name) return;
        setLoadingHistory(true);
        try {
            const r = await fetch(`${API_URL}/history/${user.name}`);
            const data = await r.json();
            setHistory(data);
        } catch (e) { console.error("History fetch failed"); }
        finally { setLoadingHistory(false); }
    }, [user?.name]);

    useEffect(() => {
        if (token) fetchHistory();
    }, [token, fetchHistory]);

    const onAuth = (data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token); setUser(data.user);
    };

    if (!token) return <AuthPage onAuth={onAuth} />;

    return (
        <div className="d-flex vh-100 overflow-hidden text-white w-100" style={{ background: '#020617', fontFamily: "'Inter', sans-serif" }}>
            <nav className="sidebar-container d-flex flex-column p-4 h-100">
                <div className="d-flex align-items-center gap-3 mb-5 px-2">
                    <div className="p-2 rounded-3 bg-primary bg-opacity-20"><Brain size={28} className="text-primary" /></div>
                    <h4 className="fw-black mb-0 tracking-tighter">NEXA INTEL</h4>
                </div>
                <div className="flex-grow-1">
                    {[
                        { id: 'dashboard', icon: <LayoutDashboard size={18}/>, label: 'Dashboard' },
                        { id: 'assessments', icon: <BookOpen size={18}/>, label: 'Assessments' },
                        { id: 'reports', icon: <BarChart3 size={18}/>, label: 'Reports' },
                    ].map(item => (
                        <div key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-link-custom ${activeTab === item.id ? 'active' : ''}`}>
                            {item.icon} <span>{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="logout-btn mt-auto" onClick={() => { localStorage.clear(); window.location.reload(); }}>
                    <LogOut size={18}/> <span>Terminate Link</span>
                </div>
            </nav>

            <main className="flex-grow-1 p-5 overflow-auto position-relative">
                <div className="bg-glow"></div>
                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && <DashboardView user={user} setTab={setActiveTab} history={history} key="dash" />}
                    {activeTab === 'assessments' && <AssessmentCenter user={user} refreshHistory={fetchHistory} key="assess" />}
                    {activeTab === 'reports' && <ReportsView user={user} history={history} loading={loadingHistory} key="report" />}
                </AnimatePresence>
            </main>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Space+Mono&display=swap');
                .sidebar-container { width: 280px; background: rgba(2, 6, 23, 0.4); border-right: 1px solid rgba(255,255,255,0.05); z-index: 100; }
                .nav-link-custom { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 12px; margin-bottom: 8px; cursor: pointer; color: rgba(255,255,255,0.5); transition: 0.3s; }
                .nav-link-custom.active { background: rgba(59, 130, 246, 0.1); color: #3b82f6; box-shadow: inset 0 0 20px rgba(59,130,246,0.05); }
                .logout-btn { display: flex; align-items: center; gap: 12px; padding: 14px 20px; color: #ef4444; opacity: 0.7; cursor: pointer; transition: 0.3s; }
                .logout-btn:hover { opacity: 1; background: rgba(239, 68, 68, 0.05); border-radius: 12px; }
                .bg-glow { position: fixed; top: 0; right: 0; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%); z-index: -1; }
                .fw-black { font-weight: 900; }
                .text-gradient { background: linear-gradient(to right, #06b6d4, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .protocol-card { cursor: pointer; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 1px solid rgba(255,255,255,0.05); }
                .protocol-card:hover { transform: translateY(-10px); border-color: #3b82f6; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                .custom-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; color: white; width: 100%; outline: none; transition: 0.3s; }
                .custom-input:focus { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
                .domain-tag { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59,130,246,0.3); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; }
                .challenge-text { font-family: 'Inter', sans-serif; letter-spacing: -0.02em; line-height: 1.3; font-weight: 700; color: #f8fafc; }
                .scenario-text { color: #64748b; font-size: 1.1rem; margin-bottom: 0.5rem; }
                .timer-bar { height: 4px; background: #3b82f6; transition: width 1s linear; border-radius: 2px; }
            `}</style>
        </div>
    );
};

const AuthPage = ({ onAuth }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/${isRegister ? 'register' : 'login'}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.token) onAuth(data); 
            else if (isRegister && res.ok) { alert("Profile Created. Please Login."); setIsRegister(false); }
            else alert(data.error || "Authentication Failed");
        } catch (e) { alert("Neural Link Error"); }
        finally { setLoading(false); }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-bg-gradient-1"></div>
            <div className="auth-bg-gradient-2"></div>
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo-box"><Brain size={32} className="text-primary" /></div>
                    <h2 className="auth-title">NEXA <span className="text-primary">INTEL</span></h2>
                    <p className="auth-subtitle">{isRegister ? "IDENTITY CREATION PROTOCOL" : "NEURAL ACCESS INTERFACE"}</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                    {isRegister && <div className="input-field"><UserIcon size={18} className="input-icon" /><input type="text" placeholder="Full Name" onChange={e => setFormData({ ...formData, username: e.target.value })} required /></div>}
                    <div className="input-field"><Mail size={18} className="input-icon" /><input type="email" placeholder="Neural ID (Email)" onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
                    <div className="input-field"><Lock size={18} className="input-icon" /><input type="password" placeholder="Secure Passkey" onChange={e => setFormData({ ...formData, password: e.target.value })} required /></div>
                    <button className="auth-btn" disabled={loading}>{loading ? <Loader2 className="spinner-border spinner-border-sm" /> : <>{isRegister ? "CREATE PROFILE" : "INITIALIZE LINK"}<ArrowRight size={18} className="ms-2" /></>}</button>
                </form>
                <div className="auth-footer"><span>{isRegister ? "Already have a profile?" : "New subject identifier?"}</span><button className="switch-mode-btn" onClick={() => setIsRegister(!isRegister)}>{isRegister ? "Login to Link" : "Create New Profile"}</button></div>
            </div>
            <style>{`
                .auth-wrapper { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #020617; position: relative; overflow: hidden; }
                .auth-bg-gradient-1 { position: absolute; top: -10%; left: -10%; width: 50%; height: 50%; background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%); }
                .auth-bg-gradient-2 { position: absolute; bottom: -10%; right: -10%; width: 50%; height: 50%; background: radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%); }
                .auth-card { width: 420px; padding: 3rem; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 32px; z-index: 10; }
                .auth-header { text-align: center; margin-bottom: 2.5rem; }
                .auth-logo-box { display: inline-flex; padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 20px; margin-bottom: 1rem; }
                .auth-title { font-weight: 900; color: white; }
                .auth-subtitle { font-family: 'Space Mono', monospace; font-size: 0.7rem; color: #64748b; letter-spacing: 1.5px; }
                .auth-form { display: flex; flex-direction: column; gap: 1rem; }
                .input-field { position: relative; width: 100%; }
                .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; }
                .input-field input { width: 100%; padding: 1rem 1rem 1rem 3.2rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: white; outline: none; }
                .auth-btn { margin-top: 1rem; padding: 1rem; background: #3b82f6; border: none; border-radius: 14px; color: white; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .auth-footer { margin-top: 2rem; text-align: center; font-size: 0.85rem; color: #64748b; }
                .switch-mode-btn { background: transparent; border: none; color: #3b82f6; font-weight: 700; margin-left: 0.5rem; cursor: pointer; }
            `}</style>
        </div>
    );
};

const DashboardView = ({user, setTab, history }) => {
    const stats = useMemo(() => {
        const totalQs = history.length;
        // Logic fix: Unique session IDs represent completed or ongoing sessions
        const uniqueSessions = new Set(history.map(h => h.sessionId)).size;
        
        const totalPossibleScore = totalQs * 10;
        const totalActualScore = history.reduce((acc, curr) => acc + curr.score, 0);
        
        const avgAccuracy = totalPossibleScore > 0 ? Math.round((totalActualScore / totalPossibleScore) * 100) : 0;
        
        let rating = "C";
        if (avgAccuracy >= 90) rating = "S";
        else if (avgAccuracy >= 80) rating = "A+";
        else if (avgAccuracy >= 70) rating = "A";
        else if (avgAccuracy >= 50) rating = "B";
        
        return { accuracy: `${avgAccuracy}%`, syncs: uniqueSessions, rating };
    }, [history]);

    const skillMatrix = useMemo(() => {
        const domains = {};
        history.forEach(h => {
            const d = h.domain || "General";
            if (!domains[d]) domains[d] = { total: 0, count: 0 };
            domains[d].total += h.score;
            domains[d].count += 1;
        });
        return Object.keys(domains).map(name => ({
            name,
            percent: Math.round((domains[name].total / (domains[name].count * 10)) * 100)
        })).slice(0, 3);
    }, [history]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 d-flex justify-content-between align-items-end">
                <div><h6 className="text-primary fw-bold tracking-widest mb-2 uppercase">Core Status: Online</h6><h1 className="display-4 fw-black">Welcome, {user?.name}</h1></div>
                <div className="p-3 px-4 rounded-4" style={glassStyle}><span className="small opacity-50 d-block">Intelligence Level</span><span className="h4 fw-black text-gradient">{user?.level}</span></div>
            </div>
            <div className="row g-4 mb-5">
                {[
                    { label: 'Avg Accuracy', value: stats.accuracy, icon: <TrendingUp size={20}/>, color: '#3b82f6' },
                    { label: 'Neural Syncs', value: stats.syncs, icon: <Activity size={20}/>, color: '#10b981' },
                    { label: 'Logic Rating', value: stats.rating, icon: <ShieldCheck size={20}/>, color: '#8b5cf6' }
                ].map((s, i) => (
                    <div className="col-md-4" key={i}><div className="p-4" style={glassStyle}><div className="mb-3" style={{ color: s.color }}>{s.icon}</div><h2 className="fw-black mb-1">{s.value}</h2><p className="small opacity-40 uppercase tracking-widest mb-0">{s.label}</p></div></div>
                ))}
            </div>
            <div className="row g-4">
                <div className="col-md-8">
                    <div className="p-5 rounded-5 h-100" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), transparent)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <h2 className="fw-black mb-3">Initialize Neural Expansion</h2>
                        <p className="opacity-60 mb-4 fs-5">Ready to assess your technical expertise? Our AI core is synchronized and waiting for your domain parameters.</p>
                        <button className="btn btn-primary btn-lg rounded-pill px-5 fw-bold" onClick={() => setTab('assessments')}>START ASSESSMENT <ArrowRight size={18} className="ms-2"/></button>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="p-4 h-100" style={glassStyle}>
                        <h6 className="fw-bold mb-4 opacity-50">SKILL MATRIX</h6>
                        {(skillMatrix.length > 0 ? skillMatrix : [{name: 'Waiting for Data', percent: 0}]).map(skill => (
                            <div className="mb-4" key={skill.name}>
                                <div className="d-flex justify-content-between mb-2 small fw-bold"><span>{skill.name}</span><span className="text-primary">{skill.percent}%</span></div>
                                <div className="progress" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}><div className="progress-bar bg-primary" style={{ width: `${skill.percent}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const AssessmentCenter = ({ user, refreshHistory }) => {
    const [domains, setDomains] = useState([]);
    const [input, setInput] = useState("");
    const [session, setSession] = useState(null);
    const [qCount, setQCount] = useState(3);
    const [isTimed, setIsTimed] = useState(false);

    if (session) return <ActiveSession user={user} domains={domains} type={session} limit={qCount} isTimed={isTimed} onEnd={() => { setSession(null); refreshHistory(); }} />;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-5"><h1 className="fw-black mb-2">Assessment Center</h1><p className="opacity-50">Define parameters and question limit before synchronization.</p></div>
            <div className="p-5 mb-4" style={glassStyle}>
                <div className="row g-4 align-items-center">
                    <div className="col-md-5">
                        <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest">Set Knowledge Domains</h6>
                        <div className="d-flex gap-3 mb-3">
                            <input className="custom-input" placeholder="e.g. HTML, Science..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (input && (setDomains([...domains, input]), setInput("")))} />
                            <button className="btn btn-primary px-4 rounded-3" onClick={() => { if(input) { setDomains([...domains, input]); setInput(""); } }}><Plus size={24} /></button>
                        </div>
                        <div className="d-flex flex-wrap gap-2">{domains.map(d => (<span key={d} className="domain-tag">{d} <X size={14} style={{ cursor: 'pointer' }} onClick={() => setDomains(domains.filter(i => i !== d))} /></span>))}</div>
                    </div>
                    <div className="col-md-4">
                        <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest">Question Quantity</h6>
                        <div className="d-flex gap-2">
                            <select className="custom-input" value={qCount} style={{width: '60%'}} onChange={(e) => setQCount(parseInt(e.target.value))}>
                                {[1, 2, 3, 5, 10, 15, 20].map(n => <option key={n} value={n} style={{background: '#020617'}}>{n} Qs</option>)}
                            </select>
                            <input type="number" className="custom-input" placeholder="Custom" style={{width: '40%'}} onChange={(e) => setQCount(parseInt(e.target.value) || 1)} />
                        </div>
                    </div>
                    <div className="col-md-3">
                        <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest">Protocol Type</h6>
                        <div className={`custom-input d-flex align-items-center justify-content-between cursor-pointer ${isTimed ? 'border-primary' : ''}`} onClick={() => setIsTimed(!isTimed)} style={{cursor: 'pointer'}}>
                            <span>{isTimed ? 'Timed (30s)' : 'No Timer'}</span>
                            {isTimed ? <Timer className="text-primary" size={20}/> : <TimerOff className="opacity-40" size={20}/>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="row g-4">
                {[
                    { id: 'adaptive', title: 'Adaptive Scenario', desc: 'Situational text-based reasoning.', icon: <Zap/> }, 
                    { id: 'multi', title: 'Multiple Choice', desc: 'Selection-based knowledge verify.', icon: <Target/> }, 
                    { id: 'general', title: 'General Knowledge', desc: 'Random high-level trivia.', icon: <Globe/> }
                ].map(p => (
                    <div className="col-md-4" key={p.id}>
                        <div className="protocol-card p-5 h-100" style={glassStyle} onClick={() => setSession(p.id)}>
                            <div className="text-primary mb-4">{p.icon}</div>
                            <h4 className="fw-bold mb-3">{p.title}</h4>
                            <p className="small opacity-50 mb-4">{p.desc}</p>
                            <div className="text-primary fw-bold small d-flex align-items-center gap-2 uppercase tracking-widest">Start Protocol <ArrowRight size={14}/></div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const ActiveSession = ({ user, domains, type, limit, isTimed, onEnd }) => {
    const [scenario, setScenario] = useState(null);
    const [answer, setAnswer] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [sessionScores, setSessionScores] = useState([]);
    const [sessionId] = useState(`session_${Date.now()}`);
    const [timeLeft, setTimeLeft] = useState(30);
    const timerRef = useRef(null);

    const fetchChallenge = useCallback(async () => {
        setLoading(true); setScenario(null); setAnswer(""); setResult(null); setTimeLeft(30);
        try {
            const res = await fetch(`${API_URL}/generate-assessment`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ type, level: user.level, domains }) 
            });
            const data = await res.json();
            setScenario(data);
        } catch (e) { alert("Core Link Failed"); onEnd(); }
        finally { setLoading(false); }
    }, [user.level, domains, type, onEnd]);

    useEffect(() => { fetchChallenge(); }, [fetchChallenge]);

    // Timer Logic
    useEffect(() => {
        if (isTimed && !loading && !evaluating && !result && currentStep !== -1) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        autoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [loading, evaluating, result, currentStep]);

    const submit = async (autoAnswer = null) => {
        clearInterval(timerRef.current);
        setEvaluating(true);
        const finalAnswer = autoAnswer || answer || "No response provided";
        try {
            const res = await fetch(`${API_URL}/evaluate`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user.name, answer: finalAnswer, challenge: scenario.challenge, domains, sessionId, type })
            });
            const data = await res.json();
            setResult(data);
            setSessionScores([...sessionScores, data.score]);
        } finally { setEvaluating(false); }
    };

    const autoSubmit = () => {
        if (!result) submit();
    };

    const handleNext = () => {
        if (currentStep < limit) {
            setCurrentStep(prev => prev + 1);
            fetchChallenge();
        } else {
            setCurrentStep(-1);
        }
    };

    const overallAccuracy = currentStep === -1 
        ? Math.round((sessionScores.reduce((a, b) => a + b, 0) / (limit * 10)) * 100) 
        : 0;

    return (
        <div className="mx-auto" style={{ maxWidth: '850px' }}>
            <div className="p-5" style={glassStyle}>
                <div className="d-flex justify-content-between mb-4 align-items-center">
                    <span className="text-primary fw-bold small tracking-widest uppercase">
                        {currentStep === -1 ? "Protocol Summary" : `${type.toUpperCase()} - Q ${currentStep}/${limit}`}
                    </span>
                    <div className="d-flex align-items-center gap-3">
                        {isTimed && currentStep !== -1 && !result && !loading && (
                            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20">
                                <Timer size={14}/> <span className="fw-bold">{timeLeft}s</span>
                            </div>
                        )}
                        <X onClick={onEnd} style={{ cursor: 'pointer' }} className="opacity-50" />
                    </div>
                </div>

                {isTimed && !loading && !result && currentStep !== -1 && (
                    <div className="mb-4 w-100" style={{background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px'}}>
                        <div className="timer-bar" style={{ width: `${(timeLeft/30)*100}%` }}></div>
                    </div>
                )}

                {loading && currentStep !== -1 ? (
                    <div className="text-center py-5"><Loader2 className="spinner-border text-primary mb-3" /><p className="fw-bold opacity-50">SYNCING NEURAL LINK...</p></div>
                ) : currentStep === -1 ? (
                    <div className="text-center">
                        <h6 className="text-primary fw-bold tracking-widest uppercase mb-4">Neural Evaluation Complete</h6>
                        <h1 className="display-1 fw-black mb-3 text-gradient">{overallAccuracy}%</h1>
                        <p className="fs-5 opacity-50 mb-5">Overall accuracy achieved across {limit} challenges.</p>
                        <button className="btn btn-primary btn-lg px-5 rounded-pill fw-bold" onClick={onEnd}>Return to Hub</button>
                    </div>
                ) : (
                    <>
                        <div className="mb-5">
                            {scenario?.challenge.split('Question:').map((text, i) => (
                                <div key={i} className={i === 0 ? "scenario-text" : "challenge-text h2"}>{text}{i === 0 ? "" : "?"}</div>
                            ))}
                        </div>
                        {!result ? (
                            <>
                                {scenario?.options && type !== 'adaptive' ? (
                                    <div className="row g-3 mb-5">{scenario.options.map(o => (<div className="col-md-6" key={o}><button className={`btn w-100 py-3 rounded-4 fw-bold transition-all ${answer === o ? 'btn-primary shadow-lg' : 'btn-outline-light opacity-50'}`} onClick={() => setAnswer(o)}>{o}</button></div>))}</div>
                                ) : (
                                    <textarea className="custom-input mb-5 challenge-text" style={{ fontSize: '1.1rem', fontWeight: '400' }} rows="4" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your detailed reasoning here..."/>
                                )}
                                <button className="btn btn-primary w-100 py-3 fw-bold rounded-4 shadow-lg" onClick={() => submit()} disabled={evaluating || (!answer && type !== 'adaptive')}>{evaluating ? <><Loader2 className="spinner-border spinner-border-sm me-2"/> ANALYZING...</> : "SUBMIT RESPONSE"}</button>
                            </>
                        ) : (
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                                {type === 'adaptive' ? (
                                    <>
                                        <h1 className={`display-3 fw-black mb-2 ${result.score === 0 ? 'text-danger' : 'text-primary'}`}>{result.score * 10}%</h1>
                                        <p className="small text-primary fw-bold uppercase tracking-widest mb-4">Question Accuracy</p>
                                    </>
                                ) : (
                                    <>
                                        <h1 className={`display-4 fw-black mb-2 ${result.score > 0 ? 'text-success' : 'text-danger'}`}>
                                            {result.score > 0 ? 'CORRECT' : 'INCORRECT'}
                                        </h1>
                                        <p className="small text-primary fw-bold uppercase tracking-widest mb-4">Validation Status</p>
                                    </>
                                )}
                                <p className="fs-5 opacity-75 mb-5 px-md-5 italic">"{result.feedback}"</p>
                                <button className="btn btn-primary btn-lg px-5 rounded-pill fw-bold" onClick={handleNext}>
                                    {currentStep === limit ? "View Final Summary" : "Next Challenge"} <ArrowRight size={18} className="ms-2"/>
                                </button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const ReportsView = ({ user, history, loading }) => {
    const [expandedSession, setExpandedSession] = useState(null);
    const sessions = useMemo(() => {
        const groups = {};
        history.forEach(item => {
            const sid = item.sessionId || 'legacy';
            if (!groups[sid]) groups[sid] = { id: sid, domain: item.domain, timestamp: item.timestamp, items: [], avgScore: 0 };
            groups[sid].items.push(item);
        });
        return Object.values(groups).map(s => {
            const total = s.items.reduce((acc, curr) => acc + curr.score, 0);
            s.avgScore = Math.round((total / (s.items.length * 10)) * 100);
            return s;
        }).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [history]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-5"><h1 className="fw-black mb-1">Intelligence History</h1><p className="opacity-50">Review overall session sync levels or drill down into specifics.</p></div>
            {loading ? <div className="text-center py-5"><Loader2 className="spinner-border text-primary" /></div> : (
                <div className="row g-4"><div className="col-md-12">{sessions.map((s) => (
                    <div key={s.id} className="p-4 mb-3 rounded-4" style={glassStyle}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)} style={{cursor: 'pointer'}}><span className="badge bg-primary bg-opacity-20 text-primary mb-2">SESSION: {s.domain?.toUpperCase() || "GENERAL"}</span><h4 className="mb-0 fw-bold">Sync Level: <span className="text-primary">{s.avgScore}%</span></h4><p className="small opacity-40 mb-0 mt-1">{new Date(s.timestamp).toLocaleString()} • {s.items.length} Challenges</p></div>
                            <button className="btn btn-outline-primary rounded-pill px-4 btn-sm" onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}>{expandedSession === s.id ? "Hide Details" : "View Details"}</button>
                        </div>
                        <AnimatePresence>{expandedSession === s.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-top border-white border-opacity-10"><div className="row g-3">{s.items.map((item, idx) => (
                                <div key={idx} className="col-12"><div className="p-3 rounded-3" style={{background: 'rgba(255,255,255,0.02)'}}><div className="d-flex justify-content-between mb-2"><span className="text-primary small fw-bold">CHALLENGE {idx + 1}</span><span className={`fw-bold ${item.score === 0 ? 'text-danger' : 'text-primary'}`}>{item.score * 10}%</span></div><p className="small mb-2 fw-bold">Q: {item.challenge}</p><p className="small opacity-50 mb-0 italic">Feedback: {item.feedback}</p></div></div>
                            ))}</div></motion.div>
                        )}</AnimatePresence>
                    </div>
                ))}</div></div>
            )}
        </motion.div>
    );
};

export default App;