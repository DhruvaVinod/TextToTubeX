import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './StudyPlanner.css';

const StudyResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, calendar, topic, progress } = location.state || {};

  const handleSave = () => {
    const user = localStorage.getItem('user');
    if (!user) {
      alert('Please sign in to save your study plan.');
      return;
    }

    const existing = JSON.parse(localStorage.getItem('studyPlans') || '[]');
    existing.push({ topic, plan, calendar, progress });
    localStorage.setItem('studyPlans', JSON.stringify(existing));
    alert('Study plan saved successfully!');
  };

  if (!plan || !calendar) {
    return (
      <div className="study-planner">
        <div className="planner-header">
          <h1>Study Plan Not Found</h1>
        </div>
        <div className="planner-content">
          <p>Sorry, we couldn't find your study plan. Please go back and generate one.</p>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="study-planner">
      <header className="planner-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="text-3xl font-extrabold text-white drop-shadow">📖 Your Study Plan for "{topic}"</h1>
      </header>

      <div className="planner-content">
        {/* Calendar First */}
        <div className="calendar-section">
          <div className="calendar-container">
            <h3 className="text-xl font-bold text-center text-blue-700 mb-4">📅 Calendar View</h3>
            <div className="calendar-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="calendar-header">{day}</div>
              ))}
              {calendar.days.map((day, index) => {
                const date = new Date(day.date);
                return (
                  <div key={index} className={`calendar-day ${day.isWeekend ? 'weekend' : 'weekday'}`}>
                    <div className="day-number font-bold text-lg">{date.getDate()}</div>
                    <div className="day-info font-semibold text-sm">Day {day.dayNumber}</div>
                    <div className="study-hours text-xs">{day.hours}h study</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Study Plan Text */}
        <div className="plan-content">
          <div className="plan-text" style={{ fontFamily: 'Segoe UI, Roboto, sans-serif', fontSize: '1rem', lineHeight: '1.8', color: 'black' }}>
            <div dangerouslySetInnerHTML={{ __html: plan }} />
          </div>
        </div>

        {/* Save Button */}
        <div className="save-section" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="generate-btn" onClick={handleSave}>💾 Save This Plan</button>
        </div>
      </div>
    </div>
  );
};

export default StudyResult;
