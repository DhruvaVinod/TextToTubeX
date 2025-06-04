import React, { useState, useEffect } from 'react';
import './StudyPlans.css';
import { useNavigate } from 'react-router-dom';

const MyStudyPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      alert('Please sign in to view your study plans.');
      navigate('/');
      return;
    }
    setUser(loggedInUser);
    const savedPlans = JSON.parse(localStorage.getItem('studyPlans') || '[]');
    setPlans(savedPlans);
  }, [navigate]);

  const updateProgress = (index, change) => {
    const updated = [...plans];
    updated[index].progress.completed = Math.max(0, Math.min(
      updated[index].progress.total,
      updated[index].progress.completed + change
    ));
    setPlans(updated);
    localStorage.setItem('studyPlans', JSON.stringify(updated));
  };

  return (
    <div className="study-planner">
      <header className="planner-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="text-3xl font-extrabold text-white drop-shadow">📘 My Study Plans</h1>
      </header>

      <div className="planner-content">
        {plans.length === 0 ? (
          <p className="text-center">No saved study plans yet.</p>
        ) : (
          plans.map((plan, index) => (
            <div key={index} className="saved-plan-box">
              <h2 className="text-xl font-bold text-blue-700 mb-2">📚 {plan.topic}</h2>
              <div className="progress-section">
                <div className="progress-info">
                  <span>Progress: {plan.progress.completed}/{plan.progress.total}</span>
                  <span>{((plan.progress.completed / plan.progress.total) * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(plan.progress.completed / plan.progress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-controls">
                  <button onClick={() => updateProgress(index, -1)} disabled={plan.progress.completed <= 0}>←</button>
                  <button onClick={() => updateProgress(index, 1)} disabled={plan.progress.completed >= plan.progress.total}>→</button>
                </div>
              </div>
              <details>
                <summary className="font-semibold cursor-pointer mt-2">View Plan</summary>
                <div
                  className="plan-text mt-2"
                  style={{ fontFamily: 'Segoe UI, sans-serif', fontSize: '0.95rem', color: 'black' }}
                  dangerouslySetInnerHTML={{ __html: plan.plan }}
                />
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyStudyPlans;
