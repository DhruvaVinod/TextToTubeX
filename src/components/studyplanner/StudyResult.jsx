import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './StudyPlanner.css';

const StudyResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, calendar, topic, difficulty, progress } = location.state || {};
  
  const [currentProgress, setCurrentProgress] = useState(progress?.completed || 0);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [viewMode, setViewMode] = useState('combined'); // 'plan', 'calendar', 'combined'
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [studyStreak, setStudyStreak] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [dayNotes, setDayNotes] = useState({});
  const [currentNote, setCurrentNote] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [motivationalQuotes] = useState([
    "🌟 Every expert was once a beginner!",
    "🚀 Progress, not perfection!",
    "💪 You're closer than you think!",
    "🎯 Small steps lead to big achievements!",
    "✨ Consistency is the key to mastery!"
  ]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    if (calendar) {
      const totalHours = calendar.totalDays * calendar.dailyHours;
      setTotalStudyTime(totalHours);
      
      const today = new Date();
      const startDate = new Date(calendar.days[0].date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + calendar.totalDays);
      
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      setEstimatedCompletion(endDate.toLocaleDateString('en-US', options));
    }
  }, [calendar]);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);
    return () => clearInterval(quoteInterval);
  }, [motivationalQuotes.length]);

  const toggleDayCompletion = (dayIndex) => {
    const newCompletedDays = new Set(completedDays);
    
    if (completedDays.has(dayIndex)) {
      newCompletedDays.delete(dayIndex);
      setCurrentProgress(Math.max(0, currentProgress - 1));
    } else {
      newCompletedDays.add(dayIndex);
      setCurrentProgress(currentProgress + 1);
      
      // Show celebration for milestones
      if ((currentProgress + 1) % 5 === 0 || currentProgress + 1 === calendar?.totalDays) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
    
    setCompletedDays(newCompletedDays);
    calculateStreak(newCompletedDays);
  };

  const calculateStreak = (completed) => {
    let streak = 0;
    const sortedDays = Array.from(completed).sort((a, b) => a - b);
    
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      if (i === sortedDays.length - 1 || sortedDays[i] === sortedDays[i + 1] - 1) {
        streak++;
      } else {
        break;
      }
    }
    
    setStudyStreak(streak);
  };

  const addDayNote = (dayIndex, event) => {
    event?.stopPropagation();
    setSelectedDay(dayIndex);
    setCurrentNote(dayNotes[dayIndex] || '');
    setShowNotes(true);
  };

  const saveDayNote = () => {
    if (selectedDay !== null && currentNote.trim()) {
      setDayNotes(prev => ({
        ...prev,
        [selectedDay]: currentNote.trim()
      }));
    }
    setShowNotes(false);
    setCurrentNote('');
    setSelectedDay(null);
  };

  const cancelNoteEdit = () => {
    setShowNotes(false);
    setCurrentNote('');
    setSelectedDay(null);
  };

  const shareStudyPlan = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = () => {
    const shareText = `🎓 My ${topic} Study Plan\n📅 ${calendar?.totalDays} days\n⏰ ${calendar?.dailyHours} hours/day\n🎯 ${difficulty} level\n\nGenerated with AI Study Planner ✨`;
    navigator.clipboard.writeText(shareText);
    alert('Study plan details copied to clipboard!');
    setShowShareModal(false);
  };

  const downloadPlan = () => {
    const planText = plan.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const element = document.createElement('a');
    const file = new Blob([planText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${topic.replace(/\s+/g, '_')}_Study_Plan.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSave = () => {
    
    const user = JSON.parse(localStorage.getItem('loggedInUser')); // Adjust key if needed

    if (!user || !user.email) {
      alert('Please sign in to save your study plan.');
      navigate('/login'); // Redirects to login
      return;
    }

    const studyPlanData = {
      id: Date.now(),
      topic,
      difficulty,
      plan,
      calendar,
      progress: { completed: currentProgress, total: calendar?.totalDays || 0 },
      completedDays: Array.from(completedDays),
      dayNotes,
      createdAt: new Date().toISOString(),
      studyStreak,
      totalStudyTime
    };

    // Mock save to in-memory storage for demo
    console.log('Study plan saved:', studyPlanData);
    
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  };

  const resetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      setCurrentProgress(0);
      setCompletedDays(new Set());
      setStudyStreak(0);
      setDayNotes({});
    }
  };

  if (!plan || !calendar) {
    return (
      <div className="study-planner">
        <div className="planner-header">
          <h1>📚 Study Plan Not Found</h1>
        </div>
        <div className="planner-content">
          <div className="error-state">
            <div className="error-icon">😕</div>
            <p>Oops! We couldn't find your study plan.</p>
            <button className="generate-btn" onClick={() => navigate('/')}>
              ← Create New Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = (currentProgress / calendar.totalDays) * 100;

  return (
    <div className="study-planner">
      <header className="planner-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <span className="back-icon">←</span>
          <span>Back</span>
        </button>
        <div className="header-content">
          <h1 className="result-title">
            <span className="title-emoji">📖</span>
            Your Study Journey: "{topic}"
            <span className="difficulty-badge">{difficulty}</span>
          </h1>
        </div>
      </header>

      <div className="planner-content">
        {/* Motivational Section */}
        <div className="motivation-section">
          <div className="motivation-card">
            <div className="motivation-icon">💫</div>
            <div className="motivation-text">
              {motivationalQuotes[currentQuoteIndex]}
            </div>
          </div>
        </div>

        {/* Progress Dashboard */}
        <div className="progress-dashboard">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>📊 Progress Overview</h3>
              {studyStreak > 0 && (
                <div className="streak-badge">
                  🔥 {studyStreak} day streak!
                </div>
              )}
            </div>
            
            <div className="progress-stats">
              <div className="stat-circle">
                <div className="circle-progress" style={{ '--progress': progressPercentage }}>
                  <div className="circle-value">{Math.round(progressPercentage)}%</div>
                </div>
                <div className="stat-label">Complete</div>
              </div>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">✅</div>
                  <div className="stat-data">
                    <div className="stat-number">{currentProgress}</div>
                    <div className="stat-text">Days Done</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">📅</div>
                  <div className="stat-data">
                    <div className="stat-number">{calendar.totalDays - currentProgress}</div>
                    <div className="stat-text">Days Left</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">⏰</div>
                  <div className="stat-data">
                    <div className="stat-number">{totalStudyTime}</div>
                    <div className="stat-text">Total Hours</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-data">
                    <div className="stat-number">{estimatedCompletion.split(',')[0]}</div>
                    <div className="stat-text">Target Date</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="view-controls">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'combined' ? 'active' : ''}`}
              onClick={() => setViewMode('combined')}
            >
              📋 Combined View
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendar Only
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'plan' ? 'active' : ''}`}
              onClick={() => setViewMode('plan')}
            >
              📚 Plan Only
            </button>
          </div>
        </div>

        {/* Interactive Calendar */}
        {(viewMode === 'calendar' || viewMode === 'combined') && (
          <div className="calendar-section">
            <div className="calendar-container">
              <h3 className="section-title">
                📅 Interactive Study Calendar
                <span className="calendar-legend">
                  <span className="legend-item">
                    <div className="legend-dot completed"></div>
                    Completed
                  </span>
                  <span className="legend-item">
                    <div className="legend-dot pending"></div>
                    Pending
                  </span>
                </span>
              </h3>
              
              <div className="calendar-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="calendar-header">{day}</div>
                ))}
                
                {calendar.days.map((day, index) => {
                  const date = new Date(day.date);
                  const isCompleted = completedDays.has(index);
                  const hasNote = dayNotes[index];
                  
                  return (
                    <div 
                      key={index} 
                      className={`calendar-day interactive ${day.isWeekend ? 'weekend' : 'weekday'} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => toggleDayCompletion(index)}
                    >
                      <div className="day-number">{date.getDate()}</div>
                      <div className="day-info">Day {day.dayNumber}</div>
                      <div className="study-hours">{day.hours}h study</div>
                      
                      <div className="day-actions">
                        {isCompleted && <div className="check-mark">✓</div>}
                        <button 
                          className="note-btn"
                          onClick={(e) => addDayNote(index, e)}
                          title="Add note"
                        >
                          📝
                        </button>
                        {hasNote && <div className="note-indicator">💬</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Study Plan Content */}
        {(viewMode === 'plan' || viewMode === 'combined') && (
          <div className="plan-content enhanced">
            <h3 className="section-title">📚 Your Detailed Study Plan</h3>
            <div className="plan-text" dangerouslySetInnerHTML={{ __html: plan }} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-section">
          <div className="button-group">
            <button className="action-btn primary" onClick={handleSave}>
              <span className="btn-icon">💾</span>
              Save Progress
            </button>
            <button className="action-btn secondary" onClick={shareStudyPlan}>
              <span className="btn-icon">📤</span>
              Share Plan
            </button>
            <button className="action-btn secondary" onClick={downloadPlan}>
              <span className="btn-icon">⬇️</span>
              Download
            </button>
            <button className="action-btn danger" onClick={resetProgress}>
              <span className="btn-icon">🔄</span>
              Reset Progress
            </button>
          </div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="celebration-modal">
            <div className="celebration-content">
              <div className="celebration-animation">🎉</div>
              <h3>Amazing Progress!</h3>
              <p>You're doing great! Keep up the excellent work!</p>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📤 Share Your Study Plan</h3>
                <button className="close-btn" onClick={() => setShowShareModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Share your study journey with others!</p>
                <div className="share-options">
                  <button className="share-btn" onClick={copyToClipboard}>
                    📋 Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {showNotes && (
          <div className="modal-overlay" onClick={cancelNoteEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📝 Day {selectedDay + 1} Notes</h3>
                <button className="close-btn" onClick={cancelNoteEdit}>×</button>
              </div>
              <div className="modal-body">
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Add your notes for this day..."
                  rows="4"
                  className="note-textarea"
                />
                <div className="modal-actions">
                  <button className="action-btn primary" onClick={saveDayNote}>
                    Save Note
                  </button>
                  <button className="action-btn secondary" onClick={cancelNoteEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyResult;