import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Quiz.css';

const Quiz = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialTopic = location.state?.quizTopic || '';

  const [isCameraReady, setIsCameraReady] = useState(false); 
  const [currentStep, setCurrentStep] = useState('setup');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [topic, setTopic] = useState(initialTopic); // Initialize topic with the passed value
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [userPosition, setUserPosition] = useState({ old: null, new: null });
  const [leaderboard, setLeaderboard] = useState([]);

  
  // New states for document features
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [inputMode, setInputMode] = useState('topic'); // 'topic', 'document'

  // Badge thresholds
  const badges = {
    bronze: { threshold: 60, icon: '🥉', name: 'Bronze Scholar', points: 100 },
    silver: { threshold: 75, icon: '🥈', name: 'Silver Scholar', points: 250 },
    gold: { threshold: 85, icon: '🥇', name: 'Gold Scholar', points: 500 },
    platinum: { threshold: 95, icon: '💎', name: 'Platinum Scholar', points: 1000 }
  };

  // Student quiz data
  const studentQuizData = {
    'Alex Thompson': [95, 88, 92, 89, 94, 91, 87, 93],
    'Sarah Chen': [87, 91, 85, 89, 92, 88, 90, 86],
    'Michael Rodriguez': [82, 89, 85, 87, 84, 90, 88, 86],
    'Emma Johnson': [78, 85, 82, 80, 87, 83, 79, 84],
    'David Kim': [75, 82, 79, 83, 78, 81, 85, 80],
    'Lisa Wang': [72, 78, 75, 80, 77, 74, 82, 76],
    'James Wilson': [68, 75, 72, 74, 71, 76, 73, 70],
    'You': [65, 72, 68, 70, 74, 69, 71], // Current user's quiz history
    'Anna Martinez': [62, 68, 65, 67, 64, 70, 66, 63],
    'Robert Taylor': [58, 65, 62, 60, 67, 61, 64, 59]
  };

  // Helper functions
  const calculateAverageScore = (quizScores) => {
    if (!quizScores || quizScores.length === 0) return 0;
    const sum = quizScores.reduce((total, score) => total + score, 0);
    return Math.round((sum / quizScores.length) * 100) / 100;
  };

  const generateLeaderboard = () => {
    const leaderboardData = Object.entries(studentQuizData).map(([name, quizScores]) => ({
      name: name,
      score: calculateAverageScore(quizScores),
      quizCount: quizScores.length,
      isCurrentUser: name === 'You'
    }));

    return leaderboardData
      .sort((a, b) => b.score - a.score)
      .map((student, index) => ({
        ...student,
        rank: index + 1
      }));
  };

  // Initialize and load available languages
  useEffect(() => {
    loadAvailableLanguages();
  }, []);

  const loadAvailableLanguages = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/supported-languages');
      const data = await response.json();
      setAvailableLanguages(data.languages || ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Arabic', 'Chinese', 'Japanese', 'Korean']);
      setSelectedLanguage(data.default || 'English');
    } catch (error) {
      console.error('Error loading supported languages:', error);
      // Fallback to default languages
      setAvailableLanguages(['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Arabic', 'Chinese', 'Japanese', 'Korean']);
    }
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
  };

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
  };

  const handleScanText = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
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
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send to backend for OCR
      const response = await fetch('http://localhost:5000/api/camera-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDocumentContent(data.text || '');
        setInputMode('document');
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    fetch('http://localhost:5000/api/upload-image', {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      if (data.text) {
        setDocumentContent(data.text);
        setInputMode('document');
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
      // Clear the file input
      event.target.value = '';
    });
  };

  const handleStartQuiz = async () => {
    if (!selectedLevel) {
      alert('Please select a difficulty level');
      return;
    }

    if (inputMode === 'topic' && !topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    if (inputMode === 'document' && !documentContent.trim()) {
      alert('Please scan or upload a document first');
      return;
    }

    setIsLoading(true);
    
    try {
      const requestBody = {
        level: selectedLevel,
        language: selectedLanguage,
        num_questions: 5
      };

      if (inputMode === 'topic') {
        requestBody.topic = topic.trim();
      } else {
        requestBody.document_content = documentContent.trim();
      }

      const response = await fetch('http://localhost:5000/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setCurrentStep('quiz');
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Failed to start quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (optionIndex) => {
    if (showAnswer) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));
  };

  const handleNextQuestion = () => {
    if (!showAnswer) {
      setShowAnswer(true);
      const isCorrect = selectedAnswers[currentQuestionIndex] === questions[currentQuestionIndex].correct;
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
    } else {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        finishQuiz();
      }
    }
  };

  const finishQuiz = async () => {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    
    // Calculate badge earned
    let badgeEarned = null;
    if (percentage >= badges.platinum.threshold) badgeEarned = { ...badges.platinum, key: 'platinum' };
    else if (percentage >= badges.gold.threshold) badgeEarned = { ...badges.gold, key: 'gold' };
    else if (percentage >= badges.silver.threshold) badgeEarned = { ...badges.silver, key: 'silver' };
    else if (percentage >= badges.bronze.threshold) badgeEarned = { ...badges.bronze, key: 'bronze' };

    // Calculate next badge requirements
    let nextBadge = null;
    if (percentage < badges.bronze.threshold) nextBadge = { ...badges.bronze, key: 'bronze' };
    else if (percentage < badges.silver.threshold) nextBadge = { ...badges.silver, key: 'silver' };
    else if (percentage < badges.gold.threshold) nextBadge = { ...badges.gold, key: 'gold' };
    else if (percentage < badges.platinum.threshold) nextBadge = { ...badges.platinum, key: 'platinum' };

    // Get current leaderboard position before adding new quiz
    const currentLeaderboard = generateLeaderboard();
    const currentUserData = currentLeaderboard.find(student => student.isCurrentUser);
    const oldPosition = currentUserData.rank;
    const oldAverageScore = currentUserData.score;
    
    // Add the new quiz score to the user's quiz history
    studentQuizData['You'].push(percentage);
    
    // Generate updated leaderboard with new quiz included
    const updatedLeaderboard = generateLeaderboard();
    const updatedUserData = updatedLeaderboard.find(student => student.isCurrentUser);
    const newPosition = updatedUserData.rank;
    const newAverageScore = updatedUserData.score;
    
    // Calculate performance metrics
    const scoreImprovement = Math.round((newAverageScore - oldAverageScore) * 100) / 100;
    const positionChange = oldPosition - newPosition; // Positive means moved up

    setQuizResults({
      score: finalScore,
      totalQuestions: questions.length,
      percentage,
      badgeEarned,
      nextBadge,
      incorrectAnswers: questions.length - finalScore,
      averageScore: newAverageScore,
      totalQuizzesTaken: studentQuizData['You'].length,
      scoreImprovement: scoreImprovement,
      positionChange: positionChange
    });

    setUserPosition({ 
      old: oldPosition, 
      new: newPosition,
      change: positionChange,
      averageScore: newAverageScore,
      previousAverage: oldAverageScore,
      improvement: scoreImprovement
    });
    
    setLeaderboard(updatedLeaderboard);
    setCurrentStep('results');
  };

  const handleRetryQuiz = () => {
    setCurrentStep('setup');
    setSelectedLevel('');
    setTopic('');
    setDocumentContent('');
    setInputMode('topic');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowAnswer(false);
    setScore(0);
    setQuizResults(null);
    setUserPosition({ old: null, new: null });
    setLeaderboard([]);
  };

  const handleInputModeSwitch = (mode) => {
    setInputMode(mode);
    setTopic('');
    setDocumentContent('');
  };

const renderSetup = () => (
  <div className="quiz-fullscreen">
    {/* Header matching Homepage exactly - no sidebar */}
    <header className="header">
      <div className="header-left">
        <button className="home-btn" onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div className="header-center">
        <h1 className="app-title">Smart Quiz Challenge</h1>
      </div>
      
      <div className="header-right">
        <button className="auth-btn signin">🧠 Quiz</button>
      </div>
    </header>

    {/* Main Content */}
    <div className="main-content">
      <main className="main-section">
        <div className="welcome-container">
          {/* Welcome Section */}
          <div className="welcome-text">
            <h1>Test your knowledge and climb the leaderboard!</h1>
            <p>Choose your difficulty, topic, and challenge yourself with AI-powered questions</p>
          </div>

          {/* Loading state with motivational tip */}
          {isLoading && (
            <div className="feature-card" style={{
              padding: '40px',
              marginBottom: '40px',
              textAlign: 'center',
              border: '2px solid #f59e0b'
            }}>
              <div className="loading-spinner" style={{ 
                marginBottom: '24px',
                width: '40px',
                height: '40px',
                border: '4px solid rgba(0, 212, 255, 0.2)',
                borderTop: '4px solid #00d4ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
              <h3 style={{ 
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#00d4ff'
              }}>
                Generating Your Quiz...
              </h3>
              <div style={{
                padding: '20px',
                background: 'rgba(0, 212, 255, 0.1)',
                borderRadius: '15px',
                border: '1px solid rgba(0, 212, 255, 0.3)'
              }}>
                <p style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#00d4ff',
                  margin: '0 0 8px 0'
                }}>
                  💡 Pro Tip
                </p>
                <p style={{
                  fontSize: '1rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: '0',
                  lineHeight: '1.5'
                }}>
                  Take your time to read each question carefully. The best learners think through their answers before selecting!
                </p>
              </div>
            </div>
          )}

          {/* Quiz Setup Cards */}
          {!isLoading && (
            <div className="feature-cards">
              {/* Difficulty Level Card */}
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Choose Difficulty Level</h3>
                <div className="level-buttons" style={{ 
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  marginTop: '20px'
                }}>
                  {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                    <button
                      key={level}
                      className={`action-btn ${selectedLevel === level ? 'selected' : ''}`}
                      onClick={() => handleLevelSelect(level)}
                      style={{ 
                        padding: '12px 20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        borderRadius: '15px',
                        border: selectedLevel === level ? '2px solid #00d4ff' : '1px solid rgba(0, 212, 255, 0.3)',
                        background: selectedLevel === level 
                          ? 'linear-gradient(45deg, #00d4ff 0%, #0984e3 100%)' 
                          : 'rgba(0, 0, 0, 0.4)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: selectedLevel === level ? '0 0 20px rgba(0, 212, 255, 0.4)' : 'none'
                      }}
                    >
                      <span>
                        {level === 'Beginner' ? '🌱' : level === 'Intermediate' ? '🌿' : '🌳'}
                      </span>
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection Card */}
              <div className="feature-card">
                <div className="feature-icon">🌍</div>
                <h3>Choose Language</h3>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageSelect(e.target.value)}
                  className="search-input"
                  style={{ 
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    borderRadius: '15px',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff'
                  }}
                >
                  {availableLanguages.map(language => (
                    <option key={language} value={language} style={{ background: '#0f3460', color: '#ffffff' }}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Method Card */}
              <div className="feature-card">
                <div className="feature-icon">📝</div>
                <h3>Choose Input Method</h3>
                <div className="action-buttons" style={{ marginTop: '20px' }}>
                  <button
                    className={`action-btn ${inputMode === 'topic' ? 'selected' : ''}`}
                    onClick={() => handleInputModeSwitch('topic')}
                    style={{ 
                      padding: '12px 20px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '15px',
                      border: inputMode === 'topic' ? '2px solid #00d4ff' : '1px solid rgba(0, 212, 255, 0.3)',
                      background: inputMode === 'topic' 
                        ? 'linear-gradient(45deg, #00d4ff 0%, #0984e3 100%)' 
                        : 'rgba(0, 0, 0, 0.4)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: inputMode === 'topic' ? '0 0 20px rgba(0, 212, 255, 0.4)' : 'none'
                    }}
                  >
                    💭 Topic Based
                  </button>
                  <button
                    className={`action-btn ${inputMode === 'document' ? 'selected' : ''}`}
                    onClick={() => handleInputModeSwitch('document')}
                    style={{ 
                      padding: '12px 20px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '15px',
                      border: inputMode === 'document' ? '2px solid #00d4ff' : '1px solid rgba(0, 212, 255, 0.3)',
                      background: inputMode === 'document' 
                        ? 'linear-gradient(45deg, #00d4ff 0%, #0984e3 100%)' 
                        : 'rgba(0, 0, 0, 0.4)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: inputMode === 'document' ? '0 0 20px rgba(0, 212, 255, 0.4)' : 'none'
                    }}
                  >
                    📄 Document Based
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Section */}
          {!isLoading && (
            <div className="search-container">
              {inputMode === 'topic' ? (
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Enter a topic for your quiz..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStartQuiz()}
                    className="search-input"
                  />
                  <button 
                    type="button" 
                    className="search-btn" 
                    onClick={handleStartQuiz}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="action-buttons">
                    <button
                      onClick={handleScanText} 
                      disabled={isProcessing}
                      className="action-btn scan-btn"
                      style={{
                        opacity: isProcessing ? 0.6 : 1,
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V5C1 4.46957 1.21071 3.96086 1.58579 3.58579C1.96086 3.21071 2.46957 3 3 3H21C21.5304 3 22.0391 3.21071 22.4142 3.58579C22.7893 3.96086 23 4.46957 23 5V19Z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {isProcessing ? 'Processing...' : 'Scan Document'}
                    </button>
                    
                    <button
                      onClick={() => document.getElementById('quizFileInput').click()}
                      disabled={isProcessing}
                      className="action-btn upload-btn"
                      style={{
                        opacity: isProcessing ? 0.6 : 1,
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Upload Document
                    </button>
                  </div>
                  
                  {documentContent && (
                    <div style={{
                      padding: '20px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '15px',
                      border: '1px solid rgba(0, 212, 255, 0.3)'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '12px', color: '#00d4ff' }}>
                        Document Content Preview:
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        lineHeight: '1.5',
                        marginBottom: '15px'
                      }}>
                        {documentContent.substring(0, 300)}
                        {documentContent.length > 300 && '...'}
                      </div>
                      <button
                        onClick={() => {
                          setDocumentContent('');
                          setInputMode('topic');
                        }}
                        className="action-btn"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.9rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: '#ffffff'
                        }}
                      >
                        Clear & Switch to Topic
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
     
          {/* Start Quiz Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
            <button
              onClick={handleStartQuiz}
              disabled={isLoading || (!topic.trim() && !documentContent)}
              className="action-btn"
              style={{
                padding: '16px 32px',
                fontSize: '1.2rem',
                fontWeight: '700',
                borderRadius: '25px',
                border: 'none',
                background: isLoading || (!topic.trim() && !documentContent) 
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(45deg, #00d4ff 0%, #39ff14 100%)',
                color: isLoading || (!topic.trim() && !documentContent) ? 'rgba(255, 255, 255, 0.5)' : '#0c0c0c',
                cursor: isLoading || (!topic.trim() && !documentContent) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isLoading || (!topic.trim() && !documentContent) 
                  ? 'none' 
                  : '0 4px 15px rgba(0, 212, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '200px',
                justifyContent: 'center'
              }}
            >
              {isLoading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
              {isLoading ? 'Generating Quiz...' : 'Start Quiz 🚀'}
            </button>
          </div>

          {/* Camera Modal */}
          {showCamera && (
            <div className="camera-overlay">
              <div className="camera-container">
                <div className="camera-header">
                  <h3>Capture Document</h3>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="close-camera-btn"
                  >
                    ✕
                  </button>
                </div>
                
                <video
                id="cameraVideo"
        ref={(videoElement) => { // Renamed 'video' to 'videoElement' for clarity
          if (videoElement && cameraStream) { //
            videoElement.srcObject = cameraStream; //
            videoElement.onloadedmetadata = () => { // Add this event listener
              videoElement.play(); //
              setIsCameraReady(true); // Set camera ready after metadata loads
            };
          }
        }}
        className="camera-video"
        playsInline
        muted
      />
                
                <div className="camera-controls">
                  <button
                    onClick={captureImage}
                    disabled={isProcessing}
                    className="capture-btn"
                  >
                    {isProcessing ? 'Processing...' : 'Capture & Extract Text'}
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input for upload */}
          <input
            id="quizFileInput"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </main>
    </div>

    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .selected {
        transform: translateY(-2px);
      }
      
      .action-btn:hover:not(:disabled) {
        transform: translateY(-3px);
      }
      
      .search-btn:hover {
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.6);
      }
    `}</style>
  </div>
);

//   const renderQuestion = () => {
//   const question = questions[currentQuestionIndex];
//   const userAnswer = selectedAnswers[currentQuestionIndex];
  
//   return (
//     <div className="homepage">
//       {/* Header matching Homepage */}
//       <header className="header">
//         <div className="header-left">
//           <button className="home-btn" onClick={() => navigate('/')}>
//             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//               <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//             </svg>
//           </button>
//         </div>
        
//         <div className="header-center">
//           {/* Empty - title moved below */}
//         </div>
        
//         <div className="header-right">
//           <span className="auth-btn signin quiz-counter">
//             {currentQuestionIndex + 1}/{questions.length}
//           </span>
//         </div>
//       </header>

//       <div className="main-content">
//         <main className="main-section">
//           <div className="welcome-container">
//             {/* Title moved to top of page */}
//             <div className="quiz-title-card">
//               <h1 className="quiz-main-title">
//                 Quiz in Progress
//               </h1>
//             </div>

//             {/* Question Header with improved spacing and better text colors */}
//             <div className="welcome-text quiz-header">
//               <h1 className="quiz-question-title">
//                 Question {currentQuestionIndex + 1} of {questions.length}
//               </h1>
//               <div className="quiz-badges">
//                 <span className="auth-btn signin quiz-level-badge">
//                   {selectedLevel}
//                 </span>
//                 <span className="auth-btn signup quiz-language-badge">
//                   {selectedLanguage}
//                 </span>
//               </div>
//             </div>

//             {/* Progress bar */}
//             <div className="quiz-progress-container">
//               <div 
//                 className="quiz-progress-bar"
//                 style={{ 
//                   width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
//                 }}
//               ></div>
//             </div>

//             {/* Question Card */}
//             <div className="feature-card quiz-question-card">
//               <h2 className="quiz-question-text">
//                 {question.question}
//               </h2>

//               {/* Options Container */}
//               <div className="quiz-options-container">
//                 {question.options.map((option, index) => (
//                   <button
//                     key={index}
//                     className={`action-btn quiz-option ${
//                       userAnswer === index ? 'selected' : ''
//                     } ${
//                       showAnswer && index === question.correct ? 'correct' : ''
//                     } ${
//                       showAnswer && userAnswer === index && index !== question.correct ? 'incorrect' : ''
//                     }`}
//                     onClick={() => handleOptionSelect(index)}
//                     disabled={showAnswer}
//                   >
//                     <span className="quiz-option-letter">
//                       {String.fromCharCode(65 + index)}.
//                     </span>
//                     {option}
//                   </button>
//                 ))}
//               </div>

//               {/* Submit/Next Button */}
//               <div className="quiz-button-container">
//                 <button
//                   className="search-btn quiz-submit-btn"
//                   onClick={handleNextQuestion}
//                   disabled={userAnswer === undefined}
//                 >
//                   <span className="quiz-button-text">
//                     {!showAnswer ? 'Submit Answer' : (
//                       currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz 🏁'
//                     )}
//                   </span>
//                 </button>
//               </div>

//               {/* Explanation section */}
//               {showAnswer && question.explanation && (
//                 <div className="quiz-explanation">
//                   <div className="quiz-explanation-header">
//                     <span className="quiz-explanation-icon">💡</span>
//                     <strong className="quiz-explanation-title">Explanation</strong>
//                   </div>
//                   <p className="quiz-explanation-text">{question.explanation}</p>
//                 </div>
//               )}
//             </div>

//             {/* Additional spacing */}
//             <div className="quiz-spacer"></div>
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };
  const renderQuestion = () => {
  const question = questions[currentQuestionIndex];
  const userAnswer = selectedAnswers[currentQuestionIndex];
  
  return (
    <div className="quiz-fullscreen">
      {/* Header matching Homepage exactly */}
      <header className="header">
        <div className="header-left">
          <button className="home-btn" onClick={() => navigate('/')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="header-center">
          <h1 className="app-title">Smart Quiz Challenge</h1>
        </div>
        
        <div className="header-right">
          <span className="auth-btn signin">
            {currentQuestionIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      <div className="main-content">
        <main className="main-section">
          <div className="welcome-container">
            {/* Progress Section */}
            <div className="welcome-text">
              <h1>Question {currentQuestionIndex + 1} of {questions.length}</h1>
              <p>Take your time and choose the best answer</p>
            </div>

            {/* Progress bar with setup styling */}
            <div className="feature-card" style={{
              padding: '20px',
              marginBottom: '30px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span className="auth-btn signin" style={{
                    padding: '8px 16px',
                    fontSize: '0.9rem'
                  }}>
                    {selectedLevel}
                  </span>
                  <span className="auth-btn signup" style={{
                    padding: '8px 16px',
                    fontSize: '0.9rem'
                  }}>
                    {selectedLanguage}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '1rem',
                  color: '#00d4ff',
                  fontWeight: '600'
                }}>
                  Progress: {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </div>
              </div>
              
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(0, 212, 255, 0.3)'
              }}>
                <div style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(45deg, #00d4ff 0%, #39ff14 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                }}></div>
              </div>
            </div>

            {/* Question Card with setup styling */}
            <div className="feature-card" style={{
              marginBottom: '30px'
            }}>
              <div className="feature-icon">❓</div>
              <h3 style={{ 
                fontSize: '1.4rem',
                lineHeight: '1.6',
                marginBottom: '30px',
                color: '#ffffff'
              }}>
                {question.question}
              </h3>

              {/* Options with setup button styling */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}>
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    className={`action-btn ${userAnswer === index ? 'selected' : ''} ${
                      showAnswer && index === question.correct ? 'correct-answer' : ''
                    } ${
                      showAnswer && userAnswer === index && index !== question.correct ? 'incorrect-answer' : ''
                    }`}
                    onClick={() => handleOptionSelect(index)}
                    disabled={showAnswer}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      padding: '16px 20px',
                      fontSize: '1rem',
                      fontWeight: '500',
                      borderRadius: '15px',
                      border: userAnswer === index ? '2px solid #00d4ff' : '1px solid rgba(0, 212, 255, 0.3)',
                      background: showAnswer && index === question.correct 
                        ? 'linear-gradient(45deg, #39ff14 0%, #00d4ff 100%)'
                        : showAnswer && userAnswer === index && index !== question.correct
                        ? 'linear-gradient(45deg, #ff4757 0%, #ff3838 100%)'
                        : userAnswer === index 
                        ? 'linear-gradient(45deg, #00d4ff 0%, #0984e3 100%)' 
                        : 'rgba(0, 0, 0, 0.4)',
                      color: showAnswer && index === question.correct ? '#0c0c0c'
                        : showAnswer && userAnswer === index && index !== question.correct ? '#ffffff'
                        : '#ffffff',
                      cursor: showAnswer ? 'default' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: userAnswer === index ? '0 0 20px rgba(0, 212, 255, 0.4)' : 'none',
                      textAlign: 'left',
                      opacity: showAnswer && index !== question.correct && userAnswer !== index ? 0.6 : 1
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span style={{ flex: 1 }}>{option}</span>
                    {showAnswer && index === question.correct && (
                      <span style={{ fontSize: '1.2rem' }}>✅</span>
                    )}
                    {showAnswer && userAnswer === index && index !== question.correct && (
                      <span style={{ fontSize: '1.2rem' }}>❌</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Submit/Next Button with setup styling */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginTop: '30px' 
              }}>
                <button
                  onClick={handleNextQuestion}
                  disabled={userAnswer === undefined}
                  className="action-btn"
                  style={{
                    padding: '16px 32px',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    borderRadius: '25px',
                    border: 'none',
                    background: userAnswer === undefined 
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'linear-gradient(45deg, #00d4ff 0%, #39ff14 100%)',
                    color: userAnswer === undefined ? 'rgba(255, 255, 255, 0.5)' : '#0c0c0c',
                    cursor: userAnswer === undefined ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: userAnswer === undefined 
                      ? 'none' 
                      : '0 4px 15px rgba(0, 212, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    minWidth: '180px',
                    justifyContent: 'center'
                  }}
                >
                  {!showAnswer ? 'Submit Answer' : (
                    currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz 🏁'
                  )}
                </button>
              </div>

              {/* Explanation section with setup styling */}
              {showAnswer && question.explanation && (
                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  borderRadius: '15px',
                  border: '1px solid rgba(0, 212, 255, 0.3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>💡</span>
                    <h4 style={{
                      margin: '0',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      color: '#00d4ff'
                    }}>
                      Explanation
                    </h4>
                  </div>
                  <p style={{
                    margin: '0',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    {question.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .correct-answer {
          animation: correctPulse 0.6s ease-in-out;
        }
        
        .incorrect-answer {
          animation: incorrectShake 0.6s ease-in-out;
        }
        
        @keyframes correctPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        @keyframes incorrectShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4) !important;
        }
      `}</style>
    </div>
  );
};
  // const renderResults = () => {
  //   const LeaderboardDisplay = ({ userPosition, leaderboard, quizResults }) => {
  //     const getRankEmoji = (rank) => {
  //       switch(rank) {
  //         case 1: return '🥇';
  //         case 2: return '🥈'; 
  //         case 3: return '🥉';
  //         default: return `#${rank}`;
  //       }
  //     };

  //     const getPositionChangeMessage = () => {
  //       if (!userPosition.change) return null;
        
  //       if (userPosition.change > 0) {
  //         return {
  //           type: 'improvement',
  //           message: `Moved up ${userPosition.change} position${userPosition.change > 1 ? 's' : ''}!`,
  //           icon: '⬆️'
  //         };
  //       } else if (userPosition.change < 0) {
  //         return {
  //           type: 'decline', 
  //           message: `Dropped ${Math.abs(userPosition.change)} position${Math.abs(userPosition.change) > 1 ? 's' : ''}`,
  //           icon: '⬇️'
  //         };
  //       }
  //       return {
  //         type: 'same',
  //         message: 'Position maintained',
  //         icon: '➡️'
  //       };
  //     };

  //     const positionInfo = getPositionChangeMessage();

  //     return (
  //       <div className="leaderboard-section" style={{ marginTop: '2rem' }}>
  //         {/* Rank Change with Homepage Styling */}
  //         {userPosition.old && userPosition.new && (
  //           <div className="rank-change-card" style={{ 
  //             marginBottom: '2rem', 
  //             padding: '1.5rem',
  //             backgroundColor: '#f8fafc',
  //             borderRadius: '12px',
  //             border: '1px solid #e2e8f0'
  //           }}>
  //             <div className="card-header" style={{ marginBottom: '1.5rem' }}>
  //               <h4 style={{ margin: '0', fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
  //                 📊 Leaderboard Update
  //               </h4>
  //             </div>
              
  //             <div className="rank-comparison-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
  //               <div className="rank-comparison" style={{ 
  //                 display: 'flex', 
  //                 alignItems: 'center', 
  //                 justifyContent: 'space-between',
  //                 gap: '1rem',
  //                 padding: '1rem',
  //                 backgroundColor: 'white',
  //                 borderRadius: '8px',
  //                 border: '1px solid #e2e8f0'
  //               }}>
  //                 <div className="rank-item previous-rank" style={{ 
  //                   textAlign: 'center',
  //                   flex: '1',
  //                   padding: '0.75rem'
  //                 }}>
  //                   <span className="rank-label" style={{ 
  //                     display: 'block', 
  //                     fontSize: '0.875rem', 
  //                     color: '#64748b',
  //                     marginBottom: '0.5rem'
  //                   }}>
  //                     Previous
  //                   </span>
  //                   <span className="rank-number" style={{ 
  //                     display: 'block', 
  //                     fontSize: '1.5rem',
  //                     marginBottom: '0.25rem'
  //                   }}>
  //                     {getRankEmoji(userPosition.old)}
  //                   </span>
  //                   <span className="rank-score" style={{ 
  //                     fontSize: '0.875rem', 
  //                     color: '#6b7280',
  //                     display: 'block'
  //                   }}>
  //                     {userPosition.previousAverage?.toFixed(1)}% avg
  //                   </span>
  //                 </div>
                  
  //                 <div className="rank-transition" style={{ 
  //                   display: 'flex', 
  //                   flexDirection: 'column', 
  //                   alignItems: 'center',
  //                   gap: '0.5rem',
  //                   padding: '0 1rem'
  //                 }}>
  //                   <div className="transition-arrow" style={{ fontSize: '1.5rem' }}>
  //                     {positionInfo?.icon}
  //                   </div>
  //                   <div className="transition-message">
  //                     <span className={`position-change ${positionInfo?.type}`} style={{ 
  //                       fontSize: '0.875rem',
  //                       fontWeight: '500',
  //                       color: positionInfo?.type === 'improvement' ? '#059669' : 
  //                              positionInfo?.type === 'decline' ? '#dc2626' : '#6b7280'
  //                     }}>
  //                       {positionInfo?.message}
  //                     </span>
  //                   </div>
  //                 </div>
                  
  //                 <div className="rank-item current-rank" style={{ 
  //                   textAlign: 'center',
  //                   flex: '1',
  //                   padding: '0.75rem'
  //                 }}>
  //                   <span className="rank-label" style={{ 
  //                     display: 'block', 
  //                     fontSize: '0.875rem', 
  //                     color: '#64748b',
  //                     marginBottom: '0.5rem'
  //                   }}>
  //                     Current
  //                   </span>
  //                   <span className="rank-number" style={{ 
  //                     display: 'block', 
  //                     fontSize: '1.5rem',
  //                     marginBottom: '0.25rem'
  //                   }}>
  //                     {getRankEmoji(userPosition.new)}
  //                   </span>
  //                   <span className="rank-score" style={{ 
  //                     fontSize: '0.875rem', 
  //                     color: '#6b7280',
  //                     display: 'block'
  //                   }}>
  //                     {userPosition.averageScore?.toFixed(1)}% avg
  //                   </span>
  //                 </div>
  //               </div>
                
  //               {/* Performance Metrics */}
  //               <div className="performance-metrics" style={{ 
  //                 display: 'grid', 
  //                 gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  //                 gap: '1rem',
  //                 padding: '1rem',
  //                 backgroundColor: 'white',
  //                 borderRadius: '8px',
  //                 border: '1px solid #e2e8f0'
  //               }}>
  //                 <div className="metric" style={{ 
  //                   display: 'flex', 
  //                   justifyContent: 'space-between',
  //                   alignItems: 'center',
  //                   padding: '0.5rem'
  //                 }}>
  //                   <span className="metric-label" style={{ 
  //                     fontSize: '0.875rem', 
  //                     color: '#64748b',
  //                     fontWeight: '500'
  //                   }}>
  //                     Quiz Score:
  //                   </span>
  //                   <span className="metric-value" style={{ 
  //                     fontSize: '1rem', 
  //                     fontWeight: '600',
  //                     color: '#1e293b'
  //                   }}>
  //                     {quizResults?.percentage}%
  //                   </span>
  //                 </div>
  //                 <div className="metric" style={{ 
  //                   display: 'flex', 
  //                   justifyContent: 'space-between',
  //                   alignItems: 'center',
  //                   padding: '0.5rem'
  //                 }}>
  //                   <span className="metric-label" style={{ 
  //                     fontSize: '0.875rem', 
  //                     color: '#64748b',
  //                     fontWeight: '500'
  //                   }}>
  //                     Average Change:
  //                   </span>
  //                   <span className={`metric-value ${userPosition.improvement >= 0 ? 'positive' : 'negative'}`} style={{ 
  //                     fontSize: '1rem', 
  //                     fontWeight: '600',
  //                     color: userPosition.improvement >= 0 ? '#059669' : '#dc2626'
  //                   }}>
  //                     {userPosition.improvement >= 0 ? '+' : ''}{userPosition.improvement?.toFixed(1)}%
  //                   </span>
  //                 </div>
  //                 <div className="metric" style={{ 
  //                   display: 'flex', 
  //                   justifyContent: 'space-between',
  //                   alignItems: 'center',
  //                   padding: '0.5rem'
  //                 }}>
  //                   <span className="metric-label" style={{ 
  //                     fontSize: '0.875rem', 
  //                     color: '#64748b',
  //                     fontWeight: '500'
  //                   }}>
  //                     Total Quizzes:
  //                   </span>
  //                   <span className="metric-value" style={{ 
  //                     fontSize: '1rem', 
  //                     fontWeight: '600',
  //                     color: '#1e293b'
  //                   }}>
  //                     {quizResults?.totalQuizzesTaken}
  //                   </span>
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         )}

  //         {/* Mini Leaderboard with Homepage Styling */}
  //         <div className="mini-leaderboard-card" style={{ 
  //           backgroundColor: '#f8fafc',
  //           borderRadius: '12px',
  //           border: '1px solid #e2e8f0',
  //           padding: '1.5rem',
  //           marginBottom: '2rem'
  //         }}>
  //           <div className="card-header" style={{ 
  //             marginBottom: '1.5rem',
  //             display: 'flex',
  //             alignItems: 'center',
  //             justifyContent: 'space-between'
  //           }}>
  //             <h4 style={{ margin: '0', fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
  //               🏆 Class Rankings
  //             </h4>
  //             <span className="leaderboard-subtitle" style={{ 
  //               fontSize: '0.875rem', 
  //               color: '#64748b',
  //               fontStyle: 'italic'
  //             }}>
  //               Based on quiz averages
  //             </span>
  //           </div>
            
  //           <div className="leaderboard-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
  //             {leaderboard.slice(0, 8).map((player, index) => (
  //               <div
  //                 key={index}
  //                 className={`leaderboard-item ${player.isCurrentUser ? 'current-user highlight-user' : ''}`}
  //                 style={{ 
  //                   display: 'flex',
  //                   alignItems: 'center',
  //                   justifyContent: 'space-between',
  //                   padding: '1rem',
  //                   backgroundColor: player.isCurrentUser ? '#e0f2fe' : 'white',
  //                   borderRadius: '8px',
  //                   border: player.isCurrentUser ? '2px solid #0284c7' : '1px solid #e2e8f0',
  //                   transition: 'all 0.2s ease'
  //                 }}
  //               >
  //               <div className="player-rank" style={{ 
  //               fontSize: '1.25rem',
  //               minWidth: '2rem',
  //               textAlign: 'center',
  //               color: '#1e293b',  // Add this line for dark text
  //               fontWeight: '700'   // Add this line for bold text
  //               }}>
  //               {getRankEmoji(player.rank)}
  //               </div>
                  
  //                 <div className="player-info" style={{ 
  //                   flex: '1',
  //                   paddingLeft: '1rem',
  //                   paddingRight: '1rem'
  //                 }}>
  //                   <div className="player-name" style={{ 
  //                     fontSize: '1rem',
  //                     fontWeight: '600',
  //                     color: '#1e293b',
  //                     marginBottom: '0.25rem'
  //                   }}>
  //                     {player.name}
  //                     {player.isCurrentUser && (
  //                       <span className="you-indicator" style={{ 
  //                         fontSize: '0.875rem',
  //                         color: '#0284c7',
  //                         fontWeight: '500',
  //                         marginLeft: '0.5rem'
  //                       }}>
  //                         (You)
  //                       </span>
  //                     )}
  //                   </div>
  //                   <div className="player-stats">
  //                     <span className="quiz-count" style={{ 
  //                       fontSize: '0.875rem',
  //                       color: '#64748b'
  //                     }}>
  //                       {player.quizCount} quiz{player.quizCount !== 1 ? 'zes' : ''}
  //                     </span>
  //                   </div>
  //                 </div>
                  
  //                 <div className="player-score" style={{ 
  //                   textAlign: 'right',
  //                   minWidth: '4rem'
  //                 }}>
  //                   <span className="score-value" style={{ 
  //                     display: 'block',
  //                     fontSize: '1.125rem',
  //                     fontWeight: '700',
  //                     color: '#1e293b'
  //                   }}>
  //                     {player.score.toFixed(1)}%
  //                   </span>
  //                   <span className="score-label" style={{ 
  //                     fontSize: '0.75rem',
  //                     color: '#64748b'
  //                   }}>
  //                     avg
  //                   </span>
  //                 </div>
  //               </div>
  //             ))}
  //           </div>
            
  //           {/* Show user position if they're not in top 8 */}
  //           {userPosition.new > 8 && (
  //             <div className="user-position-indicator" style={{ marginTop: '1.5rem' }}>
  //               <div className="separator" style={{ 
  //                 textAlign: 'center',
  //                 padding: '1rem 0',
  //                 fontSize: '1.5rem',
  //                 color: '#64748b'
  //               }}>
  //                 ...
  //               </div>
  //               <div className="leaderboard-item current-user highlight-user" style={{ 
  //                 display: 'flex',
  //                 alignItems: 'center',
  //                 justifyContent: 'space-between',
  //                 padding: '1rem',
  //                 backgroundColor: '#e0f2fe',
  //                 borderRadius: '8px',
  //                 border: '2px solid #0284c7'
  //               }}>
  //                 <div className="player-rank" style={{ 
  //                   fontSize: '1.25rem',
  //                   minWidth: '2rem',
  //                   textAlign: 'center'
  //                 }}>
  //                   {getRankEmoji(userPosition.new)}
  //                 </div>
  //                 <div className="player-info" style={{ 
  //                   flex: '1',
  //                   paddingLeft: '1rem',
  //                   paddingRight: '1rem'
  //                 }}>
  //                   <div className="player-name" style={{ 
  //                     fontSize: '1rem',
  //                     fontWeight: '600',
  //                     color: '#1e293b',
  //                     marginBottom: '0.25rem'
  //                   }}>
  //                     You
  //                   </div>
  //                   <div className="player-stats">
  //                     <span className="quiz-count" style={{ 
  //                       fontSize: '0.875rem',
  //                       color: '#64748b'
  //                     }}>
  //                       {quizResults?.totalQuizzesTaken} quiz{quizResults?.totalQuizzesTaken !== 1 ? 'zes' : ''}
  //                     </span>
  //                   </div>
  //                 </div>
  //                 <div className="player-score" style={{ 
  //                   textAlign: 'right',
  //                   minWidth: '4rem'
  //                 }}>
  //                   <span className="score-value" style={{ 
  //                     display: 'block',
  //                     fontSize: '1.125rem',
  //                     fontWeight: '700',
  //                     color: '#1e293b'
  //                   }}>
  //                     {userPosition.averageScore?.toFixed(1)}%
  //                   </span>
  //                   <span className="score-label" style={{ 
  //                     fontSize: '0.75rem',
  //                     color: '#64748b'
  //                   }}>
  //                     avg
  //                   </span>
  //                 </div>
  //               </div>
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //     );
  //   };

  //   return (
  //     <div className="homepage">
  // {/* Header matching Homepage */}
  // <header className="header" style={{
  //   marginBottom: '2rem',
  //   padding: '1rem 1.5rem',
  //   backgroundColor: 'white',
  //   borderBottom: '1px solid #e2e8f0'
  // }}>
  //   <div className="header-left">
  //     {/* Empty - home button moved to center */}
  //   </div>
    
  //   <div className="header-center" style={{
  //     display: 'flex',
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //     gap: '1rem'
  //   }}>
  //     <button className="home-btn" onClick={() => navigate('/')} style={{
  //       padding: '0.75rem',
  //       borderRadius: '8px',
  //       border: '1px solid #e2e8f0',
  //       backgroundColor: 'white',
  //       cursor: 'pointer',
  //       transition: 'all 0.2s ease'
  //     }}>
  //       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  //         <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  //       </svg>
  //     </button>
      
  //     <h1 className="app-title" style={{
  //       margin: '0',
  //       fontSize: '1.5rem',
  //       fontWeight: '700',
  //       color: '#1e293b'
  //     }}>
  //       Quiz Complete!
  //     </h1>
  //   </div>
        
  //         <div className="header-right">
  //           <div className="quiz-badge" style={{ 
  //             fontSize: '1.5rem',
  //             padding: '0.5rem'
  //           }}>
  //             {quizResults.percentage >= 85 ? '🏆' : 
  //              quizResults.percentage >= 70 ? '🥈' : 
  //              quizResults.percentage >= 50 ? '🥉' : '📊'}
  //           </div>
  //         </div>
  //       </header>

  //       <main className="quiz-main" style={{ padding: '0 1.5rem' }}>
  //         <div className="results-container" style={{ 
  //           maxWidth: '800px',
  //           margin: '0 auto',
  //           display: 'flex',
  //           flexDirection: 'column',
  //           gap: '2rem'
  //         }}>
  //           {/* Main Results Card */}
  //           <div className="results-hero" style={{ 
  //             textAlign: 'center',
  //             padding: '2rem',
  //             backgroundColor: '#f8fafc',
  //             borderRadius: '16px',
  //             border: '1px solid #e2e8f0'
  //           }}>
  //             <div className="results-icon" style={{ 
  //               fontSize: '3rem',
  //               marginBottom: '1rem'
  //             }}>
  //               {quizResults.percentage >= 90 ? '🎉' : 
  //                quizResults.percentage >= 70 ? '🎊' : 
  //                quizResults.percentage >= 50 ? '👏' : '💪'}
  //             </div>
  //             <h2 className="results-title" style={{ 
  //               fontSize: '2rem',
  //               fontWeight: '700',
  //               color: '#1e293b',
  //               marginBottom: '1.5rem',
  //               margin: '0 0 1.5rem 0'
  //             }}>
  //               {quizResults.percentage >= 90 ? 'Outstanding!' : 
  //                quizResults.percentage >= 70 ? 'Great Job!' : 
  //                quizResults.percentage >= 50 ? 'Good Effort!' : 'Keep Learning!'}
  //             </h2>
  //             <div className="score-display" style={{ marginTop: '1.5rem' }}>
  //               <div className="score-circle" style={{ 
  //                 display: 'inline-block',
  //                 padding: '2rem',
  //                 backgroundColor: 'white',
  //                 borderRadius: '50%',
  //                 border: '3px solid #e2e8f0',
  //                 minWidth: '120px',
  //                 minHeight: '120px',
  //                 display: 'flex',
  //                 flexDirection: 'column',
  //                 alignItems: 'center',
  //                 justifyContent: 'center'
  //               }}>
  //                 <div className="score-percentage" style={{ 
  //                   fontSize: '2.5rem',
  //                   fontWeight: '700',
  //                   color: '#1e293b',
  //                   lineHeight: '1'
  //                 }}>
  //                   {quizResults.percentage}%
  //                 </div>
  //                 <div className="score-fraction" style={{ 
  //                   fontSize: '1rem',
  //                   color: '#64748b',
  //                   marginTop: '0.5rem'
  //                 }}>
  //                   {quizResults.score}/{quizResults.totalQuestions}
  //                 </div>
  //               </div>
  //             </div>
  //           </div>

  //           {/* Badge Section */}
  //           {quizResults.badgeEarned && (
  //             <div className="badge-earned" style={{ 
  //               padding: '1.5rem',
  //               backgroundColor: '#fef3c7',
  //               borderRadius: '12px',
  //               border: '1px solid #fbbf24'
  //             }}>
  //               <div className="badge-animation" style={{ 
  //                 display: 'flex',
  //                 alignItems: 'center',
  //                 gap: '1rem'
  //               }}>
  //                 <div className="badge-icon" style={{ fontSize: '2rem' }}>
  //                   {quizResults.badgeEarned.icon}
  //                 </div>
  //                 <div className="badge-details">
  //                   <h3 style={{ 
  //                     margin: '0 0 0.5rem 0',
  //                     fontSize: '1.25rem',
  //                     fontWeight: '600',
  //                     color: '#92400e'
  //                   }}>
  //                     Badge Unlocked!
  //                   </h3>
  //                   <p className="badge-name" style={{ 
  //                     margin: '0 0 0.25rem 0',
  //                     fontSize: '1rem',
  //                     color: '#92400e'
  //                   }}>
  //                     {quizResults.badgeEarned.name}
  //                   </p>
  //                   <p className="badge-points" style={{ 
  //                     margin: '0',
  //                     fontSize: '0.875rem',
  //                     color: '#92400e',
  //                     fontWeight: '500'
  //                   }}>
  //                     +{quizResults.badgeEarned.points} points
  //                   </p>
  //                 </div>
  //               </div>
  //             </div>
  //           )}

  //           {/* Next Badge Progress */}
  //           {quizResults.nextBadge && (
  //             <div className="next-badge" style={{ 
  //               padding: '1.5rem',
  //               backgroundColor: '#f1f5f9',
  //               borderRadius: '12px',
  //               border: '1px solid #cbd5e1'
  //             }}>
  //               <h4 style={{ 
  //                 margin: '0 0 1rem 0',
  //                 fontSize: '1.125rem',
  //                 fontWeight: '600',
  //                 color: '#1e293b'
  //               }}>
  //                 Next Challenge
  //               </h4>
  //               <div className="next-badge-info" style={{ 
  //                 display: 'flex',
  //                 alignItems: 'center',
  //                 gap: '1rem'
  //               }}>
  //                 <span className="next-badge-icon" style={{ fontSize: '1.5rem' }}>
  //                   {quizResults.nextBadge.icon}
  //                 </span>
  //                 <div className="next-badge-details" style={{ flex: '1' }}>
  //                   <span className="next-badge-name" style={{ 
  //                     display: 'block',
  //                     fontSize: '1rem',
  //                     fontWeight: '500',
  //                     color: '#1e293b',
  //                     marginBottom: '0.5rem'
  //                   }}>
  //                     {quizResults.nextBadge.name}
  //                   </span>
  //                   <div className="progress-to-badge">
  //                     <div className="progress-bar-badge" style={{ 
  //                       width: '100%',
  //                       height: '8px',
  //                       backgroundColor: '#e2e8f0',
  //                       borderRadius: '4px',
  //                       overflow: 'hidden',
  //                       marginBottom: '0.5rem'
  //                     }}>
  //                       <div 
  //                         className="progress-fill-badge" 
  //                         style={{ 
  //                           width: `${(quizResults.percentage / quizResults.nextBadge.threshold) * 100}%`,
  //                           height: '100%',
  //                           backgroundColor: '#3b82f6',
  //                           transition: 'width 0.3s ease'
  //                         }}
  //                       ></div>
  //                     </div>
  //                     <span className="progress-text" style={{ 
  //                       fontSize: '0.875rem',
  //                       color: '#64748b'
  //                     }}>
  //                       {quizResults.percentage}% / {quizResults.nextBadge.threshold}%
  //                     </span>
  //                   </div>
  //                 </div>
  //               </div>
  //             </div>
  //           )}

  //           {/* Performance Breakdown */}
  //           <div className="performance-grid" style={{ 
  //             display: 'grid',
  //             gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  //             gap: '1rem'
  //           }}>
  //             <div className="performance-card correct" style={{ 
  //               display: 'flex',
  //               alignItems: 'center',
  //               gap: '1rem',
  //               padding: '1.5rem',
  //               backgroundColor: '#f0fdf4',
  //               borderRadius: '12px',
  //               border: '1px solid #bbf7d0'
  //             }}>
  //               <div className="performance-icon" style={{ fontSize: '2rem' }}>✅</div>
  //               <div className="performance-details">
  //                 <div className="performance-number" style={{ 
  //                   fontSize: '1.5rem',
  //                   fontWeight: '700',
  //                   color: '#166534',
  //                   lineHeight: '1'
  //                 }}>
  //                   {quizResults.score}
  //                 </div>
  //                 <div className="performance-label" style={{ 
  //                   fontSize: '0.875rem',
  //                   color: '#166534',
  //                   marginTop: '0.25rem'
  //                 }}>
  //                   Correct
  //                 </div>
  //               </div>
  //             </div>
              
  //             <div className="performance-card incorrect" style={{ 
  //               display: 'flex',
  //               alignItems: 'center',
  //               gap: '1rem',
  //               padding: '1.5rem',
  //               backgroundColor: '#fef2f2',
  //               borderRadius: '12px',
  //               border: '1px solid #fecaca'
  //             }}>
  //               <div className="performance-icon" style={{ fontSize: '2rem' }}>❌</div>
  //               <div className="performance-details">
  //                 <div className="performance-number" style={{ 
  //                   fontSize: '1.5rem',
  //                   fontWeight: '700',
  //                   color: '#991b1b',
  //                   lineHeight: '1'
  //                 }}>
  //                   {quizResults.incorrectAnswers}
  //                 </div>
  //                 <div className="performance-label" style={{ 
  //                   fontSize: '0.875rem',
  //                   color: '#991b1b',
  //                   marginTop: '0.25rem'
  //                 }}>
  //                   Incorrect
  //                 </div>
  //               </div>
  //             </div>
              
  //             <div className="performance-card level" style={{ 
  //               display: 'flex',
  //               alignItems: 'center',
  //               gap: '1rem',
  //               padding: '1.5rem',
  //               backgroundColor: '#f0f9ff',
  //               borderRadius: '12px',
  //               border: '1px solid #bae6fd'
  //             }}>
  //               <div className="performance-icon" style={{ fontSize: '2rem' }}>
  //                 {selectedLevel === 'Beginner' ? '🌱' : 
  //                  selectedLevel === 'Intermediate' ? '🌿' : '🌳'}
  //               </div>
  //               <div className="performance-details">
  //                 <div className="performance-number" style={{ 
  //                   fontSize: '1rem',
  //                   fontWeight: '600',
  //                   color: '#0c4a6e',
  //                   lineHeight: '1'
  //                 }}>
  //                   {selectedLevel}
  //                 </div>
  //                 <div className="performance-label" style={{ 
  //                   fontSize: '0.875rem',
  //                   color: '#0c4a6e',
  //                   marginTop: '0.25rem'
  //                 }}>
  //                   Level
  //                 </div>
  //               </div>
  //             </div>
              
  //             <div className="performance-card language" style={{ 
  //               display: 'flex',
  //               alignItems: 'center',
  //               gap: '1rem',
  //               padding: '1.5rem',
  //               backgroundColor: '#fefbeb',
  //               borderRadius: '12px',
  //               border: '1px solid #fde68a'
  //             }}>
  //               <div className="performance-icon" style={{ fontSize: '2rem' }}>🌍</div>
  //               <div className="performance-details">
  //                 <div className="performance-number" style={{ 
  //                   fontSize: '1rem',
  //                   fontWeight: '600',
  //                   color: '#92400e',
  //                   lineHeight: '1'
  //                 }}>
  //                   {selectedLanguage}
  //                 </div>
  //                 <div className="performance-label" style={{ 
  //                   fontSize: '0.875rem',
  //                   color: '#92400e',
  //                   marginTop: '0.25rem'
  //                 }}>
  //                   Language
  //                 </div>
  //               </div>
  //             </div>
  //           </div>

  //           {/* Leaderboard Display */}
  //           {userPosition && leaderboard && (
  //             <LeaderboardDisplay 
  //               userPosition={userPosition}
  //               leaderboard={leaderboard}
  //               quizResults={quizResults}
  //             />
  //           )}

  //           {/* Action Buttons */}
  //           <div className="results-actions" style={{ 
  //             display: 'flex',
  //             gap: '1rem',
  //             justifyContent: 'center',
  //             marginTop: '1rem'
  //           }}>
  //             <button className="action-btn secondary" onClick={handleRetryQuiz} style={{ 
  //               display: 'flex',
  //               alignItems: 'center',
  //               gap: '0.5rem',
  //               padding: '0.875rem 1.5rem',
  //               backgroundColor: 'white',
  //               border: '2px solid #e2e8f0',
  //               borderRadius: '8px',
  //               fontSize: '1rem',
  //               fontWeight: '500',
  //               color: '#374151',
  //               cursor: 'pointer',
  //               transition: 'all 0.2s ease'
  //             }}>
  //               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  //                 <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.69494 21 7.59227 20.1334 6 18.7083L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  //                 <path d="M3 12V16H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  //               </svg>
  //               Try Again
  //             </button>
              
  //             <button className="action-btn primary" onClick={() => navigate('/')} style={{ 
  //               display: 'flex',
  //               alignItems: 'center',
  //               gap: '0.5rem',
  //               padding: '0.875rem 1.5rem',
  //               backgroundColor: '#3b82f6',
  //               border: '2px solid #3b82f6',
  //               borderRadius: '8px',
  //               fontSize: '1rem',
  //               fontWeight: '500',
  //               color: 'white',
  //               cursor: 'pointer',
  //               transition: 'all 0.2s ease'
  //             }}>
  //               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  //                 <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  //                 <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  //               </svg>
  //               Back to Home
  //             </button>
  //           </div>

  //           {/* Motivational Message */}
  //           <div className="motivation-card" style={{ 
  //             display: 'flex',
  //             alignItems: 'center',
  //             gap: '1rem',
  //             padding: '1.5rem',
  //             backgroundColor: '#f8fafc',
  //             borderRadius: '12px',
  //             border: '1px solid #e2e8f0',
  //             marginBottom: '2rem'
  //           }}>
  //             <div className="motivation-icon" style={{ 
  //               fontSize: '2rem',
  //               flexShrink: 0
  //             }}>
  //               💡
  //             </div>
  //             <div className="motivation-text" style={{ 
  //               fontSize: '1rem',
  //               lineHeight: '1.6',
  //               color: '#374151'
  //             }}>
  //               {quizResults.percentage >= 90 ? 
  //                 "Exceptional work! You've mastered this topic. Ready for the next challenge?" :
  //                 quizResults.percentage >= 70 ?
  //                 "Great performance! Keep practicing to reach perfection." :
  //                 quizResults.percentage >= 50 ?
  //                 "Good foundation! Review the explanations and try again to improve." :
  //                 "Every expert was once a beginner. Keep learning and you'll get there!"
  //               }
  //             </div>
  //           </div>
  //         </div>
  //       </main>
  //     </div>
  //   );
  // };

  // Main render based on current step
  const renderResults = () => {
    const LeaderboardDisplay = ({ userPosition, leaderboard, quizResults }) => {
      const getRankEmoji = (rank) => {
        switch(rank) {
          case 1: return '🥇';
          case 2: return '🥈'; 
          case 3: return '🥉';
          default: return `#${rank}`;
        }
      };

      const getPositionChangeMessage = () => {
        if (!userPosition.change) return null;
        
        if (userPosition.change > 0) {
          return {
            type: 'improvement',
            message: `Moved up ${userPosition.change} position${userPosition.change > 1 ? 's' : ''}!`,
            icon: '⬆️'
          };
        } else if (userPosition.change < 0) {
          return {
            type: 'decline', 
            message: `Dropped ${Math.abs(userPosition.change)} position${Math.abs(userPosition.change) > 1 ? 's' : ''}`,
            icon: '⬇️'
          };
        }
        return {
          type: 'same',
          message: 'Position maintained',
          icon: '➡️'
        };
      };

      const positionInfo = getPositionChangeMessage();

      return (
        <div className="leaderboard-section" style={{ marginBottom: '30px' }}>
          {/* Rank Change with Quiz Theme Styling */}
          {userPosition.old && userPosition.new && (
            <div className="feature-card" style={{ 
              marginBottom: '30px',
              padding: '25px'
            }}>
              <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '20px' }}>📊</div>
              <h3 style={{ 
                fontSize: '1.4rem',
                marginBottom: '25px',
                color: '#ffffff'
              }}>
                Leaderboard Update
              </h3>
              
              <div className="rank-comparison-container" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px' 
              }}>
                <div className="rank-comparison" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '20px',
                  padding: '20px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '15px',
                  border: '1px solid rgba(0, 212, 255, 0.3)'
                }}>
                  <div className="rank-item previous-rank" style={{ 
                    textAlign: 'center',
                    flex: '1',
                    padding: '15px'
                  }}>
                    <span className="rank-label" style={{ 
                      display: 'block', 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '10px'
                    }}>
                      Previous
                    </span>
                    <span className="rank-number" style={{ 
                      display: 'block', 
                      fontSize: '2rem',
                      marginBottom: '8px',
                      color: '#ffffff'
                    }}>
                      {getRankEmoji(userPosition.old)}
                    </span>
                    <span className="rank-score" style={{ 
                      fontSize: '0.9rem', 
                      color: '#00d4ff',
                      display: 'block'
                    }}>
                      {userPosition.previousAverage?.toFixed(1)}% avg
                    </span>
                  </div>
                  
                  <div className="rank-transition" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '10px',
                    padding: '0 20px'
                  }}>
                    <div className="transition-arrow" style={{ 
                      fontSize: '2rem',
                      filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.5))'
                    }}>
                      {positionInfo?.icon}
                    </div>
                    <div className="transition-message">
                      <span className={`position-change ${positionInfo?.type}`} style={{ 
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: positionInfo?.type === 'improvement' ? '#39ff14' : 
                               positionInfo?.type === 'decline' ? '#ff4757' : '#00d4ff',
                        textShadow: '0 0 10px currentColor'
                      }}>
                        {positionInfo?.message}
                      </span>
                    </div>
                  </div>
                  
                  <div className="rank-item current-rank" style={{ 
                    textAlign: 'center',
                    flex: '1',
                    padding: '15px'
                  }}>
                    <span className="rank-label" style={{ 
                      display: 'block', 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '10px'
                    }}>
                      Current
                    </span>
                    <span className="rank-number" style={{ 
                      display: 'block', 
                      fontSize: '2rem',
                      marginBottom: '8px',
                      color: '#ffffff'
                    }}>
                      {getRankEmoji(userPosition.new)}
                    </span>
                    <span className="rank-score" style={{ 
                      fontSize: '0.9rem', 
                      color: '#00d4ff',
                      display: 'block'
                    }}>
                      {userPosition.averageScore?.toFixed(1)}% avg
                    </span>
                  </div>
                </div>
                
                {/* Performance Metrics */}
                <div className="performance-metrics" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  padding: '20px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '15px',
                  border: '1px solid rgba(0, 212, 255, 0.3)'
                }}>
                  <div className="metric" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px'
                  }}>
                    <span className="metric-label" style={{ 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: '500'
                    }}>
                      Quiz Score:
                    </span>
                    <span className="metric-value" style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '700',
                      color: '#00d4ff',
                      textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                    }}>
                      {quizResults?.percentage}%
                    </span>
                  </div>
                  <div className="metric" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px'
                  }}>
                    <span className="metric-label" style={{ 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: '500'
                    }}>
                      Average Change:
                    </span>
                    <span className={`metric-value ${userPosition.improvement >= 0 ? 'positive' : 'negative'}`} style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '700',
                      color: userPosition.improvement >= 0 ? '#39ff14' : '#ff4757',
                      textShadow: userPosition.improvement >= 0 ? '0 0 10px rgba(57, 255, 20, 0.5)' : '0 0 10px rgba(255, 71, 87, 0.5)'
                    }}>
                      {userPosition.improvement >= 0 ? '+' : ''}{userPosition.improvement?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="metric" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px'
                  }}>
                    <span className="metric-label" style={{ 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: '500'
                    }}>
                      Total Quizzes:
                    </span>
                    <span className="metric-value" style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '700',
                      color: '#00d4ff',
                      textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                    }}>
                      {quizResults?.totalQuizzesTaken}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mini Leaderboard with Quiz Theme Styling */}
          <div className="feature-card" style={{ 
            padding: '25px',
            marginBottom: '30px'
          }}>
            <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '20px' }}>🏆</div>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '25px'
            }}>
              <h3 style={{ 
                margin: '0', 
                fontSize: '1.4rem', 
                fontWeight: '600', 
                color: '#ffffff' 
              }}>
                Class Rankings
              </h3>
              <span className="leaderboard-subtitle" style={{ 
                fontSize: '0.9rem', 
                color: 'rgba(255, 255, 255, 0.7)',
                fontStyle: 'italic'
              }}>
                Based on quiz averages
              </span>
            </div>
            
            <div className="leaderboard-list" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              {leaderboard.slice(0, 8).map((player, index) => (
                <div
                  key={index}
                  className={`leaderboard-item ${player.isCurrentUser ? 'current-user highlight-user' : ''}`}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: player.isCurrentUser 
                      ? 'linear-gradient(45deg, rgba(0, 212, 255, 0.2) 0%, rgba(57, 255, 20, 0.1) 100%)'
                      : 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '15px',
                    border: player.isCurrentUser 
                      ? '2px solid #00d4ff' 
                      : '1px solid rgba(0, 212, 255, 0.3)',
                    transition: 'all 0.3s ease',
                    boxShadow: player.isCurrentUser 
                      ? '0 0 20px rgba(0, 212, 255, 0.4)' 
                      : 'none'
                  }}
                >
                  <div className="player-rank" style={{ 
                    fontSize: '1.3rem',
                    minWidth: '2.5rem',
                    textAlign: 'center',
                    color: '#ffffff',
                    fontWeight: '700'
                  }}>
                    {getRankEmoji(player.rank)}
                  </div>
                  
                  <div className="player-info" style={{ 
                    flex: '1',
                    paddingLeft: '20px',
                    paddingRight: '20px'
                  }}>
                    <div className="player-name" style={{ 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: '4px'
                    }}>
                      {player.name}
                      {player.isCurrentUser && (
                        <span className="you-indicator" style={{ 
                          fontSize: '0.9rem',
                          color: '#00d4ff',
                          fontWeight: '500',
                          marginLeft: '8px',
                          textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                        }}>
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="player-stats">
                      <span className="quiz-count" style={{ 
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        {player.quizCount} quiz{player.quizCount !== 1 ? 'zes' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="player-score" style={{ 
                    textAlign: 'right',
                    minWidth: '4rem'
                  }}>
                    <span className="score-value" style={{ 
                      display: 'block',
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      color: '#00d4ff',
                      textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                    }}>
                      {player.score.toFixed(1)}%
                    </span>
                    <span className="score-label" style={{ 
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show user position if they're not in top 8 */}
            {userPosition.new > 8 && (
              <div className="user-position-indicator" style={{ marginTop: '25px' }}>
                <div className="separator" style={{ 
                  textAlign: 'center',
                  padding: '15px 0',
                  fontSize: '1.5rem',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  ...
                </div>
                <div className="leaderboard-item current-user highlight-user" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'linear-gradient(45deg, rgba(0, 212, 255, 0.2) 0%, rgba(57, 255, 20, 0.1) 100%)',
                  borderRadius: '15px',
                  border: '2px solid #00d4ff',
                  boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)'
                }}>
                  <div className="player-rank" style={{ 
                    fontSize: '1.3rem',
                    minWidth: '2.5rem',
                    textAlign: 'center',
                    color: '#ffffff',
                    fontWeight: '700'
                  }}>
                    {getRankEmoji(userPosition.new)}
                  </div>
                  <div className="player-info" style={{ 
                    flex: '1',
                    paddingLeft: '20px',
                    paddingRight: '20px'
                  }}>
                    <div className="player-name" style={{ 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: '4px'
                    }}>
                      You
                    </div>
                    <div className="player-stats">
                      <span className="quiz-count" style={{ 
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        {quizResults?.totalQuizzesTaken} quiz{quizResults?.totalQuizzesTaken !== 1 ? 'zes' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="player-score" style={{ 
                    textAlign: 'right',
                    minWidth: '4rem'
                  }}>
                    <span className="score-value" style={{ 
                      display: 'block',
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      color: '#00d4ff',
                      textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                    }}>
                      {userPosition.averageScore?.toFixed(1)}%
                    </span>
                    <span className="score-label" style={{ 
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      avg
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="quiz-fullscreen">
        {/* Header matching renderQuestion exactly */}
        <header className="header">
          <div className="header-left">
            <button className="home-btn" onClick={() => navigate('/')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="header-center">
            <h1 className="app-title">Smart Quiz Challenge</h1>
          </div>
          
          <div className="header-right">
            <span className="auth-btn signin">
              {quizResults.percentage >= 85 ? '🏆' : 
               quizResults.percentage >= 70 ? '🥈' : 
               quizResults.percentage >= 50 ? '🥉' : '📊'}
            </span>
          </div>
        </header>

        <div className="main-content">
          <main className="main-section">
            <div className="welcome-container">
              {/* Results Title */}
              <div className="welcome-text">
                <h1>
                  {quizResults.percentage >= 90 ? 'Outstanding!' : 
                   quizResults.percentage >= 70 ? 'Great Job!' : 
                   quizResults.percentage >= 50 ? 'Good Effort!' : 'Keep Learning!'}
                </h1>
                <p>
                  {quizResults.percentage >= 90 ? "You've mastered this topic! Ready for the next challenge?" :
                   quizResults.percentage >= 70 ? "Great performance! Keep practicing to reach perfection." :
                   quizResults.percentage >= 50 ? "Good foundation! Review the explanations and try again." :
                   "Every expert was once a beginner. Keep learning and you'll get there!"}
                </p>
              </div>

              {/* Main Score Card */}
              <div className="feature-card" style={{
                padding: '30px',
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                <div className="feature-icon" style={{ 
                  fontSize: '4rem',
                  marginBottom: '20px',
                  filter: 'drop-shadow(0 0 20px rgba(0, 212, 255, 0.5))'
                }}>
                  {quizResults.percentage >= 90 ? '🎉' : 
                   quizResults.percentage >= 70 ? '🎊' : 
                   quizResults.percentage >= 50 ? '👏' : '💪'}
                </div>
                
                <div className="score-display" style={{ marginBottom: '25px' }}>
                  <div className="score-circle" style={{ 
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    border: '3px solid rgba(0, 212, 255, 0.5)',
                    minWidth: '160px',
                    minHeight: '160px',
                    boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)'
                  }}>
                    <div className="score-percentage" style={{ 
                      fontSize: '3rem',
                      fontWeight: '700',
                      color: '#00d4ff',
                      lineHeight: '1',
                      textShadow: '0 0 20px rgba(0, 212, 255, 0.8)'
                    }}>
                      {quizResults.percentage}%
                    </div>
                    <div className="score-fraction" style={{ 
                      fontSize: '1.1rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginTop: '8px'
                    }}>
                      {quizResults.score}/{quizResults.totalQuestions}
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge Section */}
              {quizResults.badgeEarned && (
                <div className="feature-card" style={{ 
                  padding: '25px',
                  marginBottom: '30px',
                  background: 'linear-gradient(45deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)',
                  border: '1px solid rgba(255, 193, 7, 0.4)'
                }}>
                  <div className="badge-animation" style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <div className="badge-icon" style={{ 
                      fontSize: '3rem',
                      filter: 'drop-shadow(0 0 15px rgba(255, 193, 7, 0.8))'
                    }}>
                      {quizResults.badgeEarned.icon}
                    </div>
                    <div className="badge-details">
                      <h3 style={{ 
                        margin: '0 0 8px 0',
                        fontSize: '1.4rem',
                        fontWeight: '600',
                        color: '#ffffff'
                      }}>
                        Badge Unlocked!
                      </h3>
                      <p className="badge-name" style={{ 
                        margin: '0 0 4px 0',
                        fontSize: '1.1rem',
                        color: '#ffc107',
                        fontWeight: '500'
                      }}>
                        {quizResults.badgeEarned.name}
                      </p>
                      <p className="badge-points" style={{ 
                        margin: '0',
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontWeight: '500'
                      }}>
                        +{quizResults.badgeEarned.points} points
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Cards Grid */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '30px'
              }}>
                <div className="feature-card" style={{ 
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  background: 'linear-gradient(45deg, rgba(57, 255, 20, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%)'
                }}>
                  <div className="performance-icon" style={{ 
                    fontSize: '2.5rem',
                    filter: 'drop-shadow(0 0 10px rgba(57, 255, 20, 0.8))'
                  }}>✅</div>
                  <div className="performance-details">
                    <div className="performance-number" style={{ 
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      color: '#39ff14',
                      lineHeight: '1',
                      textShadow: '0 0 15px rgba(57, 255, 20, 0.6)'
                    }}>
                      {quizResults.score}
                    </div>
                    <div className="performance-label" style={{ 
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginTop: '4px'
                    }}>
                      Correct
                    </div>
                  </div>
                </div>
                
                <div className="feature-card" style={{ 
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  background: 'linear-gradient(45deg, rgba(255, 71, 87, 0.1) 0%, rgba(255, 56, 56, 0.05) 100%)'
                }}>
                  <div className="performance-icon" style={{ 
                    fontSize: '2.5rem',
                    filter: 'drop-shadow(0 0 10px rgba(255, 71, 87, 0.8))'
                  }}>❌</div>
                  <div className="performance-details">
                    <div className="performance-number" style={{ 
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      color: '#ff4757',
                      lineHeight: '1',
                      textShadow: '0 0 15px rgba(255, 71, 87, 0.6)'
                    }}>
                      {quizResults.incorrectAnswers}
                    </div>
                    <div className="performance-label" style={{ 
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginTop: '4px'
                    }}>
                      Incorrect
                    </div>
                  </div>
                </div>
                
                <div className="feature-card" style={{ 
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div className="performance-icon" style={{ 
                    fontSize: '2.5rem',
                    filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.5))'
                  }}>
                    {selectedLevel === 'Beginner' ? '🌱' : 
                     selectedLevel === 'Intermediate' ? '🌿' : '🌳'}
                  </div>
                  <div className="performance-details">
                    <div className="performance-number" style={{ 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#00d4ff',
                      lineHeight: '1',
                      textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                    }}>
                      {selectedLevel}
                    </div>
                    <div className="performance-label" style={{ 
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginTop: '4px'
                    }}>
                      Level
                    </div>
                  </div>
                </div>
                
                <div className="feature-card" style={{ 
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div className="performance-icon" style={{ 
                    fontSize: '2.5rem',
                    filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.5))'
                  }}>🌍</div>
                  <div className="performance-details">
                    <div className="performance-number" style={{ 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#00d4ff',
                      lineHeight: '1',
                      textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                    }}>
                      {selectedLanguage}
                    </div>
                    <div className="performance-label" style={{ 
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginTop: '4px'
                    }}>
                      Language
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Badge Progress */}
              {quizResults.nextBadge && (
                <div className="feature-card" style={{ 
                  padding: '25px',
                  marginBottom: '30px'
                }}>
                  <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '15px' }}>🎯</div>
                  <h3 style={{ 
                    margin: '0 0 15px 0',
                    fontSize: '1.4rem',
                    fontWeight: '600',
                    color: '#ffffff'
                  }}>
                    Next Challenge
                  </h3>
                  <div className="next-badge-info" style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <span className="next-badge-icon" style={{ 
                      fontSize: '2.5rem',
                      filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.5))'
                    }}>
                      {quizResults.nextBadge.icon}
                    </span>
                    <div className="next-badge-details" style={{ flex: '1' }}>
                      <span className="next-badge-name" style={{ 
                        display: 'block',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        color: '#ffffff',
                        marginBottom: '10px'
                      }}>
                        {quizResults.nextBadge.name}
                      </span>
                      <div className="progress-to-badge">
                        <div className="progress-bar-badge" style={{ 
                          width: '100%',
                          height: '12px',
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          marginBottom: '8px',
                          border: '1px solid rgba(0, 212, 255, 0.3)'
                        }}>
                          <div 
                            className="progress-fill-badge" 
                            style={{ 
                              width: `${(quizResults.percentage / quizResults.nextBadge.threshold) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(45deg, #00d4ff 0%, #39ff14 100%)',
                              transition: 'width 0.5s ease',
                              boxShadow: '0 0 15px rgba(0, 212, 255, 0.6)'
                            }}
                          ></div>
                        </div>
                        <span className="progress-text" style={{ 
                          fontSize: '0.9rem',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontWeight: '500'
                        }}>
                          {quizResults.percentage}% / {quizResults.nextBadge.threshold}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard Display */}
              {userPosition && leaderboard && (
                <LeaderboardDisplay 
                  userPosition={userPosition}
                  leaderboard={leaderboard}
                  quizResults={quizResults}
                />
              )}

              {/* Action Buttons */}
              <div className="results-actions" style={{ 
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                marginTop: '30px',
                marginBottom: '30px'
              }}>
                <button 
                  className="action-btn secondary feature-card" 
                  onClick={handleRetryQuiz} 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '15px 30px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid rgba(0, 212, 255, 0.5)',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    minWidth: '160px',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(0, 212, 255, 0.2)';
                    e.target.style.borderColor = '#00d4ff';
                    e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(0, 0, 0, 0.6)';
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.69494 21 7.59227 20.1334 6 18.7083L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 12V16H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Try Again
                </button>
                
                <button 
                  className="action-btn primary feature-card" 
                  onClick={() => navigate('/')} 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '15px 30px',
                    background: 'linear-gradient(45deg, #00d4ff 0%, #39ff14 100%)',
                    border: '2px solid transparent',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#000000',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    minWidth: '160px',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 5px 30px rgba(0, 212, 255, 0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back to Home
                </button>
              </div>

              {/* Motivational Message */}
              <div className="feature-card" style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '25px',
                marginBottom: '40px'
              }}>
                <div className="motivation-icon" style={{ 
                  fontSize: '3rem',
                  flexShrink: 0,
                  filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.5))'
                }}>
                  💡
                </div>
                <div className="motivation-text" style={{ 
                  fontSize: '1.1rem',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500'
                }}>
                  {quizResults.percentage >= 90 ? 
                    "Exceptional work! You've mastered this topic. Ready for the next challenge?" :
                    quizResults.percentage >= 70 ?
                    "Great performance! Keep practicing to reach perfection." :
                    quizResults.percentage >= 50 ?
                    "Good foundation! Review the explanations and try again to improve." :
                    "Every expert was once a beginner. Keep learning and you'll get there!"
                  }
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  };




  if (currentStep === 'setup') {
    return renderSetup();
  } else if (currentStep === 'quiz') {
    return renderQuestion();
  } else if (currentStep === 'results') {
    return renderResults();
  }

  return null;
};

export default Quiz;