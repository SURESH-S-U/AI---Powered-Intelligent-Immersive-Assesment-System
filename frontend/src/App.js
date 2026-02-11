import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, BookOpen, BarChart3, LogOut, Brain, Zap, 
    Loader2, X, Plus, ArrowRight, Target, Globe, TrendingUp, 
    Activity, ShieldCheck, Lock, Mail, User as UserIcon, Timer, TimerOff, Calendar, Menu
} from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

const glassStyle = { background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px' };


// Backend API URL
const API_URL = process.env.Backend_API_URL || "http://localhost:5000";


// --- COMPONENT: DIFFICULTY CIRCLE (LeetCode Style) ---
const DifficultyCircle = ({ stats }) => {
    const radius = 35;
    const circum = 2 * Math.PI * radius;
    const total = stats.total || 1;
    
    const begStroke = (stats.Beginner / total) * circum;
    const intStroke = (stats.Intermediate / total) * circum;
    const advStroke = (stats.Advanced / total) * circum;

    return (
        <div className="d-flex align-items-center gap-3 difficulty-container">
            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#3b82f6" strokeWidth="9" 
                        strokeDasharray={`${begStroke} ${circum}`} strokeLinecap="round" />
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#a855f7" strokeWidth="9" 
                        strokeDasharray={`${intStroke} ${circum}`} strokeDashoffset={-begStroke} strokeLinecap="round" />
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#ec4899" strokeWidth="9" 
                        strokeDasharray={`${advStroke} ${circum}`} strokeDashoffset={-(begStroke + intStroke)} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} className="text-center">
                    <div className="fw-black" style={{fontSize: '1.2rem', lineHeight: '1'}}>{stats.total}</div>
                    <div className="small opacity-40 uppercase" style={{fontSize: '0.55rem', letterSpacing: '1px'}}>Solved</div>
                </div>
            </div>
            <div className="small">
                <div className="d-flex align-items-center gap-2 mb-1">
                    <div style={{width:7, height:7, borderRadius:'50%', background:'#3b82f6'}}></div>
                    <span className="opacity-50">Beginner:</span> <span className="fw-bold">{stats.Beginner}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-1">
                    <div style={{width:7, height:7, borderRadius:'50%', background:'#a855f7'}}></div>
                    <span className="opacity-50">Med:</span> <span className="fw-bold">{stats.Intermediate}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div style={{width:7, height:7, borderRadius:'50%', background:'#ec4899'}}></div>
                    <span className="opacity-50">Adv:</span> <span className="fw-bold">{stats.Advanced}</span>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
    const [activeTab, setActiveTab] = useState("dashboard");
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!user?.id) return; // Changed from user.name to user.id
        setLoadingHistory(true);
        try {
            const r = await fetch(`${API_URL}/history/${user.id}`); // Changed endpoint
            const data = await r.json();
            setHistory(Array.isArray(data) ? data : []);
        } catch (e) { console.error("History fetch failed"); }
        finally { setLoadingHistory(false); }
    }, [user?.id]); // Depend on user.id

    useEffect(() => {
        if (token) fetchHistory();
    }, [token, fetchHistory]);

    const onAuth = (data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token); setUser(data.user);
    };

    if (!token) return <AuthPage onAuth={onAuth} />;

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="d-flex vh-100 overflow-hidden text-white w-100 main-app-layout" style={{ background: '#020617', fontFamily: "'Inter', sans-serif" }}>
            <div className="mobile-header d-lg-none w-100 d-flex align-items-center justify-content-between p-3 position-fixed top-0 start-0" style={{ zIndex: 1000, background: '#020617', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="d-flex align-items-center gap-2">
                    <Brain size={24} className="text-primary" />
                    <span className="fw-black">IntelliTest</span>
                </div>
                <button className="btn text-white p-0" onClick={toggleSidebar}>
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <nav className={`sidebar-container d-flex flex-column p-4 h-100 ${isSidebarOpen ? 'show' : ''}`}>
                <div className="d-flex align-items-center gap-3 mb-5 px-2 logo-section">
                    <div className="p-2 rounded-3 bg-opacity-20"><Brain size={32} className="text-primary" /></div>
                    <h4 className="fw-black mb-0 tracking-tighter">IntelliTest</h4>
                </div>
                <div className="flex-grow-1">
                    {[
                        { id: 'dashboard', icon: <LayoutDashboard size={18}/>, label: 'Dashboard' },
                        { id: 'assessments', icon: <BookOpen size={18}/>, label: 'Assessments' },
                        { id: 'reports', icon: <BarChart3 size={18}/>, label: 'Reports' },
                    ].map(item => (
                        <div key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`nav-link-custom ${activeTab === item.id ? 'active' : ''}`}>
                            {item.icon} <span>{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="logout-btn mt-auto" onClick={() => { localStorage.clear(); window.location.reload(); }}>
                    <LogOut size={18}/> <span>LogOut</span>
                </div>
            </nav>

            {isSidebarOpen && <div className="sidebar-overlay d-lg-none" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="flex-grow-1 p-3 p-md-5 overflow-auto position-relative main-content-area">
                <div className="bg-glow"></div>
                <div className="content-container">
                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && <DashboardView user={user} setTab={setActiveTab} history={history} key="dash" />}
                        {activeTab === 'assessments' && <AssessmentCenter user={user} refreshHistory={fetchHistory} key="assess" />}
                        {activeTab === 'reports' && <ReportsView user={user} history={history} loading={loadingHistory} key="report" />}
                    </AnimatePresence>
                </div>
            </main>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Space+Mono&display=swap');
                .sidebar-container { width: 280px; background: rgba(2, 6, 23, 0.95); border-right: 1px solid rgba(255,255,255,0.05); z-index: 1100; transition: transform 0.3s ease; }
                @media (max-width: 991.98px) { .sidebar-container { position: fixed; top: 0; left: 0; transform: translateX(-100%); } .sidebar-container.show { transform: translateX(0); } .main-app-layout { flex-direction: column; } .main-content-area { padding-top: 80px !important; } .logo-section { display: none !important; } }
                .sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1050; }
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
                .timer-bar { height: 4px; background: #3b82f6; transition: width 1s linear; border-radius: 2px; }
                .no-spinners::-webkit-outer-spin-button, .no-spinners::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .no-spinners { -moz-appearance: textfield; }
                .timer-btn-toggle { width: 100%; height: 54px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.3); transition: 0.3s; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .timer-btn-toggle.active { background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.1); }
                @media (max-width: 768px) { .challenge-text { font-size: 1.25rem; } .difficulty-container { flex-direction: column; align-items: flex-start !important; } .display-1 { font-size: 3.5rem; } }
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
                    <h2 className="auth-title">Intelli <span className="text-primary">Test</span></h2>
                    <p className="auth-subtitle">{isRegister ? "IDENTITY CREATION PROTOCOL" : "Intelligent Assesment System"}</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                    {isRegister && <div className="input-field"><UserIcon size={18} className="input-icon" /><input type="text" placeholder="Full Name" onChange={e => setFormData({ ...formData, username: e.target.value })} required /></div>}
                    <div className="input-field"><Mail size={18} className="input-icon" /><input type="email" placeholder="Email ID" onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
                    <div className="input-field"><Lock size={18} className="input-icon" /><input type="password" placeholder="Secure Passkey" onChange={e => setFormData({ ...formData, password: e.target.value })} required /></div>
                    <button className="auth-btn" disabled={loading}>{loading ? <Loader2 className="spinner-border spinner-border-sm" /> : <>{isRegister ? "Create Profile" : "Lets Start"}<ArrowRight size={18} className="ms-2" /></>}</button>
                </form>
                <div className="auth-footer"><span>{isRegister ? "Already have a profile?" : "New subject identifier?"}</span><button className="switch-mode-btn" onClick={() => setIsRegister(!isRegister)}>{isRegister ? "Login to Link" : "Create New Profile"}</button></div>
            </div>
            <style>{`
                .auth-wrapper { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #020617; position: relative; overflow: hidden; padding: 20px; }
                .auth-bg-gradient-1 { position: absolute; top: -10%; left: -10%; width: 50%; height: 50%; background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%); }
                .auth-bg-gradient-2 { position: absolute; bottom: -10%; right: -10%; width: 50%; height: 50%; background: radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%); }
                .auth-card { width: 100%; max-width: 420px; padding: 2.5rem; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 32px; z-index: 10; }
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
                @media (max-width: 480px) { .auth-card { padding: 1.5rem; } }
            `}</style>
        </div>
    );
};  



const DashboardView = ({ user, setTab, history }) => {
    const gradientTextStyle = { background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto', display: 'inline-block' };
    const stats = useMemo(() => {
        const sessions = {};
        history.forEach(h => {
            if (!sessions[h.sessionId]) { sessions[h.sessionId] = { totalScore: 0, questionCount: 0, difficulty: h.difficulty || "Beginner" }; }
            sessions[h.sessionId].totalScore += h.score;
            sessions[h.sessionId].questionCount += 1;
        });
        const sessionIds = Object.keys(sessions);
        const totalAssessments = sessionIds.length;
        let sumOfAccuracies = 0;
        const diffCounts = { Beginner: 0, Intermediate: 0, Advanced: 0, total: totalAssessments };
        sessionIds.forEach(id => {
            const session = sessions[id];
            const sessionAccuracy = (session.totalScore / (session.questionCount * 10)) * 100;
            sumOfAccuracies += sessionAccuracy;
            if (diffCounts[session.difficulty] !== undefined) { diffCounts[session.difficulty]++; }
        });
        const avgAccuracy = totalAssessments > 0 ? Math.round(sumOfAccuracies / totalAssessments) : 0;
        let level = avgAccuracy > 70 ? "Advanced" : avgAccuracy >= 40 ? "Intermediate" : "Beginner";
        return { accuracy: `${avgAccuracy}%`, totalSolved: totalAssessments, rating: avgAccuracy > 70 ? "A" : avgAccuracy >= 40 ? "B" : "C", level, diffCounts };
    }, [history]);

    const skillMatrix = useMemo(() => {
        const domains = {};
        history.forEach(h => {
            const d = h.domain || "General";
            if (!domains[d]) domains[d] = { total: 0, count: 0 };
            domains[d].total += h.score;
            domains[d].count += 1;
        });
        return Object.keys(domains).map(name => ({ name, percent: Math.round((domains[name].total / (domains[name].count * 10)) * 100) }));
    }, [history]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
                <div>
                    <h6 className="text-primary fw-bold tracking-widest mb-2 uppercase" style={{ fontSize: '0.75rem' }}>Status: Online</h6>
                    <h1 className="fw-black mb-0">Welcome, <span style={gradientTextStyle}>{user?.name}</span></h1>
                </div>
                <div className="p-3 px-4 rounded-4" style={glassStyle}>
                    <span className="small opacity-50 d-block">Intelligence Level</span>
                    <span className="h4 fw-black text-gradient">{stats.level}</span>
                </div>
            </div>
            <div className="row g-3 g-md-4 mb-5">
                {[
                    { label: 'Avg Accuracy', value: stats.accuracy, icon: <TrendingUp size={20}/>, color: '#3b82f6' },
                    { label: 'Total Solved', value: stats.totalSolved, icon: <Activity size={20}/>, color: '#10b981' },
                    { label: 'Rating', value: stats.rating, icon: <ShieldCheck size={20}/>, color: '#8b5cf6' }
                ].map((s, i) => (
                    <div className="col-6 col-md-3" key={i}>
                        <div className="p-3 p-md-4 h-100" style={glassStyle}>
                            <div className="mb-2 mb-md-3" style={{ color: s.color }}>{s.icon}</div>
                            <h2 className="fw-black mb-1 fs-3 fs-md-2">{s.value}</h2>
                            <p className="small opacity-40 uppercase tracking-widest mb-0" style={{fontSize: '0.6rem'}}>{s.label}</p>
                        </div>
                    </div>
                ))}
                <div className="col-12 col-md-3"><div className="p-3 p-md-4 h-100 d-flex align-items-center justify-content-center" style={glassStyle}><DifficultyCircle stats={stats.diffCounts} /></div></div>
            </div>
            <div className="row g-4">
                <div className="col-lg-8"><div className="p-4 p-md-5 rounded-5 h-100" style={{ minHeight: '300px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), transparent)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <h2 className="fw-black mb-3">Initialize Neural Assessment</h2>
                    <p className="opacity-60 mb-1" style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>Ready to assess your Skills? Our AI core is synchronized and waiting for parameters. Select Your domain and set difficulty and timer for efficient use of our Intelligent AI-Powered Assessment System.</p>
                    <button className="btn btn-primary btn-lg rounded-pill px-5 fw-bold mt-4 mt-md-5 w-100 w-md-auto" onClick={() => setTab('assessments')}>Start Assessment <ArrowRight size={18} className="ms-2"/></button>
                </div></div>
                <div className="col-lg-4"><div className="p-4 rounded-5" style={{ ...glassStyle, minHeight: '350px' }}>
                    <h6 className="fw-bold mb-4 opacity-50 uppercase tracking-widest" style={{fontSize: '0.9rem'}}>Skill Matrix</h6>
                    <div className="hide-scrollbar" style={{ maxHeight: '210px', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                        {(skillMatrix.length > 0 ? skillMatrix : [{name: 'Waiting for Data', percent: 0}]).map((skill, idx) => (
                            <div className="mb-4" key={idx}>
                                <div className="d-flex justify-content-between mb-2 small fw-bold"><span>{skill.name}</span><span className="text-primary">{skill.percent}%</span></div>
                                <div className="progress" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}><div className="progress-bar bg-primary" style={{ width: `${skill.percent}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div></div>
            </div>
        </motion.div>
    );
};



const AssessmentCenter = ({ user, refreshHistory }) => {
    const [domains, setDomains] = useState([]);
    const [input, setInput] = useState("");
    const [session, setSession] = useState(null);
    const [qCount, setQCount] = useState(3);
    const [customCount, setCustomCount] = useState("");
    const [difficulty, setDifficulty] = useState("Beginner");
    const [isTimed, setIsTimed] = useState(false);
    const handleStart = (type) => { if (type !== 'general' && domains.length === 0) return alert("Select at least one domain."); setSession(type); };
    const finalCount = customCount !== "" ? parseInt(customCount) : qCount;

    if (session) return <ActiveSession user={user} domains={domains} type={session} limit={finalCount} isTimed={isTimed} difficulty={difficulty} onEnd={() => { setSession(null); refreshHistory(); }} />;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-4"><h1 className="fw-black">Assessment Center</h1><p className="opacity-50">Configure parameters, difficulty, and timing mode.</p></div>
            <div className="p-3 p-md-4 mb-4" style={glassStyle}>
                <div className='row mb-4'><div className="col-12"> 
                    <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest" style={{fontSize: '0.9rem'}}>Set Knowledge Domains</h6>
                    <div className="d-flex gap-3 mb-3">
                        <input className="custom-input" placeholder="e.g. HTML, Logic..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (input && (setDomains([...domains, input]), setInput("")))} />
                        <button className="btn btn-primary px-4 rounded-3" onClick={() => { if(input) { setDomains([...domains, input]); setInput(""); } }}><Plus size={24} /></button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">{domains.map(d => (<span key={d} className="domain-tag">{d} <X size={14} style={{ cursor: 'pointer' }} onClick={() => setDomains(domains.filter(i => i !== d))} /></span>))}</div>
                </div></div>
                <div className="row g-4 align-items-end">
                    <div className="col-12 col-md-5">
                        <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest" style={{fontSize: '0.9rem'}}>Question Quantity</h6>
                        <div className="d-flex gap-2">
                            <select className={`custom-input ${customCount !== "" ? 'opacity-25' : ''}`} value={qCount} style={{width: '60%'}} disabled={customCount !== ""} onChange={(e) => setQCount(parseInt(e.target.value))}>
                                {[1, 2, 3, 5, 10, 15, 20].map(n => <option key={n} value={n} style={{background: '#020617'}}>{n} Qs</option>)}
                            </select>
                            <input type="text" inputMode="numeric" className="custom-input no-spinners" placeholder="Custom" style={{width: '40%'}} value={customCount} onChange={(e) => setCustomCount(e.target.value.replace(/\D/g, ""))} />
                        </div>
                    </div>
                    <div className="col-12 col-md-5">
                        <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest" style={{fontSize: '0.9rem'}}>Difficulty Selection</h6>
                        <select className="custom-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                            <option value="Beginner" style={{background: '#020617'}}>Beginner</option>
                            <option value="Intermediate" style={{background: '#020617'}}>Intermediate</option>
                            <option value="Advanced" style={{background: '#020617'}}>Advanced</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-2 text-center">
                        <h6 className="text-primary fw-bold mb-3 uppercase tracking-widest text-start text-md-center" style={{fontSize: '0.9rem'}}>Timer</h6>
                        <div className={`timer-btn-toggle ${isTimed ? 'active' : ''}`} onClick={() => setIsTimed(!isTimed)}>{isTimed ? <Timer size={22}/> : <TimerOff size={22}/>}</div>
                    </div>
                </div>
            </div>
            <div className="row g-3 g-md-4">
                {[
                    { id: 'adaptive', title: 'Adaptive Scenario', desc: 'Situational text-based reasoning.', icon: <Zap/> }, 
                    { id: 'multi', title: 'Multiple Choice', desc: 'Selection-based knowledge verify.', icon: <Target/> }, 
                    { id: 'general', title: 'General Knowledge', desc: 'Random high-level trivia.', icon: <Globe/> }
                ].map(p => (
                    <div className="col-12 col-md-4" key={p.id}><div className="protocol-card p-4 p-md-5 h-100" style={glassStyle} onClick={() => handleStart(p.id)}>
                        <div className="text-primary mb-4">{p.icon}</div>
                        <h4 className="fw-bold mb-3">{p.title}</h4>
                        <p className="small opacity-50 mb-4">{p.desc}</p>
                        <div className="text-primary fw-bold small d-flex align-items-center gap-2 uppercase tracking-widest">Start Assesment <ArrowRight size={14}/></div>
                    </div></div>
                ))}
            </div>
        </motion.div>
    );
};

const ActiveSession = ({ user, domains, type, limit, isTimed, difficulty, onEnd }) => {
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [currentInput, setCurrentInput] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [sessionId] = useState(`session_${Date.now()}`);
    const [timeLeft, setTimeLeft] = useState(30);
    const timerRef = useRef(null);

    const fetchAllQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/generate-assessment`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ type, difficulty, domains, limit }) 
            });
            const data = await res.json();
            setQuestions(data.questions || []);
        } catch (e) { alert("Core Link Failed"); onEnd(); }
        finally { setLoading(false); }
    }, [difficulty, domains, type, limit, onEnd]);

    useEffect(() => { fetchAllQuestions(); }, [fetchAllQuestions]);

    const submitBatch = useCallback(async (finalAnswers) => {
        setEvaluating(true);
        try {
            const res = await fetch(`${API_URL}/evaluate-batch`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    userId: user.id, // FIX: Crucial mapping to Assessment Schema
                    username: user.name, 
                    answers: finalAnswers, 
                    domains, 
                    sessionId, 
                    type, 
                    difficulty 
                })
            });
            const data = await res.json();
            setResults(data.results);
        } catch (e) { alert("Evaluation error."); }
        finally { setEvaluating(false); }
    }, [user.id, user.name, domains, sessionId, type, difficulty]); // Added user.id to dependencies

    const handleNext = useCallback((autoAnswer = null) => {
        const finalAnswer = autoAnswer || currentInput || "No response provided";
        const updatedAnswers = [...answers, { challenge: questions[currentStep]?.challenge, answer: finalAnswer }];
        setAnswers(updatedAnswers);
        setCurrentInput("");
        if (currentStep < questions.length - 1) { setCurrentStep(prev => prev + 1); setTimeLeft(30); }
        else { clearInterval(timerRef.current); submitBatch(updatedAnswers); }
    }, [answers, questions, currentStep, currentInput, submitBatch]);

    useEffect(() => {
        if (isTimed && !loading && !evaluating && !results && questions.length > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) { handleNext("Time Expired"); return 30; }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [loading, evaluating, results, questions.length, isTimed, handleNext]);

    if (loading) return <div className="text-center py-5"><Loader2 className="spinner-border text-primary mb-3" /><p className="fw-bold opacity-50 uppercase tracking-widest">Synchronizing Neural Link...</p></div>;
    const currentChallenge = questions[currentStep]?.challenge || "";

    return (
        <div className="mx-auto" style={{ maxWidth: '850px' }}>
            <div className="p-3 p-md-5" style={glassStyle}>
                <div className="d-flex justify-content-between mb-4 align-items-center">
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-primary fw-bold small tracking-widest uppercase">Q {currentStep + 1}/{questions.length}</span>
                        <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2" style={{fontSize: '0.6rem'}}>{difficulty.toUpperCase()}</span>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        {isTimed && !results && !evaluating && (
                            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20"><Timer size={14}/> <span className="fw-bold">{timeLeft}s</span></div>
                        )}
                        <X onClick={onEnd} style={{ cursor: 'pointer' }} className="opacity-50" />
                    </div>
                </div>
                {!results && !evaluating && isTimed && (
                    <div className="mb-4 w-100" style={{background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px'}}><div className="timer-bar" style={{ width: `${(timeLeft/30)*100}%` }}></div></div>
                )}
                {evaluating ? (
                    <div className="text-center py-5"><Loader2 className="spinner-border text-primary mb-3" /><p className="fw-bold opacity-50">ANALYZING RESPONSES...</p></div>
                ) : results ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="text-center mb-5">
                            <h6 className="text-primary fw-bold tracking-widest uppercase mb-4">Neural Evaluation Complete</h6>
                            <h1 className="display-1 fw-black mb-3 text-gradient">
                                {(type === 'multi' || type === 'general') 
                                    ? `${results.filter(r => r.score >= 8).length} / ${questions.length} Correct` 
                                    : `${Math.round((results.reduce((acc, curr) => acc + curr.score, 0) / (questions.length * 10)) * 100)}%`
                                }
                            </h1>
                            <p className="fs-5 opacity-50">Evaluation summary for {difficulty} level.</p>
                        </div>
                        <div className="mb-5">{results.map((res, i) => (
                            <div key={i} className="p-4 mb-3 rounded-4" style={{background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'}}>
                                <div className="d-flex flex-column flex-md-row justify-content-between mb-2 small fw-bold">
                                    <span className="text-primary">CHALLENGE {i+1}</span>
                                    <span className={res.score >= 8 ? 'text-success' : 'text-danger'}>
                                        {(type === 'multi' || type === 'general') 
                                            ? (res.score >= 8 ? 'CORRECT' : 'INCORRECT') 
                                            : `${res.score * 10}% Accuracy`
                                        }
                                    </span>
                                </div>
                                <p className="small mb-0 opacity-70 italic">Feedback: {res.feedback}</p>
                            </div>
                        ))}</div>
                        <button className="btn btn-primary btn-lg w-100 rounded-pill fw-bold" onClick={onEnd}>Return to Dashboard</button>
                    </motion.div>
                ) : (
                    <>
                        <div className="mb-5 h2 challenge-text">{typeof currentChallenge === 'string' && currentChallenge.includes('Question:') ? currentChallenge.split('Question:').map((text, i) => <div key={i} className={i === 0 ? "scenario-text opacity-50 fs-5 mb-2" : ""}>{text}</div>) : currentChallenge}</div>
                        {(type === 'multi' || type === 'general') && questions[currentStep]?.options ? (
                            <div className="row g-3 mb-5">{questions[currentStep].options.map(o => (
                                <div className="col-12 col-md-6" key={o}><button className={`btn w-100 py-3 rounded-4 fw-bold text-start px-4 transition-all ${currentInput === o ? 'btn-primary' : 'btn-outline-light opacity-50'}`} onClick={() => setCurrentInput(o)}>{o}</button></div>
                            ))}</div>
                        ) : (
                            <textarea className="custom-input mb-5" style={{ minHeight: '150px' }} value={currentInput} onChange={e => setCurrentInput(e.target.value)} placeholder="Type your response..."/>
                        )}
                        <button className="btn btn-primary w-100 py-3 fw-bold rounded-4 shadow-lg" onClick={() => handleNext()} disabled={!currentInput && type !== 'adaptive'}>{currentStep === questions.length - 1 ? "FINISH ASSESSMENT" : "NEXT CHALLENGE"}</button>
                    </>
                )}
            </div>
        </div>
    );
};

const ReportsView = ({ user, history, loading }) => {
    const [expandedSession, setExpandedSession] = useState(null);
    const metaBoxStyle = { background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)', backdropFilter: 'blur(10px)', };
    const getDiffStyle = (diff) => {
        switch (diff) {
            case 'Advanced': return { color: '#dc4040', bg: 'rgba(236, 72, 153, 0.1)' };
            case 'Intermediate': return { color: '#b7c334', bg: 'rgba(168, 85, 247, 0.1)' };
            default: return { color: '#3ad73c', bg: 'rgba(59, 130, 246, 0.1)' };
        }
    };
    const sessions = useMemo(() => {
        const groups = {};
        history.forEach(item => {
            const sid = item.sessionId || 'legacy';
            if (!groups[sid]) { groups[sid] = { id: sid, domain: item.domain, timestamp: item.timestamp, type: item.type, difficulty: item.difficulty || "Beginner", items: [], avgScore: 0 }; }
            groups[sid].items.push(item);
        });
        return Object.values(groups).map(s => {
            const total = s.items.reduce((acc, curr) => acc + curr.score, 0);
            s.avgScore = Math.round((total / (s.items.length * 10)) * 100);
            return s;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [history]);
    const formatDate = (dateString) => { const d = new Date(dateString); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`; };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-5"><h2 className="fw-black mb-1">Assessment History</h2><p className="opacity-50 small">Detailed breakdown of your neural synchronization sessions.</p></div>
            {loading ? ( <div className="text-center py-5"><Loader2 className="spinner-border text-primary" /></div> ) : (
                <div className="row g-4"><div className="col-12">
                        {sessions.map((s) => {
                            const diffTheme = getDiffStyle(s.difficulty);
                            return (
                                <div key={s.id} className="p-3 p-md-4 mb-3 rounded-4" style={glassStyle}>
                                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
                                        <div onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)} style={{ cursor: 'pointer' }}>
                                            <h2 className="fw-black mb-0 tracking-tight text-uppercase" style={{ fontSize: '1.2rem' }}>{s.domain || "General"}</h2>
                                            <div className="fw-bold text-primary" style={{ fontSize: '1rem' }}>{s.avgScore}% <span className="small opacity-50 fw-normal ms-1">Accuracy</span></div>
                                        </div>
                                        <div className="px-3 py-2 rounded-4 d-flex flex-wrap align-items-center gap-2 gap-md-3" style={metaBoxStyle}>
                                            <div className="d-flex align-items-center gap-2"><Calendar size={14} className="text-primary opacity-75" /><span className="small fw-bold opacity-80">{formatDate(s.timestamp)}</span></div>
                                            <div className="d-none d-md-block" style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }}></div>
                                            <div className="d-flex align-items-center gap-2"><Zap size={14} className="text-primary opacity-75" /><span className="small fw-bold opacity-80">{s.items.length} Qs</span></div>
                                            <div className="d-none d-md-block" style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }}></div>
                                            <div className="px-2 rounded-pill" style={{ background: diffTheme.bg, border: `1px solid ${diffTheme.color}33` }}><span className="fw-black uppercase tracking-tighter" style={{ fontSize: '0.65rem', color: diffTheme.color }}>{s.difficulty}</span></div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-4">
                                        <div className="progress flex-grow-1" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}><motion.div initial={{ width: 0 }} animate={{ width: `${s.avgScore}%` }} className="progress-bar bg-primary shadow-sm" /></div>
                                        <button className="btn btn-primary btn-sm rounded-pill px-3 px-md-4 fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px' }} onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}>{expandedSession === s.id ? "HIDE" : "VIEW"}</button>
                                    </div>
                                    <AnimatePresence>
                                        {expandedSession === s.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-top border-white border-opacity-10">
                                                <div className="row g-3">
                                                    {s.items.map((item, idx) => {
                                                        const itemPercent = item.score * 10;
                                                        const isObjective = s.type === 'multi' || s.type === 'general';
                                                        return (
                                                            <div key={idx} className="col-12"><div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${item.score >= 8 ? '#10b981' : (item.score < 5 ? '#ef4444' : '#3b82f6')}` }}>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2"><span className="small fw-black opacity-40 uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Challenge {idx + 1}</span><span className={`fw-black ${item.score >= 8 ? 'text-success' : (item.score < 5 ? 'text-danger' : 'text-primary')}`}>{isObjective ? (item.score >= 8 ? 'CORRECT' : 'INCORRECT') : `${itemPercent}%`}</span></div>
                                                                    <p className="fw-bold mb-2" style={{ fontSize: '0.9rem' }}>{item.challenge}</p>
                                                                    <div className="p-2 rounded-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}><p className="small opacity-60 mb-0 italic" style={{ fontSize: '0.8rem' }}><span className="text-primary fw-bold">Feedback:</span> {item.feedback}</p></div>
                                                                </div></div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div></div>
            )}
        </motion.div>
    );
};

export default App;