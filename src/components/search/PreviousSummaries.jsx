import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import './PreviousSummaries.css';

const PreviousSummaries = ({ onBack }) => {
  const navigate = useNavigate(); // Add this hook
  const [savedSummaries, setSavedSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Handle back navigation - use onBack prop if available, otherwise navigate to home
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const loadSavedSummaries = () => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
      const userSummaries = savedSummaries.filter(summary => summary.userId === user);
      setSavedSummaries(userSummaries); // Use setSavedSummaries instead of setSummaries
    } else {
      setSavedSummaries([]); // Set empty array if no user
    }
  } catch (error) {
    console.error('Error loading summaries:', error);
    setError('Failed to load summaries');
  } finally {
    setIsLoading(false); // Always set loading to false
  }
};

  useEffect(() => {
  loadSavedSummaries();
}, []);


  const handleDeleteSummary = (summaryId) => {
  try {
    const user = localStorage.getItem('user');
    if (!user) {
      alert('Please sign in to delete summaries.');
      return;
    }

    // Get saved summaries from localStorage
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    
    // Filter out the summary to delete
    const updatedSummaries = savedSummaries.filter(summary => summary.id !== summaryId);
    
    // Save back to localStorage
    localStorage.setItem('savedSummaries', JSON.stringify(updatedSummaries));
    
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
    const element = document.createElement('a');
    const file = new Blob([summary.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${summary.videoTitle.substring(0, 50)}_summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                </div>
                
                <div className="summary-info">
                  <h3 className="summary-title" onClick={() => setSelectedSummary(summary)}>
                    {summary.videoTitle}
                  </h3>
                  <p className="summary-channel">{summary.videoChannel}</p>
                  <p className="summary-preview">
                    {summary.content.substring(0, 120)}...
                  </p>
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