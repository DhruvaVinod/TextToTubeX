import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { studyPlansService } from '../../services/studyPlansService';
import './StudyPlans.css'; // Import the CSS file

const MyStudyPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'in-progress'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed:', currentUser);
      if (currentUser) {
        setUser(currentUser);
        try {
          await loadPlans(currentUser.uid);
        } catch (err) {
          console.error('Error loading plans:', err);
          setError('Failed to load study plans. Please try again.');
        }
      } else {
        console.log('No user, redirecting...');
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadPlans = async (userId) => {
    console.log('Loading plans for user:', userId);
    try {
      setLoading(true);
      setError(null);
      const userPlans = await studyPlansService.getUserStudyPlans(userId);
      console.log('Plans loaded:', userPlans);
      setPlans(userPlans);
    } catch (error) {
      console.error('Detailed error loading plans:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };
  

  const safeConvertTimestamp = (timestamp) => {
    if (!timestamp) return new Date().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp.toDate) return timestamp.toDate().toISOString();
    return new Date(timestamp).toISOString();
  };

  const updateProgress = async (planId, change) => {
    try {
      const planIndex = plans.findIndex(plan => plan.id === planId);
      if (planIndex === -1) return;

      const plan = plans[planIndex];
      const oldCompleted = plan.progress.completed;
      const newCompleted = Math.max(0, Math.min(
        plan.progress.total,
        plan.progress.completed + change
      ));

      // Update local state immediately for better UX
      const updatedPlans = [...plans];
      updatedPlans[planIndex] = {
        ...plan,
        progress: {
          ...plan.progress,
          completed: newCompleted
        },
        lastUpdated: new Date().toISOString()
      };
      setPlans(updatedPlans);

      // Update in Firestore
      await studyPlansService.updateProgress(planId, {
        completed: newCompleted,
        total: plan.progress.total
      });

      // Show celebration for completion
      if (newCompleted === plan.progress.total && oldCompleted < plan.progress.total) {
        showCompletionCelebration(plan.topic);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress. Please try again.');
      if (user) {
        await loadPlans(user.uid);
      }
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

  const confirmDelete = (planId) => {
    setPlanToDelete(planId);
    setShowDeleteModal(true);
  };

  const deletePlan = async () => {
    try {
      await studyPlansService.deleteStudyPlan(planToDelete);
      setPlans(plans.filter(plan => plan.id !== planToDelete));
      setShowDeleteModal(false);
      setPlanToDelete(null);
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError('Failed to delete plan. Please try again.');
      setShowDeleteModal(false);
      setPlanToDelete(null);
    }
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
        language: plan.language,
        languageCode: plan.languageCode,
        progress: plan.progress,
        planId: plan.id, // Pass the Firestore document ID
        isFromFirestore: true // Flag to indicate this is from Firestore
      }
    });
  };

  const resetPlanProgress = async (planId) => {
    if (window.confirm('Are you sure you want to reset all progress for this plan? This cannot be undone.')) {
      try {
        const planIndex = plans.findIndex(plan => plan.id === planId);
        if (planIndex === -1) return;

        // Update local state
        const updatedPlans = [...plans];
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          progress: { ...updatedPlans[planIndex].progress, completed: 0 },
          completedDays: [],
          dayNotes: {},
          studyStreak: 0,
          lastUpdated: new Date().toISOString()
        };
        setPlans(updatedPlans);

        // Update in Firestore
        await studyPlansService.updateStudyPlan(planId, {
          progress: { completed: 0, total: updatedPlans[planIndex].progress.total },
          completedDays: [],
          dayNotes: {},
          studyStreak: 0
        });
      } catch (error) {
        console.error('Error resetting progress:', error);
        setError('Failed to reset progress. Please try again.');
        // Reload plans to get the correct state
        if (user) {
          await loadPlans(user.uid);
        }
      }
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (filter === 'completed') {
      return plan.progress.completed === plan.progress.total;
    } else if (filter === 'in-progress') {
      return plan.progress.completed < plan.progress.total;
    }
    return true;
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

  if (loading) {
    return (
      <div className="my-study-plans">
        <header className="study-plans-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <h1 className="study-plans-title">📘 My Study Plans</h1>
        </header>
        <div className="study-plans-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your study plans...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-study-plans">
        <header className="study-plans-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <h1 className="study-plans-title">📘 My Study Plans</h1>
        </header>
        <div className="study-plans-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button 
              className="retry-btn"
              onClick={() => user && loadPlans(user.uid)}
            >
              Try Again
            </button>
            <button 
              className="retry-btn"
              onClick={() => {
                console.log('Current auth state:', auth.currentUser);
                console.log('Attempting to reload plans...');
                if (user) loadPlans(user.uid);
              }}
            >
              Debug Reload
            </button>
          </div>
        </div>
      </div>
    );
  }


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
            {filteredPlans.map((plan) => {
              const progressPercentage = (plan.progress.completed / plan.progress.total) * 100;
              const isCompleted = plan.progress.completed === plan.progress.total;
              
              return (
                <div
                  key={plan.id}
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
                      {plan.language && <span>🌍 {plan.language}</span>}
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
                        onClick={() => updateProgress(plan.id, -1)}
                        disabled={plan.progress.completed <= 0}
                        className="progress-btn decrease"
                        title="Decrease progress"
                      >
                        −
                      </button>
                      <button
                        onClick={() => updateProgress(plan.id, 1)}
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
                      onClick={() => resetPlanProgress(plan.id)}
                      className="action-btn reset"
                      title="Reset progress"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => confirmDelete(plan.id)}
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