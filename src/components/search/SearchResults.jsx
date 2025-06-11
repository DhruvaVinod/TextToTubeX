import React, { useState, useEffect } from 'react';
import './SearchResults.css';
import { useNavigate } from 'react-router-dom';

const SearchResults = ({ searchQuery, onBack }) => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showSummarySelection, setShowSummarySelection] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [copyrightError, setCopyrightError] = useState(null); // New state for copyright errors

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const languages = {
    "English": "en",
    "Hindi": "hi",
    "Tamil": "ta",
    "Telugu": "te",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Bengali": "bn",
    "Gujarati": "gu",
    "Marathi": "mr",
    "Punjabi": "pa",
    "Urdu": "ur",
    "Odia": "or",
    "Assamese": "as"
  };

  const funFacts = [
    "Did you know? Google processes over 8.5 billion searches every single day!",
    "Fun fact: Google's original name was 'BackRub' before Larry Page and Sergey Brin changed it to Google.",
    "Amazing! Google Translate supports over 130 languages and translates more than 100 billion words daily.",
    "Cool fact: Gmail was announced on April 1, 2004, and many people thought it was an April Fools' joke!",
    "Interesting: Google's headquarters is called the Googleplex, located in Mountain View, California.",
    "Did you know? YouTube uploads over 500 hours of video content every minute!",
    "Fun fact: Google Chrome is the world's most popular web browser, used by over 3 billion people.",
    "Amazing! Google Drive stores over 2 trillion files and has more than 1 billion users worldwide.",
    "Cool fact: Google Maps has mapped over 220 countries and territories, including Street View imagery.",
    "Interesting: Google's search algorithm uses more than 200 factors to rank web pages in search results.",
    "Did you know? Google Docs, Sheets, and Slides allow real-time collaboration with unlimited revision history.",
    "Fun fact: Google's PageRank algorithm was named after Larry Page, one of Google's co-founders.",
    "Amazing! Google Photos stores over 4 trillion photos and offers 15GB of free storage per account.",
    "Cool fact: Google Scholar indexes over 160 million academic documents and research papers.",
    "Interesting: Google Classroom is used by over 150 million students and teachers worldwide.",
    "Did you know? Google's 'I'm Feeling Lucky' button bypasses search results and takes you directly to the first result.",
    "Fun fact: Google Earth has captured imagery of over 98% of the world's population areas.",
    "Amazing! Google Assistant can understand and respond in over 30 languages across 90+ countries.",
    "Cool fact: Google Lens can identify over 1 billion objects, including plants, animals, and landmarks.",
    "Interesting: Google's data centers use 50% less energy than typical data centers through innovative cooling systems.",
    "Did you know? Google Search can perform calculations, unit conversions, and even solve math equations directly.",
    "Fun fact: Google Keep lets you search for notes by drawing or sketching what you're looking for.",
    "Amazing! Google Meet can host video calls with up to 500 participants in enterprise accounts.",
    "Cool fact: Google Trends shows what the world is searching for in real-time and historical data.",
    "Interesting: Google's autocomplete feature processes search queries in less than 0.2 seconds.",
    "Did you know? Google Play Store has over 2.8 million apps available for Android devices.",
    "Fun fact: Google's logo has been changed over 5,000 times with special Doodles since 1998.",
    "Amazing! Google Forms can automatically grade quizzes and provides instant feedback to students.",
    "Cool fact: Google Sites allows you to create websites without any coding knowledge required.",
    "Interesting: Google's mission statement is 'to organize the world's information and make it universally accessible and useful.'"
  ];

  // Function to search YouTube videos
  const searchYouTubeVideos = async (query) => {
    try {
      const response = await fetch('https://your-app-136108111450.us-central1.run.app/api/search-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Failed to search videos');
      }

      const data = await response.json();
      return data.videos;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  };

  // Function to generate summary
  const generateSummary = async (videoId, language) => {
    try {
      const response = await fetch('https://your-app-136108111450.us-central1.run.app/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          video_id: videoId,
          language: language
        }),
      });

      // Handle copyright error specifically
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.copyright_restricted) {
          throw new Error(`COPYRIGHT_ERROR:${errorData.error}`);
        }
      }

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  };

  // Function to format duration from YouTube API format
  const formatDuration = (duration) => {
    // YouTube API returns duration in ISO 8601 format (PT4M13S)
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    let formattedDuration = '';
    
    if (hours) {
      formattedDuration += `${hours}:`;
    }
    
    if (minutes) {
      formattedDuration += hours ? minutes.padStart(2, '0') : minutes;
    } else {
      formattedDuration += '0';
    }
    
    formattedDuration += ':';
    formattedDuration += seconds ? seconds.padStart(2, '0') : '00';
    
    return formattedDuration;
  };

  // Function to format view count
  const formatViews = (viewCount) => {
    const count = parseInt(viewCount);
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else {
      return `${count} views`;
    }
  };

  useEffect(() => {
    const factInterval = setInterval(() => {
      setCurrentFactIndex(() => Math.floor(Math.random() * funFacts.length));
    }, 4000);

    // Search for videos when component mounts
    const loadVideos = async () => {
      try {
        setIsLoading(true);
        const searchResults = await searchYouTubeVideos(searchQuery);
        
        // Transform the results to match our component structure
        const transformedVideos = searchResults.map((video, index) => ({
          id: video.id,
          title: video.title,
          channel: video.channelTitle,
          duration: formatDuration(video.duration),
          views: formatViews(video.viewCount),
          thumbnail: video.thumbnailUrl,
          description: video.description,
          publishedAt: video.publishedAt,
          relevanceScore: video.relevanceScore,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`
        }));

        setVideos(transformedVideos);
        setIsLoading(false);
        setShowResults(true);
      } catch (error) {
        console.error('Error loading videos:', error);
        setError('Failed to load videos. Please try again.');
        setIsLoading(false);
      }
    };

    loadVideos();

    return () => {
      clearInterval(factInterval);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (isGeneratingSummary) {
      const factInterval = setInterval(() => {
        setCurrentFactIndex(() => Math.floor(Math.random() * funFacts.length));
      }, 4000);

      const processSummary = async () => {
        try {
          const summaryResult = await generateSummary(selectedVideo.id, selectedLanguage);
          setSummaryData(summaryResult);
          setIsGeneratingSummary(false);
          setShowSummary(true);
        } catch (error) {
          console.error('Error processing summary:', error);
          
          // Check if it's a copyright error
          if (error.message.startsWith('COPYRIGHT_ERROR:')) {
            const copyrightMessage = error.message.replace('COPYRIGHT_ERROR:', '');
            setCopyrightError({
              message: copyrightMessage,
              video: selectedVideo
            });
          } else {
            setError('Failed to generate summary. Please try again.');
          }
          
          setIsGeneratingSummary(false);
        }
      };

      processSummary();

      return () => {
        clearInterval(factInterval);
      };
    }
  }, [isGeneratingSummary, selectedVideo, selectedLanguage]);

  const handleGenerateSummary = () => {
    setShowSummarySelection(true);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setShowSummarySelection(false);
    setShowLanguageSelection(true);
  };

  const handleLanguageSelect = (languageCode, languageName) => {
    setSelectedLanguage(languageCode);
    setShowLanguageSelection(false);
    setIsGeneratingSummary(true);
  };

  const handleBackToSelection = () => {
    setShowSummary(false);
    setShowLanguageSelection(false);
    setShowSummarySelection(false);
    setSelectedVideo(null);
    setSelectedLanguage(null);
    setSummaryData(null);
    setCopyrightError(null); // Clear copyright error
  };

  const handleChangeVideo = () => {
    setShowSummary(false);
    setShowLanguageSelection(false);
    setShowSummarySelection(true);
    setSelectedVideo(null);
    setSelectedLanguage(null);
    setSummaryData(null);
    setCopyrightError(null); // Clear copyright error
  };

  const handleReadyForQuiz = () => {
    navigate('/quiz', { state: { quizTopic: searchQuery } });
  };

  const handleVideoClick = (video) => {
    // Open YouTube video in new tab
    window.open(video.videoUrl, '_blank');
  };

  const handleSaveSummary = async () => {
    const user = localStorage.getItem('user');
    if (!user || !summaryData || !selectedVideo) {
      alert('Please make sure you are logged in and have a summary to save.');
      return;
    }

    try {
      setIsSaving(true);
      
      const summaryToSave = {
        id: Date.now(), // Add unique ID
        userId: user, // Use the user from localStorage
        videoId: selectedVideo.id,
        videoTitle: selectedVideo.title,
        videoChannel: selectedVideo.channel,
        videoDuration: selectedVideo.duration,
        videoThumbnail: selectedVideo.thumbnail,
        videoUrl: selectedVideo.videoUrl,
        language: selectedLanguage,
        languageName: Object.keys(languages).find(key => languages[key] === selectedLanguage),
        content: summaryData.summary,
        keyPoints: summaryData.key_points || [],
        createdAt: new Date().toISOString(),
        searchQuery: searchQuery // Add original search query
      };

      const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
      savedSummaries.push(summaryToSave);
      localStorage.setItem('savedSummaries', JSON.stringify(savedSummaries));

      setIsSaved(true);
      alert('Summary saved successfully!');
    } catch (error) {
      console.error('Error saving summary:', error);
      alert('Failed to save summary. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSummary = () => {
    if (summaryData && summaryData.summary) {
      const element = document.createElement('a');
      const file = new Blob([summaryData.summary], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${selectedVideo.title.substring(0, 50)}_summary.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Handle back from copyright error
  const handleBackFromCopyright = () => {
    setCopyrightError(null);
    setShowSummarySelection(true);
  };

  // Copyright Error UI
  if (copyrightError) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={handleBackFromCopyright}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Copyright Protected Content</h2>
          </div>
          
          <div className="loading-content">
            <div className="copyright-error-container">
              <div className="copyright-icon">🔒</div>
              <div className="copyright-video-info">
                <img 
                  src={copyrightError.video.thumbnail} 
                  alt={copyrightError.video.title}
                  className="copyright-thumbnail"
                />
                <div className="copyright-video-details">
                  <h3>{copyrightError.video.title}</h3>
                  <p>{copyrightError.video.channel}</p>
                </div>
              </div>
              
              <div className="copyright-message">
                <h4>Cannot Process This Video</h4>
                <p>{copyrightError.message}</p>
              </div>
              
              <div className="copyright-suggestions">
                <div className="suggestion">
                  <div className="suggestion-icon">🎓</div>
                  <div className="suggestion-text">
                    <strong>Try Educational Content</strong>
                    <p>Look for lectures, tutorials, or educational channels</p>
                  </div>
                </div>
                <div className="suggestion">
                  <div className="suggestion-icon">👤</div>
                  <div className="suggestion-text">
                    <strong>Independent Creators</strong>
                    <p>Choose videos from individual content creators</p>
                  </div>
                </div>
                <div className="suggestion">
                  <div className="suggestion-icon">🆓</div>
                  <div className="suggestion-text">
                    <strong>Open Source Content</strong>
                    <p>Look for Creative Commons or openly licensed videos</p>
                  </div>
                </div>
              </div>
              
              <div className="copyright-actions">
                <button className="change-video-btn" onClick={handleBackFromCopyright}>
                  Choose Different Video
                </button>
                <button className="watch-original-btn" onClick={() => window.open(copyrightError.video.videoUrl, '_blank')}>
                  Watch on YouTube
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Error occurred</h2>
          </div>
          
          <div className="loading-content">
            <div className="fun-fact">
              <div className="fact-icon">❌</div>
              <p className="fact-text">{error}</p>
            </div>
            <button className="change-video-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            
            <h3>Downloading video, generating and translating summary...</h3>
            
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

  if (showLanguageSelection) {
    return (
      <div className="search-results">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToSelection}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Choose Language for Summary</h2>
        </div>
         
        <div className="results-content" style={{ padding: '20px', paddingTop: '0px' }}>
          <div className="selected-video-info" style={{ marginTop: '25px', marginBottom: '5px' }}>
              <div className="video-thumbnail">
                <img 
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="thumbnail-image"
                />
              </div>
              <div className="video-details">
                <h3>{selectedVideo.title}</h3>
                <p>{selectedVideo.channel}</p>
              </div>
          </div>
           
          <div className="language-grid" style={{ marginTop: '-450px', marginLeft: '550px'}}>
            {Object.entries(languages).map(([languageName, languageCode]) => (
              <button 
                key={languageCode}
                className="language-card"
                onClick={() => handleLanguageSelect(languageCode, languageName)}
              >
                <div className="language-name">{languageName}</div>
                <div className="language-code">{languageCode.toUpperCase()}</div>
              </button>
            ))}
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
          <h2>Create summary for which video?</h2>
        </div>
         
        <div className="results-content">
          <div className="video-grid">
            {videos.map((video) => (
              <div key={video.id} className="video-card" onClick={() => handleVideoSelect(video)}>
                <div className="video-thumbnail">
                  <img 
                    src={video.thumbnail}
                    alt={video.title}
                    className="thumbnail-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="thumbnail-icon" >🎥</div>
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
          <button className="download-btn" onClick={handleDownloadSummary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15M7 10L12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="results-content">
          <div className="summary-container">
            <div className="summary-content">
              {summaryData ? (
                <div>
                  <div className="summary-info">
                    <p><strong>Language:</strong> {Object.keys(languages).find(key => languages[key] === selectedLanguage)}</p>
                    <p><strong>Video Duration:</strong> {selectedVideo.duration}</p>
                    <p><strong>Channel:</strong> {selectedVideo.channel}</p>
                  </div>
                  <div className="summary-text">
                    <h4>Summary:</h4>
                    <p>{summaryData.summary}</p>
                  </div>
                  {summaryData.key_points && (
                    <div className="key-points">
                      <h4>Key Points:</h4>
                      <ul>
                        {summaryData.key_points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p>Loading summary...</p>
              )}
            </div>
            
            <div className="summary-actions">
              <button className="change-video-btn" onClick={handleChangeVideo}>
                Change Video
              </button>
              <button 
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                onClick={handleSaveSummary}
                disabled={isSaving || isSaved}
              >
                {isSaving ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save Summary'}
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
          {videos.map((video) => (
            <div key={video.id} className="video-card" onClick={() => handleVideoClick(video)}>
              <div className="video-thumbnail">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="thumbnail-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="thumbnail-icon" style={{ display: 'box' }}>🎥</div>
                <div className="video-duration">{video.duration}</div>
                {video.relevanceScore && (
                  <div className="relevance-score">
                    {Math.round(video.relevanceScore * 100)}% match
                  </div>
                )}
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