import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [username, setUsername] = useState("");
  const [step, setStep] = useState(1); // 1: Login, 2: Test, 3: Final Report
  const [qCount, setQCount] = useState(1);
  const [scenario, setScenario] = useState("Your first task: A customer is shouting because of a delayed order. How do you respond?");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/evaluate-and-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentScenario: scenario, userAnswer: answer, questionCount: qCount })
      });
      const data = await res.json();
      setResult(data);
      setTotalScore(prev => prev + data.score);
    } catch (err) {
      alert("Check your connection!");
    }
    setLoading(false);
  };

  const proceed = () => {
    if (qCount >= 10) {
      setStep(3); // Go to Final Report
    } else {
      setScenario(result.nextScenario);
      setQCount(qCount + 1);
      setAnswer("");
      setResult(null);
    }
  };

  return (
    <div className="min-vh-100 bg-light py-5 px-3">
      <div className="container" style={{maxWidth: '900px'}}>
        
        {/* LOGIN SCREEN */}
        {step === 1 && (
          <div className="card shadow-lg border-0 p-5 text-center rounded-5">
            <h1 className="fw-bold text-primary mb-3">Intelligent Assessment System</h1>
            <p className="text-muted mb-4">You will face 10 adaptive AI scenarios. Good luck.</p>
            <input className="form-control form-control-lg mb-3 text-center rounded-pill" placeholder="Enter Full Name" onChange={e => setUsername(e.target.value)} />
            <button className="btn btn-primary btn-lg w-100 rounded-pill" onClick={() => setStep(2)} disabled={!username}>Start Assessment</button>
          </div>
        )}

        {/* TEST SCREEN */}
        {step === 2 && (
          <div>
            {/* Progress Visualization */}
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-1">
                <span className="fw-bold text-primary">Assessment Progress</span>
                <span className="fw-bold">{qCount} / 10</span>
              </div>
              <div className="progress(round)" style={{height: '10px', borderRadius: '10px'}}>
                <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: `${(qCount/10)*100}%`}}></div>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-lg-7">
                <div className="card shadow-sm border-0 p-4 h-100 rounded-4">
                  <h6 className="text-uppercase text-muted fw-bold">Scenario {qCount}</h6>
                  <p className="fs-4 py-3 text-dark italic">"{scenario}"</p>
                  
                  {!result ? (
                    <>
                      <textarea className="form-control border-0 bg-light mb-3" rows="6" placeholder="Type your response..." value={answer} onChange={e => setAnswer(e.target.value)} style={{fontSize: '1.1rem'}} />
                      <button className="btn btn-primary btn-lg rounded-pill px-5" onClick={handleEvaluate} disabled={loading || !answer}>
                        {loading ? "AI is Analyzing..." : "Analyze & Continue"}
                      </button>
                    </>
                  ) : (
                    <div className="animate-in">
                      <div className="p-3 bg-light rounded-3 mb-3 border-start border-primary border-4">
                        <p className="mb-0">{result.feedback}</p>
                      </div>
                      <button className="btn btn-dark btn-lg rounded-pill w-100" onClick={proceed}>
                        {qCount === 10 ? "View Final Performance Report" : "Go to Next Scenario"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* NEW WONDERFUL UI: Skill Bars */}
              <div className="col-lg-5">
                <div className="card shadow-sm border-0 p-4 h-100 rounded-4 text-center">
                  <h5 className="fw-bold mb-4">Performance Metrics</h5>
                  
                  {result ? (
                    <div className="mt-2">
                      <div className="mb-4">
                        <div className="d-flex justify-content-between small fw-bold"><span>Logic & Strategy</span><span>{result.logic*10}%</span></div>
                        <div className="progress mt-1"><div className="progress-bar bg-info" style={{width: `${result.logic*10}%`}}></div></div>
                      </div>
                      <div className="mb-4">
                        <div className="d-flex justify-content-between small fw-bold"><span>Emotional Intelligence</span><span>{result.tone*10}%</span></div>
                        <div className="progress mt-1"><div className="progress-bar bg-success" style={{width: `${result.tone*10}%`}}></div></div>
                      </div>
                      <h1 className="display-2 fw-black text-primary mt-4">{result.score}<span className="fs-4 text-muted">/10</span></h1>
                    </div>
                  ) : (
                    <div className="py-5 text-muted italic">Waiting for your response...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FINAL REPORT SCREEN */}
        {step === 3 && (
          <div className="card shadow-lg border-0 p-5 text-center rounded-5 bg-white">
            <div className="mb-4">
               <span className="display-1">🏆</span>
            </div>
            <h1 className="fw-bold text-dark">Assessment Complete</h1>
            <h4 className="text-primary mb-4">{username}</h4>
            
            <div className="row justify-content-center mb-4">
               <div className="col-6 col-md-4 p-3 bg-light rounded-4">
                  <h6 className="text-muted uppercase small">Total Average</h6>
                  <h2 className="fw-bold">{(totalScore/10).toFixed(1)}/10</h2>
               </div>
            </div>

            <p className="lead px-lg-5 text-secondary">
              "You have completed the 10-level adaptive simulation. Based on your inputs, your behavioral intelligence is <b>{totalScore > 70 ? 'Superior' : totalScore > 50 ? 'Advanced' : 'Developing'}</b>."
            </p>

            <button className="btn btn-primary btn-lg rounded-pill px-5 mt-4" onClick={() => window.location.reload()}>Restart Assessment</button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;