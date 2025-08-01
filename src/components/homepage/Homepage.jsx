import React, { useState, useEffect, useRef } from 'react';
import SearchResults from '../search/SearchResults';
import StudyPlanner from '../studyplanner/StudyPlanner'; 
import DiagramExplainer from '../diagramexplainer/DiagramExplainer';
import Login from '../Login/Login';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import { useAuth } from '../../context/AuthContext';
import './Homepage.css';
import { useNavigate } from 'react-router-dom';
import Quiz from '../quiz/Quiz';

const Homepage = () => {
  const recognitionRef = useRef(null);
  
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showStudyPlanner, setShowStudyPlanner] = useState(false);
  const [showDiagramExplainer, setShowDiagramExplainer] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showLoginTag, setShowLoginTag] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  
  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Get auth info from context
  const { currentUser, logout, isAuthenticated } = useAuth();
  
  const navigate = useNavigate();

  // Check if tutorial should be shown on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tutorialCompleted');
    if (!hasSeenTutorial && !tutorialCompleted) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tutorialCompleted]);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    // Update recognition language when selectedLanguage changes
    if (recognitionRef.current && !isListening) {
      const speechLanguageCodes = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'ta': 'ta-IN', 
        'te': 'te-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'bn': 'bn-IN',
        'gu': 'gu-IN',
        'mr': 'mr-IN',
        'pa': 'pa-IN',
        'ur': 'ur-PK',
        'or': 'or-IN',
        'as': 'as-IN'
      };
      
      const selectedLang = selectedLanguage || 'en';
      const newLang = speechLanguageCodes[selectedLang] || 'en-US';
      
      if (recognitionRef.current.lang !== newLang) {
        recognitionRef.current.lang = newLang;
        console.log(`Speech recognition language updated to: ${newLang}`);
      }
    }
  }, [selectedLanguage, isListening]);

  // Initialize and load available languages
  useEffect(() => {
    loadAvailableLanguages();
  }, []);

  const loadAvailableLanguages = async () => {
    try {
      const response = await fetch('https://your-app-136108111450.us-central1.run.app/api/supported-languages');
      const data = await response.json();
      setAvailableLanguages(data.languages || ['English',
        'Hindi',
        'Tamil',
        'Telugu',
        'Kannada',
        'Malayalam',
        'Bengali',
        'Gujarati',
        'Marathi',
        'Punjabi',
        'Urdu',
        'Odia',
        'Assamese']);
      setSelectedLanguage(data.default || 'English');
    } catch (error) {
      console.error('Error loading supported languages:', error);
      // Fallback to default languages
      setAvailableLanguages(['English', 'Hindi',
        'Tamil',
        'Telugu',
        'Kannada',
        'Malayalam',
        'Bengali',
        'Gujarati',
        'Marathi',
        'Punjabi',
        'Urdu',
        'Odia',
        'Assamese']);
    }
  };

  // Tutorial handlers
  const handleTutorialComplete = () => {
    setTutorialCompleted(true);
    localStorage.setItem('tutorialCompleted', 'true');
    setShowTutorial(false);
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  const restartTutorial = () => {
    setShowTutorial(true);
  };

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const handleScanText = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Camera access denied or not available');
      setShowCamera(false);
    }
  };

  const captureImage = async () => {
    if (!cameraStream) return;
    
    setIsProcessing(true);
    
    try {
      const video = document.getElementById('cameraVideo');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      const response = await fetch('https://youtube-analyzer-136108111450.us-central1.run.app/api/camera-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSearchText(data.text || '');
        closeCamera();
        if (data.text) {
          alert(`Text extracted successfully! ${data.confidence ? `Confidence: ${(data.confidence * 100).toFixed(1)}%` : ''}`);
        } else {
          alert(data.message || 'No text found in the image');
        }
      } else {
        throw new Error(data.error || 'Failed to process image');
      }
    } catch (error) {
      console.error('Error processing captured image:', error);
      alert('Failed to extract text from image: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchText.trim()) {
      setCurrentQuery(searchText.trim());
      setShowSearchResults(true);
    }
  };

  const handleBackToHome = () => {
    setShowSearchResults(false);
    setShowStudyPlanner(false); 
    setShowDiagramExplainer(false);
    setCurrentQuery('');
    setSearchText('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    fetch('https://youtube-analyzer-136108111450.us-central1.run.app/api/upload-image', {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      if (data.text) {
        setSearchText(data.text);
        alert(`Text extracted successfully from ${data.filename}! ${data.confidence ? `Confidence: ${(data.confidence * 100).toFixed(1)}%` : ''}`);
      } else {
        alert(data.message || 'No text found in the image');
      }
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      alert('Failed to process uploaded image: ' + error.message);
    })
    .finally(() => {
      setIsProcessing(false);
      event.target.value = '';
    });
  };

  const handleQuizzes = () => {
    if (!isAuthenticated) {
      handleLoginRequired();
      return;
    }
    navigate('/quiz');
  };

  const handleSignIn = () => {
    setShowLogin(true);
  };

  const handleSignUp = () => {
    setShowLogin(true);
  };

  const handleBackFromLogin = () => {
    setShowLogin(false);
  };

  const handleStudyPlanner = () => {
    setShowStudyPlanner(true);
    setIsNavOpen(false);
  };

  const handleBackFromStudyPlanner = () => {
    setShowStudyPlanner(false);
  };

  const handleDiagramExplainer = () => {
    setShowDiagramExplainer(true);
  };

  const handleBackFromDiagramExplainer = () => {
    setShowDiagramExplainer(false);
  };

  const handleSearchYouTube = (searchQuery) => {
    setCurrentQuery(searchQuery);
    setShowSearchResults(true);
    setShowDiagramExplainer(false); 
  };

  const handleLoginRequired = () => {
    if (isAuthenticated) return; // Don't show if already logged in
    
    const signupBtn = document.querySelector('.signup');
    const signinBtn = document.querySelector('.signin');
    if (signupBtn) {
      signupBtn.style.animation = 'pulse 0.5s ease-in-out 3';
    }
    if (signinBtn) {
      signinBtn.style.animation = 'pulse 0.5s ease-in-out 3';
    }
    
    setShowLoginTag(true);
    
    setTimeout(() => {
      setShowLoginTag(false);
      if (signupBtn) {
        signupBtn.style.animation = '';
      }
      if (signinBtn) {
        signinBtn.style.animation = '';
      }
    }, 3000);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      alert('Signed out successfully!');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

  const handleSpeechInput = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      
      // More specific language codes for better native script support
      const speechLanguageCodes = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'bn': 'bn-BD', // Try Bangladesh variant
        'gu': 'gu-IN',
        'mr': 'mr-IN',
        'pa': 'pa-IN',
        'ur': 'ur-PK',
        'or': 'or-IN',
        'as': 'as-IN'
      };

      const selectedLang = selectedLanguage || 'en';
      recognition.lang = speechLanguageCodes[selectedLang] || 'en-US';
      
      // Browser-specific optimizations
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      
      if (isChrome) {
        // Chrome-specific settings
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 5;
      } else if (isFirefox) {
        // Firefox has limited support
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
      }
      
      console.log(`Browser: ${navigator.userAgent}`);
      console.log(`Setting speech language to: ${recognition.lang}`);
      
      recognition.onstart = () => {
        setIsListening(true);
        // Show language-specific instruction
        const instructions = {
          'hi': 'हिंदी में बोलें',
          'ta': 'தமிழில் பேசுங்கள்',
          'te': 'తెలుగులో మాట్లాడండి',
          'kn': 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ',
          'ml': 'മലയാളത്തിൽ സംസാരിക്കുക',
          'bn': 'বাংলায় বলুন',
          'gu': 'ગુજરાતીમાં બોલો',
          'mr': 'मराठीत बोला',
          'pa': 'ਪੰਜਾਬੀ ਵਿੱਚ ਬੋਲੋ',
          'ur': 'اردو میں بولیں',
          'or': 'ଓଡ଼ିଆରେ କୁହନ୍ତୁ',
          'as': 'অসমীয়াত কওক'
        };
        
        console.log(instructions[selectedLang] || 'Speak now');
      };
      
      recognition.onresult = (event) => {
        const results = event.results[0];
        console.log('All recognition results:');
        
        // Log all alternatives
        for (let i = 0; i < results.length; i++) {
          console.log(`Alternative ${i}: "${results[i].transcript}" (confidence: ${results[i].confidence})`);
        }
        
        // Use the first result (usually the best)
        const transcript = results[0].transcript;
        console.log('Selected transcript:', transcript);
        
        setSearchText(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'language-not-supported') {
          alert(`Your browser doesn't support speech recognition for ${selectedLang}. Try:\n• Using Google Chrome\n• Switching to English\n• Using a different device`);
        } else {
          alert('Speech recognition error: ' + event.error);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('Speech recognition initialization error:', error);
      alert('Speech recognition failed to initialize');
      setIsListening(false);
    }
  };

  if (showStudyPlanner) {
    return <StudyPlanner onBack={handleBackFromStudyPlanner} />;
  }

  if (showDiagramExplainer) {
    return (
      <DiagramExplainer 
        onBack={handleBackFromDiagramExplainer}
        onSearchYouTube={handleSearchYouTube}
      />
    );
  }
  
  if (showSearchResults) {
    return (
      <SearchResults 
        searchQuery={currentQuery}
        onBack={handleBackToHome}
      />
    );
  }

  if (showLogin) {
    return (
      <Login onBack={handleBackFromLogin} />
    );
  }

  return (
    <div className="homepage">
      {/* Tutorial Overlay */}
      <TutorialOverlay 
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
        selectedLanguage={selectedLanguage}
      />

      {/* Sidebar */}
      <div className={`sidebar ${isNavOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <div className="nav-item" onClick={handleQuizzes}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V11H13V7H7V19H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Quizzes</span>
            </div>
            
            <div className="nav-item" onClick={() => {
              if (!isAuthenticated) { 
                handleLoginRequired();
                return;
              }
              navigate('/previous-summaries');
            }}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H14M20 12H10M20 12L16 8M20 12L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Previous Summaries</span>
             </div>
            
            <div className="nav-item" onClick={() => {
              if (!isAuthenticated) { 
                handleLoginRequired();
                return;
              }
              navigate('/my-study-plans');
            }}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4H21V6H3V4ZM3 10H21V12H3V10ZM3 16H15V18H3V16Z" fill="currentColor" />
                </svg>
              </div>
              <span>My Study Plans</span>
            </div>

            {/* Add Tutorial restart option */}
            <div className="nav-item" onClick={restartTutorial}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span>Show Tutorial</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Login Tag pointing to signup */}
      {showLoginTag && !isAuthenticated && (
        <div className="login-tag">
          <p>Login to use that feature! It's free!</p>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button className="menu-btn" onClick={toggleNav}>
              <span></span>
              <span></span>
              <span></span>
            </button>
            <button className="home-btn" onClick={isAuthenticated ? handleBackToHome : handleLoginRequired}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="header-center">
            <h1 className="app-title">TextToTube</h1>
            {/* Help/Tutorial Button */}
            <button 
              className="tutorial-help-btn" 
              onClick={restartTutorial}
              title="Show Tutorial"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                marginLeft: '15px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                fontSize: '20px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'rgba(255, 255, 255, 1)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="header-right">
            {isAuthenticated ? (
              // Show user info and sign out when logged in
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  <span style={{ fontWeight: '500' }}>
                    {currentUser?.displayName || 'User'}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'rgba(255, 255, 255, 0.6)' 
                  }}>
                    {currentUser?.email}
                  </span>
                </div>
                <button className="auth-btn signin" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            ) : (
              // Show login buttons when not logged in
              <>
                <button className="auth-btn signin" onClick={handleSignIn}>Sign In</button>
              </>
            )}
          </div>
        </header>

        {/* Main Section */}
        <main className="main-section">
          <div className="welcome-container">
            <div className="welcome-text">
              <h1>
                {isAuthenticated 
                  ? `Welcome back, ${currentUser?.displayName || 'there'}! What are you looking for today?`
                  : 'Hello! What are you looking for today?'
                }
              </h1>
              <p>Transform your learning experience with AI-powered study tools</p>
            </div>

            <div className="search-container">
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Type your question or topic here..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="search-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  style={{
                    paddingRight: speechSupported ? '120px' : '60px' // Extra space for speech button
                  }}
                />
                <button type="button" className="search-btn" onClick={handleSearch}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              
              {/* Speech-to-Text Button */}
              {speechSupported && (
                <button
                  type="button"
                  className="speech-btn"
                  onClick={handleSpeechInput}
                  disabled={isListening}
                  style={{
                    position: 'absolute',
                    right: '85px',
                    top: '28%',
                    transform: 'translateY(-50%)',
                    background: isListening 
                      ? 'linear-gradient(45deg, #ff6b6b 0%, #ee5a24 100%)' 
                      : 'rgba(0, 212, 255, 0.2)',
                    border: isListening ? '2px solid #ff6b6b' : '2px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isListening ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                    boxShadow: isListening ? '0 0 20px rgba(255, 107, 107, 0.4)' : 'none'
                  }}
                  title={isListening ? 'Listening... Click to stop' : 'Click to speak your topic'}
                >
                  🎤
                </button>
              )}
                  
              {/* Speech Status Indicator */}
              {isListening && (
                <div style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 0, 0.9)',
                  padding: '30px',
                  borderRadius: '20px',
                  border: '2px solid #ff6b6b',
                  color: '#ffffff',
                  textAlign: 'center',
                  zIndex: 1000,
                  boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(45deg, #ff6b6b 0%, #ee5a24 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    animation: 'pulse 1s infinite'
                  }}>
                    🎤
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '600' }}>
                    🎤 Listening...
                  </h3>
                  <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.8 }}>
                    Speak your quiz topic now
                  </p>
                  <button
                    onClick={handleSpeechInput}
                    style={{
                      marginTop: '15px',
                      padding: '10px 20px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Stop Listening
                  </button>
                </div>
              )}
     
              <div className="action-buttons">
                <button type="button" className="action-btn scan-btn" onClick={handleScanText}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V5C1 4.46957 1.21071 3.96086 1.58579 3.58579C1.96086 3.21071 2.46957 3 3 3H21C21.5304 3 22.0391 3.21071 22.4142 3.58579C22.7893 3.96086 23 4.46957 23 5V19Z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Scan Text
                </button>
                
                <button type="button" className="action-btn upload-btn" onClick={() => document.getElementById('fileInput').click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload Files
                </button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="feature-cards">
              <div className="feature-card" onClick={handleStudyPlanner} style={{ cursor: 'pointer' }}>
                <div className="feature-icon">📚</div>
                <h3>Study Planner</h3>
                <p>Use the website's study planner to effectively plan your adventure</p>
              </div>
              <div className="feature-card" onClick={handleDiagramExplainer} style={{ cursor: 'pointer' }}>
                <div className="feature-icon">🔍</div>
                <h3>Explain Diagram/Image</h3>
                <p>Upload or capture images to get detailed explanations and study notes!</p>
              </div>
              <div className="feature-card" onClick={handleQuizzes} style={{ cursor: 'pointer' }}>
                <div className="feature-icon">🧠</div>
                <h3>Smart Quizzes</h3>
                <p>Generate personalized quizzes from your materials</p>
              </div>
            </div>

            {showCamera && (
              <div className="camera-overlay">
                <div className="camera-container">
                  <div className="camera-header">
                    <h3>Capture Text</h3>
                    <button className="close-camera-btn" onClick={closeCamera}>✕</button>
                  </div>
                  <video
                    id="cameraVideo"
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                        video.play();
                      }
                    }}
                    className="camera-video"
                    playsInline
                    muted
                  />
                  <div className="camera-controls">
                    <button 
                      className="capture-btn" 
                      onClick={captureImage}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Capture & Extract Text'}
                    </button>
                    <button className="cancel-btn" onClick={closeCamera}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <input
              type="file"
              id="fileInput"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Homepage;