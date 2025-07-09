// TutorialOverlay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { tutorialTranslations } from './TutorialTranslations'; // Import your translations
import './TutorialOverlay.css';

const TutorialOverlay = ({ isOpen, onClose, onComplete, selectedLanguage = 'English' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showLanguageSelector, setShowLanguageSelector] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const [tutorialContent, setTutorialContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({});
  
  // Audio-related state
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  // Helper function to remove emojis from text
  const removeEmojis = (text) => {
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim();
  };

  const languages = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
    'Bengali', 'Gujarati', 'Marathi', 'Punjabi', 'Urdu', 'Odia', 'Assamese'
  ];

  const languageCodeMap = {
    'English': 'en',
    'Hindi': 'hi',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Bengali': 'bn',
    'Gujarati': 'gu',
    'Marathi': 'mr',
    'Punjabi': 'pa',
    'Urdu': 'ur',
    'Odia': 'or',
    'Assamese': 'as'
  };

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
    });
    audioRef.current.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
      setAudioLoading(false);
    });
    
    // Handle audio interruption
    audioRef.current.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    return () => {
      if (audioRef.current) {
        // Clean up audio properly
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        audioRef.current.src = '';
        audioRef.current.load(); // Reset the audio element
      }
    };
  }, []);

  // Generate and play audio for current step
  const playStepAudio = async (stepContent) => {
    if (!isAudioEnabled || !stepContent) return;

    setAudioLoading(true);
    try {
      // Remove emojis from the text before sending to TTS
      const cleanTitle = removeEmojis(stepContent.title);
      const cleanContent = removeEmojis(stepContent.content);
      
      const response = await fetch('https://youtube-analyzer-136108111450.us-central1.run.app/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${cleanTitle}. ${cleanContent}`,
          language: languageCodeMap[currentLanguage] || 'en'
        }),
      });

      if (!response.ok) {
        throw new Error('Audio generation failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        // Handle play promise to prevent interruption errors
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((error) => {
              // Handle play interruption gracefully
              if (error.name !== 'AbortError') {
                console.error('Audio play error:', error);
              }
              setIsPlaying(false);
            });
        }
      }
    } catch (err) {
      console.error('Audio generation error:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  // Stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      // Check if audio is not already paused to prevent unnecessary operations
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Toggle audio playback
  const toggleAudio = () => {
    if (isPlaying) {
      stopAudio();
    } else if (tutorialContent && tutorialContent.steps[currentStep]) {
      // Stop any currently playing audio before starting new one
      stopAudio();
      playStepAudio(tutorialContent.steps[currentStep]);
    }
  };

  // Update tooltip position on scroll and resize
  useEffect(() => {
    const updatePosition = () => {
      if (tutorialContent && !showLanguageSelector) {
        const currentStepData = tutorialContent.steps[currentStep];
        const newPosition = getTooltipPosition(currentStepData.target, currentStepData.position);
        setTooltipPosition(newPosition);
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      updatePosition();
    }

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, currentStep, tutorialContent, showLanguageSelector]);

  // Load tutorial content from hardcoded translations
  useEffect(() => {
    if (isOpen && !showLanguageSelector) {
      // Get content from hardcoded translations
      const content = tutorialTranslations[currentLanguage] || tutorialTranslations['English'];
      setTutorialContent(content);
    }
  }, [currentLanguage, isOpen, showLanguageSelector]);

  // Play audio when step changes
  useEffect(() => {
    if (tutorialContent && !showLanguageSelector && isAudioEnabled) {
      // Stop any existing audio first
      stopAudio();
      
      // Small delay to ensure tooltip is positioned and audio is properly stopped
      const timeoutId = setTimeout(() => {
        playStepAudio(tutorialContent.steps[currentStep]);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, tutorialContent, showLanguageSelector, isAudioEnabled]);

  const handleLanguageSelect = (language) => {
    setCurrentLanguage(language);
    setShowLanguageSelector(false);
  };

  const nextStep = () => {
    stopAudio();
    if (currentStep < tutorialContent.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    stopAudio();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    stopAudio();
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    stopAudio();
    onClose();
  };

  const getTargetElement = (target) => {
    if (!target) return null;
    return document.querySelector(target);
  };

  const getTooltipPosition = (target, position) => {
    if (!target) return { 
      position: 'fixed',
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      maxHeight: '80vh',
      overflowY: 'auto'
    };
    
    const element = getTargetElement(target);
    if (!element) return { 
      position: 'fixed',
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      maxHeight: '80vh',
      overflowY: 'auto'
    };

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = 300;
    const tooltipWidth = 350;

    let top, left, transform;

    switch (position) {
      case 'top':
        top = rect.top - 10;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, -100%)';
        
        if (top - tooltipHeight < 0) {
          top = rect.bottom + 10;
          transform = 'translate(-50%, 0)';
        }
        break;
        
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, 0)';
        
        if (top + tooltipHeight > viewportHeight) {
          top = rect.top - 10;
          transform = 'translate(-50%, -100%)';
        }
        break;
        
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 10;
        transform = 'translate(-100%, -50%)';
        
        if (left - tooltipWidth < 0) {
          left = rect.right + 10;
          transform = 'translate(0, -50%)';
        }
        break;
        
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 10;
        transform = 'translate(0, -50%)';
        
        if (left + tooltipWidth > viewportWidth) {
          left = rect.left - 10;
          transform = 'translate(-100%, -50%)';
        }
        break;
        
      default:
        top = rect.top + rect.height / 2;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, -50%)';
    }

    if (left < tooltipWidth / 2) {
      left = tooltipWidth / 2;
      transform = transform.replace('-50%', '0');
    }
    if (left > viewportWidth - tooltipWidth / 2) {
      left = viewportWidth - tooltipWidth / 2;
      transform = transform.replace('-50%', '-100%');
    }

    return {
      position: 'fixed',
      top: `${Math.max(10, Math.min(top, viewportHeight - tooltipHeight - 10))}px`,
      left: `${left}px`,
      transform,
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 10002
    };
  };

  if (!isOpen) return null;

  // Language Selector Screen
  if (showLanguageSelector) {
    return (
      <div className="tutorial-overlay">
        <div className="tutorial-backdrop" onClick={handleSkip}></div>
        <div className="tutorial-tooltip" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 10002
        }}>
          <div className="tutorial-content">
            <div className="tutorial-header">
              <h3>🌍 Choose Your Language</h3>
              <div className="tutorial-controls">
                <button 
                  className={`audio-toggle ${isAudioEnabled ? 'enabled' : 'disabled'}`}
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  title={isAudioEnabled ? 'Disable Audio' : 'Enable Audio'}
                >
                  {isAudioEnabled ? '🔊' : '🔇'}
                </button>
                <button className="tutorial-close" onClick={handleSkip}>×</button>
              </div>
            </div>
            
            <div className="tutorial-body">
              <p>Select your preferred language for the tutorial:</p>
              <div className="language-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '10px',
                marginTop: '15px'
              }}>
                {languages.map((language) => (
                  <button
                    key={language}
                    onClick={() => handleLanguageSelect(language)}
                    className={`language-btn ${currentLanguage === language ? 'active' : ''}`}
                    style={{
                      padding: '10px 12px',
                      border: currentLanguage === language ? '2px solid #007bff' : '1px solid #ddd',
                      borderRadius: '6px',
                      background: currentLanguage === language ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: currentLanguage === language ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="tutorial-footer">
              <div className="tutorial-actions">
                <button className="tutorial-btn secondary" onClick={handleSkip}>
                  Skip Tutorial
                </button>
                <button 
                  className="tutorial-btn primary" 
                  onClick={() => handleLanguageSelect(currentLanguage)}
                >
                  Continue with {currentLanguage}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tutorialContent) return null;

  const currentStepData = tutorialContent.steps[currentStep];

  return (
    <div className="tutorial-overlay">
      {/* Highlight overlay */}
      <div className="tutorial-backdrop" onClick={handleSkip}></div>
      
      {/* Highlight target element */}
      {currentStepData.target && (() => {
        const element = getTargetElement(currentStepData.target);
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return (
          <div className="tutorial-highlight" 
               style={{
                 position: 'fixed',
                 top: `${rect.top - 5}px`,
                 left: `${rect.left - 5}px`,
                 width: `${rect.width + 10}px`,
                 height: `${rect.height + 10}px`,
                 border: '3px solid #007bff',
                 borderRadius: '8px',
                 backgroundColor: 'rgba(0, 123, 255, 0.1)',
                 pointerEvents: 'none',
                 zIndex: 10001
               }}
          />
        );
      })()}

      {/* Tutorial tooltip */}
      <div className="tutorial-tooltip" style={tooltipPosition}>
        <div className="tutorial-content">
          <div className="tutorial-header">
            <h3>{currentStepData.title}</h3>
            <div className="tutorial-controls">
              <button 
                className={`audio-toggle ${isAudioEnabled ? 'enabled' : 'disabled'}`}
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                title={isAudioEnabled ? 'Disable Audio' : 'Enable Audio'}
              >
                {isAudioEnabled ? '🔊' : '🔇'}
              </button>
              
              {isAudioEnabled && (
                <button 
                  className={`audio-play ${isPlaying ? 'playing' : ''}`}
                  onClick={toggleAudio}
                  disabled={audioLoading}
                  title={isPlaying ? 'Stop Audio' : 'Play Audio'}
                >
                  {audioLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
                </button>
              )}
              
              <button className="tutorial-close" onClick={handleSkip}>×</button>
            </div>
          </div>
          
          <div className="tutorial-body">
            <p>{currentStepData.content}</p>
          </div>
          
          <div className="tutorial-footer">
            <div className="tutorial-progress">
              <span>{currentStep + 1} / {tutorialContent.steps.length}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((currentStep + 1) / tutorialContent.steps.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="tutorial-actions">
              <button 
                className="tutorial-btn secondary" 
                onClick={handleSkip}
              >
                {tutorialContent.buttons.skip}
              </button>
              
              {currentStep > 0 && (
                <button 
                  className="tutorial-btn secondary" 
                  onClick={prevStep}
                >
                  {tutorialContent.buttons.previous}
                </button>
              )}
              
              <button 
                className="tutorial-btn primary" 
                onClick={nextStep}
              >
                {currentStep === tutorialContent.steps.length - 1 
                  ? tutorialContent.buttons.finish 
                  : tutorialContent.buttons.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;