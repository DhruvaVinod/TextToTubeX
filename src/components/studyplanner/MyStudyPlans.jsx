import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    celebration.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 1rem;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      animation: celebration 0.5s ease-out;
    `;
    celebration.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
      <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">Congratulations!</h3>
      <p style="margin: 0; opacity: 0.9;">You completed "${topic}"!</p>
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
    if (percentage === 100) return '#10b981'; // green
    if (percentage >= 75) return '#3b82f6'; // blue
    if (percentage >= 50) return '#f59e0b'; // yellow
    if (percentage >= 25) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem 1rem'
    }}>
      {/* Header */}
      <header style={{
        maxWidth: '1200px',
        margin: '0 auto 2rem auto',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          ← Back
        </button>
        <h1 style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          margin: 0,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          📘 My Study Plans
        </h1>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Filter Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {[
                { key: 'all', label: 'All Plans', icon: '📚' },
                { key: 'in-progress', label: 'In Progress', icon: '🔄' },
                { key: 'completed', label: 'Completed', icon: '✅' }
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    background: filter === key ? '#667eea' : 'transparent',
                    color: filter === key ? 'white' : '#667eea',
                    border: `2px solid ${filter === key ? '#667eea' : '#e5e7eb'}`,
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Plans List */}
        {filteredPlans.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '1rem',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
            <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>
              {filter === 'all' ? 'No study plans yet' : 
               filter === 'completed' ? 'No completed plans yet' : 
               'No plans in progress'}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              {filter === 'all' ? 'Create your first study plan to get started!' :
               filter === 'completed' ? 'Complete some plans to see them here!' :
               'Start working on your plans to see them here!'}
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Create New Plan
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
          }}>
            {filteredPlans.map((plan, index) => {
              const progressPercentage = (plan.progress.completed / plan.progress.total) * 100;
              const isCompleted = plan.progress.completed === plan.progress.total;
              
              return (
                <div
                  key={plan.id || index}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    border: isCompleted ? '2px solid #10b981' : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* Completion Badge */}
                  {isCompleted && (
                    <div style={{
                      position: 'absolute',
                      top: '-0.5rem',
                      right: '1rem',
                      background: '#10b981',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      ✅ Completed
                    </div>
                  )}

                  {/* Plan Header */}
                  <div style={{ marginBottom: '1rem' }}>
                    <h2 style={{
                      color: '#1f2937',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      margin: '0 0 0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      📚 {plan.topic}
                      <span style={{
                        background: '#e5e7eb',
                        color: '#374151',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 'normal'
                      }}>
                        {plan.difficulty}
                      </span>
                    </h2>
                    
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      flexWrap: 'wrap'
                    }}>
                      <span>📅 {plan.calendar?.totalDays || 0} days</span>
                      <span>⏰ {plan.calendar?.dailyHours || 0}h/day</span>
                      <span>🔄 Updated: {formatDate(plan.lastUpdated || plan.createdAt)}</span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#374151' }}>
                        Progress: {plan.progress.completed}/{plan.progress.total}
                      </span>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: getProgressColor(progressPercentage)
                      }}>
                        {progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div style={{
                      width: '100%',
                      height: '0.5rem',
                      background: '#e5e7eb',
                      borderRadius: '0.25rem',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progressPercentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${getProgressColor(progressPercentage)}, ${getProgressColor(progressPercentage)}dd)`,
                        borderRadius: '0.25rem',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {/* Progress Controls */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginTop: '1rem'
                    }}>
                      <button
                        onClick={() => updateProgress(plans.indexOf(plan), -1)}
                        disabled={plan.progress.completed <= 0}
                        style={{
                          background: plan.progress.completed <= 0 ? '#e5e7eb' : '#ef4444',
                          color: plan.progress.completed <= 0 ? '#9ca3af' : 'white',
                          border: 'none',
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          cursor: plan.progress.completed <= 0 ? 'not-allowed' : 'pointer',
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        title="Decrease progress"
                      >
                        −
                      </button>
                      <button
                        onClick={() => updateProgress(plans.indexOf(plan), 1)}
                        disabled={plan.progress.completed >= plan.progress.total}
                        style={{
                          background: plan.progress.completed >= plan.progress.total ? '#e5e7eb' : '#10b981',
                          color: plan.progress.completed >= plan.progress.total ? '#9ca3af' : 'white',
                          border: 'none',
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          cursor: plan.progress.completed >= plan.progress.total ? 'not-allowed' : 'pointer',
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        title="Increase progress"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => viewPlanDetails(plan)}
                      style={{
                        flex: '1',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      👁️ View Details
                    </button>
                    <button
                      onClick={() => resetPlanProgress(plans.indexOf(plan))}
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Reset progress"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => confirmDelete(plans.indexOf(plan))}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete plan"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Study Plan Preview */}
                  <details style={{ marginTop: '1rem' }}>
                    <summary style={{
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      padding: '0.5rem 0'
                    }}>
                      📖 View Study Plan
                    </summary>
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#374151',
                        maxHeight: '200px',
                        overflow: 'auto',
                        border: '1px solid #e5e7eb'
                      }}
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
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{
                  color: '#374151',
                  marginBottom: '0.5rem',
                  fontSize: '1.25rem'
                }}>
                  Delete Study Plan?
                </h3>
                <p style={{
                  color: '#6b7280',
                  margin: 0,
                  fontSize: '0.9rem'
                }}>
                  This action cannot be undone. All progress and notes will be lost.
                </p>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={cancelDelete}
                  style={{
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deletePlan}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add celebration animation styles */}
      <style>{`
        @keyframes celebration {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default MyStudyPlans;