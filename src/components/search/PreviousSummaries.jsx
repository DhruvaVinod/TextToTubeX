import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getSummariesFromFirestore, 
  deleteSummaryFromFirestore 
} from '../../services/firestoreServices';
import './PreviousSummaries.css';

const PreviousSummaries = ({ onBack }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [savedSummaries, setSavedSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [audioUrls, setAudioUrls] = useState({}); // Store created audio URLs

  // Helper function to create audio URL from base64 data
  const createAudioUrl = (audioData, audioType) => {
    if (!audioData || !audioType) {
      console.log('Missing audio data or type:', { audioData: !!audioData, audioType });
      return null;
    }
    
    try {
      // Remove data URL prefix if present
      const base64Data = audioData.includes(',') ? audioData.split(',')[1] : audioData;
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: audioType });
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      console.log('Created audio URL:', url, 'from type:', audioType);
      return url;
    } catch (error) {
      console.error('Error creating audio URL:', error);
      return null;
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const loadSavedSummaries = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    if (!isAuthenticated || !currentUser) {
      setSavedSummaries([]);
      setIsLoading(false);
      return;
    }

    console.log('Fetching summaries for user:', currentUser.uid);
    const summariesFromFirestore = await getSummariesFromFirestore(currentUser.uid);
    
    console.log('Fetched summaries:', summariesFromFirestore);
    
    // Process summaries (keep your existing audio processing)
    const processedSummaries = summariesFromFirestore.map(summary => {
      // ... your existing audio processing logic
      return summary;
    });
    
    setSavedSummaries(processedSummaries);
    
  } catch (error) {
    console.error('Error loading summaries:', error);
    setError('Failed to load summaries. Please try again.');
  } finally {
    setIsLoading(false);
  }
}, [isAuthenticated, currentUser]);

  useEffect(() => {
    // Add a small delay to ensure auth state is properly initialized
    const timer = setTimeout(() => {
      loadSavedSummaries();
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [loadSavedSummaries]);

  // Cleanup audio URLs when component unmounts or audioUrls changes
  useEffect(() => {
    return () => {
      Object.values(audioUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [audioUrls]);

  const handleDeleteSummary = async (summaryId) => {
    try {
      if (!isAuthenticated || !currentUser) {
        alert('Please sign in to delete summaries.');
        return;
      }

      // Find the summary to get its firestoreId
      const summaryToDelete = savedSummaries.find(s => s.id === summaryId);
      if (!summaryToDelete) {
        console.error('Summary not found:', summaryId);
        return;
      }

      // Clean up audio URL if it exists
      if (audioUrls[summaryId]) {
        URL.revokeObjectURL(audioUrls[summaryId]);
        setAudioUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[summaryId];
          return newUrls;
        });
      }

      // Delete from Firestore
      await deleteSummaryFromFirestore(currentUser.uid, summaryToDelete.firestoreId);
      
      // Update local state
      setSavedSummaries(prev => prev.filter(summary => summary.id !== summaryId));
      setShowDeleteConfirm(null);
      
      if (selectedSummary && selectedSummary.id === summaryId) {
        setSelectedSummary(null);
      }
      
    } catch (error) {
      console.error('Error deleting summary:', error);
      alert('Failed to delete summary. Please try again.');
    }
  };

  const handleDownloadSummary = (summary) => {
    try {
      const element = document.createElement('a');
      const file = new Blob([summary.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${summary.videoTitle.substring(0, 50)}_summary.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href); // Clean up
    } catch (error) {
      console.error('Error downloading summary:', error);
      alert('Failed to download summary. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatLanguage = (languageCode) => {
    const languages = {
      "en": "English",
      "hi": "Hindi",
      "ta": "Tamil",
      "te": "Telugu",
      "kn": "Kannada",
      "ml": "Malayalam",
      "bn": "Bengali",
      "gu": "Gujarati",
      "mr": "Marathi",
      "pa": "Punjabi",
      "ur": "Urdu",
      "or": "Odia",
      "as": "Assamese"
    };
    return languages[languageCode] || languageCode;
  };

  // Show sign-in message if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="previous-summaries">
        <div className="summaries-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Previous Summaries</h2>
        </div>
        
        <div className="auth-required">
          <div className="auth-icon">🔐</div>
          <h3>Sign In Required</h3>
          <p>Please sign in to view your saved summaries.</p>
          <button className="sign-in-btn" onClick={() => navigate('/')}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="previous-summaries">
        <div className="summaries-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Previous Summaries</h2>
        </div>
        
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your saved summaries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="previous-summaries">
        <div className="summaries-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Previous Summaries</h2>
        </div>
        
        <div className="error-container">
          <div className="error-icon">❌</div>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadSavedSummaries}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (selectedSummary) {
    return (
      <div className="previous-summaries">
        <div className="summaries-header">
          <button className="back-btn" onClick={() => setSelectedSummary(null)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Summary Details</h2>
          <div className="summary-actions">
            <button className="download-btn" onClick={() => handleDownloadSummary(selectedSummary)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15M7 10L12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download
            </button>
            <button 
              className="delete-btn" 
              onClick={() => setShowDeleteConfirm(selectedSummary.id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.4477 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          </div>
        </div>

        <div className="summary-detail-content">
          <div className="video-info-card">
            <div className="video-thumbnail">
              <img 
                src={selectedSummary.videoThumbnail} 
                alt={selectedSummary.videoTitle}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="thumbnail-fallback" style={{ display: 'none' }}>🎥</div>
            </div>
            <div className="video-details">
              <h3>{selectedSummary.videoTitle}</h3>
              <p className="video-channel">{selectedSummary.videoChannel}</p>
              <div className="video-meta">
                <span>Duration: {selectedSummary.videoDuration}</span>
                <span>Language: {formatLanguage(selectedSummary.language)}</span>
                <span>Saved: {formatDate(selectedSummary.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="summary-content-card">
            <h4>Summary:</h4>
            <div className="summary-text">
              {selectedSummary.content}
            </div>
            
            {(selectedSummary.audioUrl || (selectedSummary.audioData && selectedSummary.audioType)) && (
              <div className="audio-player">
                <h4>🔊 Audio Summary:</h4>
                <audio 
                  controls 
                  src={selectedSummary.audioUrl || createAudioUrl(selectedSummary.audioData, selectedSummary.audioType)}
                  onError={(e) => console.error('Audio playback error:', e)}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {selectedSummary.keyPoints && selectedSummary.keyPoints.length > 0 && (
              <div className="key-points">
                <h4>Key Points:</h4>
                <ul>
                  {selectedSummary.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {showDeleteConfirm === selectedSummary.id && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <h3>Delete Summary?</h3>
              <p>Are you sure you want to delete this summary? This action cannot be undone.</p>
              <div className="confirm-actions">
                <button 
                  className="cancel-btn" 
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-delete-btn" 
                  onClick={() => handleDeleteSummary(selectedSummary.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="previous-summaries">
      <div className="summaries-header">
        <button className="back-btn" onClick={handleBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2>Previous Summaries</h2>
      </div>

      <div className="summaries-content">
        {savedSummaries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No Saved Summaries</h3>
            <p>You haven't saved any summaries yet. Generate a summary and save it to see it here!</p>
          </div>
        ) : (
          <div className="summaries-grid">
            {savedSummaries.map((summary) => (
              <div key={summary.id} className="summary-card">
                <div className="summary-thumbnail">
                  <img 
                    src={summary.videoThumbnail} 
                    alt={summary.videoTitle}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="thumbnail-fallback" style={{ display: 'none' }}>🎥</div>
                  <div className="language-badge">
                    {formatLanguage(summary.language)}
                  </div>
                  {(summary.hasAudio || summary.audioData) && (
                    <div className="audio-badge">🔊</div>
                  )}
                </div>
                
                <div className="summary-info">
                  <h3 className="summary-title" onClick={() => setSelectedSummary(summary)}>
                    {summary.videoTitle}
                  </h3>
                  <p className="summary-channel">{summary.videoChannel}</p>
                  <p className="summary-preview">
                    {summary.content.substring(0, 120)}...
                  </p>
                  
                  {(summary.audioUrl || (summary.audioData && summary.audioType)) && (
                    <div className="audio-card">
                      <audio 
                        controls 
                        src={summary.audioUrl || createAudioUrl(summary.audioData, summary.audioType)}
                        onError={(e) => console.error('Audio playback error for summary:', summary.id, e)}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                  
                  <div className="summary-meta">
                    <span>{summary.videoDuration}</span>
                    <span>{formatDate(summary.createdAt)}</span>
                  </div>
                </div>

                <div className="summary-actions">
                  <button 
                    className="view-btn"
                    onClick={() => setSelectedSummary(summary)}
                  >
                    View
                  </button>
                  <button 
                    className="download-btn"
                    onClick={() => handleDownloadSummary(summary)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15M7 10L12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => setShowDeleteConfirm(summary.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.4477 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <h3>Delete Summary?</h3>
            <p>Are you sure you want to delete this summary? This action cannot be undone.</p>
            <div className="confirm-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn" 
                onClick={() => {
                  const summaryToDelete = savedSummaries.find(s => s.id === showDeleteConfirm);
                  if (summaryToDelete) {
                    handleDeleteSummary(summaryToDelete.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviousSummaries;