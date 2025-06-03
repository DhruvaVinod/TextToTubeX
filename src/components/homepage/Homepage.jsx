import React, { useState, useEffect } from 'react';
import SearchResults from '../search/SearchResults';
import './Homepage.css';
import Login from '../Login/Login';

const Homepage = () => {
  const [isNavOpen, setIsNavOpen] = useState(false); // Closed by default now
  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showLoginTag, setShowLoginTag] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const handleScanText = () => {
    alert('Camera scan feature coming soon!');
  };

  // const handleUploadFile = () => {
  //   const input = document.createElement('input');
  //   input.type = 'file';
  //   input.accept = 'image/*,.pdf,.txt';
  //   input.onchange = (e) => {
  //     const file = e.target.files[0];
  //     if (file) {
  //       alert(`File "${file.name}" selected! Processing feature coming soon.`);
  //     }
  //   };
  //   input.click();
  // };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchText.trim()) {
      setCurrentQuery(searchText.trim());
      setShowSearchResults(true);
    }
  };

  const handleBackToHome = () => {
    setShowSearchResults(false);
    setCurrentQuery('');
    setSearchText('');
  };

  const handleQuizzes = () => {
    alert('someone do this please heh');
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

  const handleLoginRequired = () => {
    // Highlight signup button
    const signupBtn = document.querySelector('.signup');
    const signinBtn = document.querySelector('.signin');
    if (signupBtn) {
      signupBtn.style.animation = 'pulse 0.5s ease-in-out 3';
      
    }
    if (signinBtn) {
      signinBtn.style.animation = 'pulse 0.5s ease-in-out 3';
      
    }
    
    
    // Show login tag
    setShowLoginTag(true);
    
    // Hide tag and remove animation after 3 seconds
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
            
            <div className="nav-item" onClick={handleLoginRequired}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H14M20 12H10M20 12L16 8M20 12L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Previous Summaries</span>
            </div>
            
            <div className="nav-item" onClick={handleLoginRequired}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor"/>
                </svg>
              </div>
              <span>Leaderboards</span>
            </div>
            
            <div className="nav-item" onClick={handleLoginRequired}>
              <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V8.5C3 7.39543 3.89543 6.5 5 6.5H19C20.1046 6.5 21 7.39543 21 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Study Planner</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Login Tag pointing to signup */}
      {showLoginTag && (
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
            <button className="home-btn" onClick={handleLoginRequired}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="header-center">
            <h1 className="app-title">TextToTube</h1>
          </div>
          
          <div className="header-right">
            <button className="auth-btn signin" onClick={handleSignIn}>Sign In</button>
            <button className="auth-btn signup" onClick={handleSignUp}>Sign Up</button>
          </div>
        </header>

        {/* Main Section */}
        <main className="main-section">
          <div className="welcome-container">
            <div className="welcome-text">
              <h1>Hello! What are you looking for today?</h1>
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
                />
                <button type="button" className="search-btn" onClick={handleSearch}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              
              <div className="action-buttons">
                <button type="button" className="action-btn scan-btn" onClick={handleScanText}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V5C1 4.46957 1.21071 3.96086 1.58579 3.58579C1.96086 3.21071 2.46957 3 3 3H21C21.5304 3 22.0391 3.21071 22.4142 3.58579C22.7893 3.96086 23 4.46957 23 5V19Z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Scan Text
                </button>
                
                <button type="button" className="action-btn upload-btn" onClick={handleScanText}>
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
              <div className="feature-card">
                <div className="feature-icon">📚</div>
                <h3>Study Planner</h3>
                <p>Use the website's study planner to effectively plan your adventure</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎥</div>
                <h3>Video Summaries</h3>
                <p>Find relevant YouTube videos for your content and generate summaries</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>Smart Quizzes</h3>
                <p>Generate personalized quizzes from your materials</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Homepage;