import React, { useState, useEffect } from 'react';
import './SearchResults.css';

const SearchResults = ({ searchQuery, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showSummarySelection, setShowSummarySelection] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const funFacts = [
    "Did you know? The human brain can process visual information 60,000 times faster than text!",
    "Fun fact: YouTube has over 2 billion logged-in monthly users worldwide.",
    "Amazing! The average person remembers 65% of visual information after three days.",
    "Cool fact: Video content is 50x more likely to drive organic search results than plain text.",
    "Interesting: Your brain processes images in as little as 13 milliseconds!",
    "Did you know? Educational videos can improve learning retention by up to 400%.",
    "Fun fact: The human attention span averages 8 seconds, but videos can hold it longer!",
    "Amazing! Visual learners make up about 65% of the population."
  ];

  const placeholderVideos = [
    {
      id: 1,
      title: "vid",
      channel: "rando",
      duration: "12:45",
      views: "0 views",
      thumbnail: "thumbnail"
    },
    {
      id: 2,
      title: "vid",
      channel: "rando",
      duration: "12:45",
      views: "10 views",
      thumbnail: "thumbnail"
    },
    {
      id: 3,
      title: "vid",
      channel: "rando",
      duration: "12:45",
      views: "1M views",
      thumbnail: "thumbnail"
    },
    {
      id: 4,
      title: "vid",
      channel: "rando",
      duration: "12:45",
      views: "1.2M views",
      thumbnail: "thumbnail"
    },
    
  ];

  useEffect(() => {
    const factInterval = setInterval(() => {
  setCurrentFactIndex(() => Math.floor(Math.random() * funFacts.length));
}, 4000); // 4ms ?

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setShowResults(true);
    }, 8000); // hard coded for now to check animations 

    return () => {
      clearInterval(factInterval);
      clearTimeout(loadingTimer);
    };
  }, []);

  useEffect(() => {
    if (isGeneratingSummary) {
      const factInterval = setInterval(() => {
        setCurrentFactIndex(() => Math.floor(Math.random() * funFacts.length));
      }, 4000);

      const summaryTimer = setTimeout(() => {
        setIsGeneratingSummary(false);
        setShowSummary(true);
      }, 8000);

      return () => {
        clearInterval(factInterval);
        clearTimeout(summaryTimer);
      };
    }
  }, [isGeneratingSummary]);

  const handleGenerateSummary = () => {
    setShowSummarySelection(true);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setShowSummarySelection(false);
    setIsGeneratingSummary(true);
  };

  const handleBackToSelection = () => {
    setShowSummary(false);
    setShowSummarySelection(false);
    setSelectedVideo(null);
  };

  const handleChangeVideo = () => {
    setShowSummary(false);
    setShowSummarySelection(true);
  };

  const handleReadyForQuiz = () => {
    alert('someone do the quiz page');
  };

  if (isLoading) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Searching for: "{searchQuery}"</h2>
          </div>
          
          <div className="loading-content">
            <div className="loading-animation">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <div className="search-icon">🔍</div>
            </div>
            
            <h3>Finding the best educational content for you...</h3>
            
            <div className="fun-fact">
              <div className="fact-icon">💡</div>
              <p className="fact-text">{funFacts[currentFactIndex]}</p>
            </div>
            
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isGeneratingSummary) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={handleBackToSelection}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Generating summary for: "{selectedVideo?.title}"</h2>
          </div>
          
          <div className="loading-content">
            <div className="loading-animation">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <div className="search-icon">📄</div>
            </div>
            
            <h3>Creating your personalized summary...</h3>
            
            <div className="fun-fact">
              <div className="fact-icon">💡</div>
              <p className="fact-text">{funFacts[currentFactIndex]}</p>
            </div>
            
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSummarySelection) {
    return (
      <div className="search-results">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToSelection}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>create summary for which video ?</h2>
        </div>

        <div className="results-content">
          <div className="video-grid">
            {placeholderVideos.map((video) => (
              <div key={video.id} className="video-card" onClick={() => handleVideoSelect(video)}>
                <div className="video-thumbnail">
                  <div className="thumbnail-icon">{video.thumbnail}</div>
                  <div className="video-duration">{video.duration}</div>
                </div>
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-channel">{video.channel}</p>
                  <p className="video-views">{video.views}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="search-results">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToSelection}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Summary for: "{selectedVideo?.title}"</h2>
          <button className="download-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15M7 10L12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="results-content">
          <div className="summary-container">
            <div className="summary-content">
              <p>this is where summary should come...</p>
            </div>
            
            <div className="summary-actions">
              <button className="change-video-btn" onClick={handleChangeVideo}>
                Change Video
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2>Results for: "{searchQuery}"</h2>
      </div>

      <div className="results-content">
        <div className="video-grid">
          {placeholderVideos.map((video) => (
            <div key={video.id} className="video-card" onClick={() => alert(`Selected: ${video.title}`)}>
              <div className="video-thumbnail">
                <div className="thumbnail-icon">{video.thumbnail}</div>
                <div className="video-duration">{video.duration}</div>
              </div>
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <p className="video-channel">{video.channel}</p>
                <p className="video-views">{video.views}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="action-section">
          <h3>What would you like to do next?</h3>
          <div className="action-buttons">
            <button className="action-btn summary-btn" onClick={handleGenerateSummary}>
              <div className="btn-icon">📄</div>
              <span>Generate Summary</span>
            </button>
            <button className="action-btn quiz-btn" onClick={handleReadyForQuiz}>
              <div className="btn-icon">🧩</div>
              <span>Ready for a Quiz?</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;