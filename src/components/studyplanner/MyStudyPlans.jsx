import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudyPlans.css'; // Import the CSS file

const MyStudyPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'in-progress'

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      alert('Please sign in to view your study plans.');
      navigate('/');
      return;
    }
    setUser(loggedInUser);
    loadPlans();
  }, [navigate]);

  const loadPlans = () => {
    const savedPlans = JSON.parse(localStorage.getItem('studyPlans') || '[]');
    // Sort by last updated (most recent first)
    const sortedPlans = savedPlans.sort((a, b) => 
      new Date(b.lastUpdated || b.createdAt) - new Date(a.lastUpdated || a.createdAt)
    );
    setPlans(sortedPlans);
  };

  const updateProgress = (index, change) => {
    const updated = [...plans];
    const oldCompleted = updated[index].progress.completed;
    updated[index].progress.completed = Math.max(0, Math.min(
      updated[index].progress.total,
      updated[index].progress.completed + change
    ));
    
    // Update last modified timestamp
    updated[index].lastUpdated = new Date().toISOString();
    
    setPlans(updated);
    localStorage.setItem('studyPlans', JSON.stringify(updated));

    // Show celebration for completion
    if (updated[index].progress.completed === updated[index].progress.total && 
        oldCompleted < updated[index].progress.total) {
      showCompletionCelebration(updated[index].topic);
    }
  };

  const showCompletionCelebration = (topic) => {
    // Create a temporary celebration element
    const celebration = document.createElement('div');
    celebration.className = 'celebration-popup';
    celebration.innerHTML = `
      <div class="celebration-icon">🎉</div>
      <h3 class="celebration-title">Congratulations!</h3>
      <p class="celebration-text">You completed "${topic}"!</p>
    `;
    
    document.body.appendChild(celebration);
    setTimeout(() => {
      if (document.body.contains(celebration)) {
        document.body.removeChild(celebration);
      }
    }, 3000);
  };

  const confirmDelete = (planIndex) => {
    setPlanToDelete(planIndex);
    setShowDeleteModal(true);
  };

  const deletePlan = () => {
    const updated = plans.filter((_, index) => index !== planToDelete);
    setPlans(updated);
    localStorage.setItem('studyPlans', JSON.stringify(updated));
    setShowDeleteModal(false);
    setPlanToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPlanToDelete(null);
  };

  const viewPlanDetails = (plan) => {
    // Navigate to StudyResult with the plan data
    navigate('/study-result', {
      state: {
        plan: plan.plan,
        calendar: plan.calendar,
        topic: plan.topic,
        difficulty: plan.difficulty,
        progress: plan.progress
      }
    });
  };

  const resetPlanProgress = (index) => {
    if (window.confirm('Are you sure you want to reset all progress for this plan? This cannot be undone.')) {
      const updated = [...plans];
      updated[index].progress.completed = 0;
      updated[index].completedDays = [];
      updated[index].dayNotes = {};
      updated[index].studyStreak = 0;
      updated[index].lastUpdated = new Date().toISOString();
      setPlans(updated);
      localStorage.setItem('studyPlans', JSON.stringify(updated));
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (filter === 'completed') {
      return plan.progress.completed === plan.progress.total;
    } else if (filter === 'in-progress') {
      return plan.progress.completed < plan.progress.total;
    }
    return true; // 'all'
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage) => {
    if (percentage === 100) return '#39ff14'; // green
    if (percentage >= 75) return '#00d4ff'; // blue
    if (percentage >= 50) return '#f59e0b'; // yellow
    if (percentage >= 25) return '#f97316'; // orange
    return '#ff4757'; // red
  };

  return (
    <div className="my-study-plans">
      {/* Header */}
      <header className="study-plans-header">
        <button 
          onClick={() => navigate(-1)}
          className="back-btn"
        >
          ← Back
        </button>
        <h1 className="study-plans-title">
          📘 My Study Plans
        </h1>
      </header>

      <div className="study-plans-container">
        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="filter-content">
            <div className="filter-buttons">
              {[
                { key: 'all', label: 'All Plans', icon: '📚' },
                { key: 'in-progress', label: 'In Progress', icon: '🔄' },
                { key: 'completed', label: 'Completed', icon: '✅' }
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`filter-btn ${filter === key ? 'active' : ''}`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <div className="filter-count">
              {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Plans List */}
        {filteredPlans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3 className="empty-title">
              {filter === 'all' ? 'No study plans yet' : 
               filter === 'completed' ? 'No completed plans yet' : 
               'No plans in progress'}
            </h3>
            <p className="empty-description">
              {filter === 'all' ? 'Create your first study plan to get started!' :
               filter === 'completed' ? 'Complete some plans to see them here!' :
               'Start working on your plans to see them here!'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="create-plan-btn"
            >
              Create New Plan
            </button>
          </div>
        ) : (
          <div className="plans-grid">
            {filteredPlans.map((plan, index) => {
              const progressPercentage = (plan.progress.completed / plan.progress.total) * 100;
              const isCompleted = plan.progress.completed === plan.progress.total;
              
              return (
                <div
                  key={plan.id || index}
                  className={`plan-card ${isCompleted ? 'completed' : ''}`}
                >
                  {/* Completion Badge */}
                  {isCompleted && (
                    <div className="completion-badge">
                      ✅ Completed
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="plan-header">
                    <h2 className="plan-title">
                      📚 {plan.topic}
                      <span className="difficulty-badge">
                        {plan.difficulty}
                      </span>
                    </h2>
                    
                    <div className="plan-meta">
                      <span>📅 {plan.calendar?.totalDays || 0} days</span>
                      <span>⏰ {plan.calendar?.dailyHours || 0}h/day</span>
                      <span>🔄 Updated: {formatDate(plan.lastUpdated || plan.createdAt)}</span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-text">
                        Progress: {plan.progress.completed}/{plan.progress.total}
                      </span>
                      <span 
                        className="progress-percentage"
                        style={{ color: getProgressColor(progressPercentage) }}
                      >
                        {progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${isCompleted ? 'completed' : ''}`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>

                    {/* Progress Controls */}
                    <div className="progress-controls">
                      <button
                        onClick={() => updateProgress(plans.indexOf(plan), -1)}
                        disabled={plan.progress.completed <= 0}
                        className="progress-btn decrease"
                        title="Decrease progress"
                      >
                        −
                      </button>
                      <button
                        onClick={() => updateProgress(plans.indexOf(plan), 1)}
                        disabled={plan.progress.completed >= plan.progress.total}
                        className="progress-btn increase"
                        title="Increase progress"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <button
                      onClick={() => viewPlanDetails(plan)}
                      className="action-btn primary"
                    >
                      👁️ View Details
                    </button>
                    <button
                      onClick={() => resetPlanProgress(plans.indexOf(plan))}
                      className="action-btn reset"
                      title="Reset progress"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => confirmDelete(plans.indexOf(plan))}
                      className="action-btn delete"
                      title="Delete plan"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Study Plan Preview */}
                  <details className="plan-preview">
                    <summary>
                      📖 View Study Plan
                    </summary>
                    <div
                      className="plan-content"
                      dangerouslySetInnerHTML={{ __html: plan.plan }}
                    />
                  </details>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-icon">⚠️</div>
                <h3 className="modal-title">
                  Delete Study Plan?
                </h3>
                <p className="modal-description">
                  This action cannot be undone. All progress and notes will be lost.
                </p>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={cancelDelete}
                  className="modal-btn cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={deletePlan}
                  className="modal-btn confirm"
                >
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudyPlans;