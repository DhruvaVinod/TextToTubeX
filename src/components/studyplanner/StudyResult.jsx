import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './StudyPlanner.css';

const StudyResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, calendar, topic, difficulty, language, languageCode, progress } = location.state || {};
  const audioRef = useRef(null);
  
  const [currentProgress, setCurrentProgress] = useState(progress?.completed || 0);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [viewMode, setViewMode] = useState('combined');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [studyStreak, setStudyStreak] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [dayNotes, setDayNotes] = useState({});
  const [currentNote, setCurrentNote] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState(null);
  
  // Audio states - using the language and languageCode from StudyPlanner
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [audioData, setAudioData] = useState(null); // Base64 audio data
  const [audioType, setAudioType] = useState(null); // Audio MIME type
  
  const [motivationalQuotes] = useState([
    "🌟 Every expert was once a beginner!",
    "🚀 Progress, not perfection!",
    "💪 You're closer than you think!",
    "🎯 Small steps lead to big achievements!",
    "✨ Consistency is the key to mastery!"
  ]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Helper functions
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const base64ToUrl = (base64Data) => {
    try {
      const response = fetch(base64Data);
      return response.then(res => res.blob()).then(blob => URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error converting base64 to URL:', error);
      return null;
    }
  };

  // Audio generation function using the language from StudyPlanner
  const fetchAudioUrl = async (text, languageCode) => {
    try {
      const response = await fetch('http://localhost:5000/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language_code: languageCode })
      });

      if (!response.ok) throw new Error('Failed to fetch audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Convert blob to base64 for storage
      const audioBase64 = await blobToBase64(audioBlob);
      
      return {
        url: audioUrl,
        data: audioBase64,
        type: audioBlob.type
      };
    } catch (error) {
      console.error('Audio generation error:', error);
      return null;
    }
  };

  // Clean text for audio generation
  const cleanTextForAudio = (text) => {
    return text
      .replace(/<[^>]*>/g, '')   // Remove HTML tags
      .replace(/\*/g, '')        // Remove asterisks
      .replace(/\n\s*\n/g, '\n') // Remove empty newlines
      .replace(/\s+/g, ' ')      // Remove extra spaces
      .trim();
  };

  // Handle audio generation using the language from StudyPlanner
  const handleGenerateAudio = async () => {
    if (!plan) {
      setAudioError('No study plan available to convert to audio');
      return;
    }

    if (!languageCode) {
      setAudioError('Language not specified for audio generation');
      return;
    }

    try {
      setIsGeneratingAudio(true);
      setAudioError(null);
      
      // Clean the plan text for audio generation
      const cleanText = cleanTextForAudio(plan);
      
      const audioResult = await fetchAudioUrl(
        cleanText,
        languageCode // Use the language code passed from StudyPlanner
      );
      
      if (audioResult) {
        setAudioUrl(audioResult.url);
        setAudioData(audioResult.data);
        setAudioType(audioResult.type);
        
        // Auto-save if plan is already saved
        if (isSaved && savedPlanId) {
          updateSavedPlan();
        }
      } else {
        setAudioError('Failed to generate audio. Please try again.');
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      setAudioError('Failed to generate audio. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Reset audio when plan changes
  useEffect(() => {
    setAudioUrl(null);
    setAudioData(null);
    setAudioType(null);
    setAudioError(null);
  }, [plan]);

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

    checkExistingPlan();
  }, [calendar, topic, difficulty]);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);
    return () => clearInterval(quoteInterval);
  }, [motivationalQuotes.length]);

  // Auto-save progress changes including audio data
  useEffect(() => {
    if (isSaved && savedPlanId) {
      updateSavedPlan();
    }
  }, [currentProgress, completedDays, dayNotes, studyStreak, audioData]);

  const checkExistingPlan = () => {
    const user = localStorage.getItem('user');
    if (!user) return;

    const savedPlans = JSON.parse(localStorage.getItem('studyPlans') || '[]');
    const existingPlan = savedPlans.find(plan => 
      plan.topic === topic && 
      plan.difficulty === difficulty &&
      plan.calendar?.totalDays === calendar?.totalDays &&
      plan.calendar?.dailyHours === calendar?.dailyHours
    );

    if (existingPlan) {
      setIsSaved(true);
      setSavedPlanId(existingPlan.id);
      setCurrentProgress(existingPlan.progress.completed);
      setCompletedDays(new Set(existingPlan.completedDays || []));
      setDayNotes(existingPlan.dayNotes || {});
      setStudyStreak(existingPlan.studyStreak || 0);
      
      // Load saved audio data if available
      if (existingPlan.audioData) {
        setAudioData(existingPlan.audioData);
        setAudioType(existingPlan.audioType);
        // Convert base64 back to URL for playback
        base64ToUrl(existingPlan.audioData).then(url => {
          if (url) {
            setAudioUrl(url);
          }
        });
      }
    }
  };

  const updateSavedPlan = () => {
    const savedPlans = JSON.parse(localStorage.getItem('studyPlans') || '[]');
    const planIndex = savedPlans.findIndex(plan => plan.id === savedPlanId);
    
    if (planIndex !== -1) {
      savedPlans[planIndex] = {
        ...savedPlans[planIndex],
        progress: { completed: currentProgress, total: calendar?.totalDays || 0 },
        completedDays: Array.from(completedDays),
        dayNotes,
        studyStreak,
        audioData,
        audioType,
        audioLanguage: languageCode, // Save the language code
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('studyPlans', JSON.stringify(savedPlans));
    }
  };

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
    const shareText = `🎓 My ${topic} Study Plan\n📅 ${calendar?.totalDays} days\n⏰ ${calendar?.dailyHours} hours/day\n🎯 ${difficulty} level\n🌍 Language: ${language}\n\nGenerated with AI Study Planner ✨`;
    navigator.clipboard.writeText(shareText);
    alert('Study plan details copied to clipboard!');
    setShowShareModal(false);
  };

  const downloadPlan = () => {
    const planText = plan.replace(/<[^>]*>/g, '');
    const element = document.createElement('a');
    const file = new Blob([planText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${topic.replace(/\s+/g, '_')}_Study_Plan.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSave = () => {
    const user = localStorage.getItem('user');

    if (!user) {
      alert('Please sign in to save your study plan.');
      navigate('/');
      return;
    }

    if (isSaved) {
      updateSavedPlan();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      return;
    }

    const studyPlanData = {
      id: Date.now(),
      topic,
      difficulty,
      language, // Save the language name
      plan,
      calendar,
      progress: { completed: currentProgress, total: calendar?.totalDays || 0 },
      completedDays: Array.from(completedDays),
      dayNotes,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      studyStreak,
      totalStudyTime,
      // Audio data
      audioData: audioData, // Base64 encoded audio
      audioType: audioType, // MIME type for proper playback
      audioLanguage: languageCode, // Save the language code
      hasAudio: !!audioData  // Flag to indicate if audio is available
    };

    const savedPlans = JSON.parse(localStorage.getItem('studyPlans') || '[]');
    savedPlans.push(studyPlanData);
    localStorage.setItem('studyPlans', JSON.stringify(savedPlans));
    
    setIsSaved(true);
    setSavedPlanId(studyPlanData.id);
    
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setTimeout(() => {
        if (window.confirm('Study plan saved successfully! Would you like to view all your saved plans?')) {
          navigate('/my-study-plans');
        }
      }, 500);
    }, 2000);
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
            <span className="language-badge">🌍 {language}</span>
            {isSaved && <span className="saved-indicator">💾 Saved</span>}
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

        {/* Audio Section - using the language from StudyPlanner */}
        <div className="audio-section">
          <div className="audio-controls">
            <div className="audio-info">
            </div>
            
            {!audioUrl && !isGeneratingAudio && (
              <button 
                className="generate-audio-btn" 
                onClick={handleGenerateAudio}
                disabled={!plan || !languageCode}
              >
                🔊 
              </button>
            )}
            
            {isGeneratingAudio && (
              <div className="audio-loading">
                <div className="loading-spinner"></div>
                <span>...........</span>
              </div>
            )}
            
            {audioError && (
              <div className="audio-error">
                <span className="error-icon">⚠️</span>
                <span>{audioError}</span>
                <button onClick={handleGenerateAudio} className="retry-btn">Try Again</button>
              </div>
            )}
            
            {audioUrl && (
              <div className="audio-player-container">
                <h4>🎧 Study Plan Audio ({language})</h4>
                <audio controls src={audioUrl} className="audio-player">
                  Your browser does not support the audio element.
                </audio>
                <button 
                  className="regenerate-audio-btn" 
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                >
                  🔄 Regenerate Audio
                </button>
              </div>
            )}
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
        
        {(() => {
          const startDate = new Date(calendar.days[0].date);
          // Get the day of week (0 = Sunday, 1 = Monday, etc.)
          const startDayOfWeek = startDate.getDay();
          // Convert to Monday = 0, Tuesday = 1, etc.
          const mondayBasedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
          
          // Create array to hold all calendar cells
          const calendarCells = [];
          
          // Add empty cells for days before the start date
          for (let i = 0; i < mondayBasedStartDay; i++) {
            calendarCells.push(
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            );
          }
          
          // Add actual study days
          calendar.days.forEach((day, index) => {
            const date = new Date(day.date);
            const isCompleted = completedDays.has(index);
            const hasNote = dayNotes[index];
            
            calendarCells.push(
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
          });
          
          return calendarCells;
        })()}
      </div>
    </div>
  </div>
)}

        {/* Study Plan Content */}
        {(viewMode === 'plan' || viewMode === 'combined') && (
          <div className="plan-content enhanced left-aligned">
            <h3 className="section-title">📚 Your Detailed Study Plan</h3>
            <div className="plan-text formatted" dangerouslySetInnerHTML={{ __html: plan }} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-section">
          <div className="button-group horizontal">
            <button className="action-btn primary" onClick={handleSave}>
              <span className="btn-icon">{isSaved ? '🔄' : '💾'}</span>
              {isSaved ? 'Update Progress' : 'Save Plan'}
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

        {/* Navigation Hint */}
        {isSaved && (
          <div className="navigation-hint">
            <div className="hint-card">
              <div className="hint-icon">💡</div>
              <div className="hint-content">
                <p>Your progress is automatically saved! Find all your study plans in 
                  <button 
                    className="hint-link" 
                    onClick={() => navigate('/my-study-plans')}
                  >
                    My Study Plans
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="celebration-modal">
            <div className="celebration-content">
              <div className="celebration-animation">🎉</div>
              <h3>{isSaved ? 'Progress Updated!' : 'Plan Saved Successfully!'}</h3>
              <p>{isSaved ? 'Your progress has been automatically saved!' : 'You can find your study plan in "My Study Plans" section!'}</p>
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