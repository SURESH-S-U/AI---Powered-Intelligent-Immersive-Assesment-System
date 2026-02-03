import React, { useState } from 'react';
import './App.css';

function App() {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // This is our simple Scenario
  const scenario = "A customer is angry because their food arrived cold. What do you say?";

  const submitAnswer = async () => {
    setLoading(true);
    const response = await fetch("http://localhost:5000/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, userAnswer: answer })
    });
    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>Intelligent Assessment</h1>
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px' }}>
        <h3>Scenario:</h3>
        <p>{scenario}</p>
        <textarea 
          rows="4" cols="50" 
          placeholder="Type your answer here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <br />
        <button onClick={submitAnswer} disabled={loading} style={{ marginTop: '10px', padding: '10px 20px' }}>
          {loading ? "AI is Thinking..." : "Submit Answer"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '20px', color: 'blue' }}>
          <h2>Score: {result.score}/10</h2>
          <p>Feedback: {result.feedback}</p>
          <p>Next Difficulty: <b>{result.nextLevel}</b></p>
        </div>
      )}
    </div>
  );
}

export default App;