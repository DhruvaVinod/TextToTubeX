import React, { useState, useEffect } from 'react';
import './DiagramExplainer.css';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

const DiagramExplainer = ({ onBack, onSearchYouTube }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [translatedExplanation, setTranslatedExplanation] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en'); // Track current language
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  
  // Audio-related states
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  
  
const downloadAsPDF = () => {
  const doc = new jsPDF();
  
  // Add watermark styling
  doc.setTextColor(150, 150, 150); // Gray color for watermark
  doc.setFontSize(10);
  doc.text('TextToTube', doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {
    align: 'right'
  });

  // Reset styling for main content
  doc.setTextColor(0, 0, 0); // Black text
  doc.setFontSize(12);

  // Add image if available
  if (imagePreview) {
    const imgData = imagePreview;
    doc.addImage(imgData, 'JPEG', 15, 15, 180, 100);
  }

  // Process and add explanation text
  const rawText = translatedExplanation || explanation;
  const formattedText = rawText
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
    .replace(/\*(.*?)\*/g, '$1')    // Remove markdown italic
    .replace(/#{1,6}\s*/g, '')      // Remove markdown headers
    .replace(/^\s*[-*+]\s+/gm, '• '); // Convert bullets to proper symbols

  // Split text into lines that fit PDF width
  const splitText = doc.splitTextToSize(formattedText, 180);
  
  // Position text below image or at top if no image
  const textYPosition = imagePreview ? 130 : 30;
  doc.text(splitText, 15, textYPosition);

  // Add styled title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 255); // Blue color for title
  doc.text('Diagram Analysis', 105, textYPosition - 10, { align: 'center' });

  doc.save('diagram-explanation.pdf');
};
const downloadAsText = () => {
  const text = translatedExplanation || explanation;
  const blob = new Blob([text], { type: 'text/plain' });
  saveAs(blob, 'diagram-explanation.txt');
};

const copyToClipboard = () => {
  const text = translatedExplanation || explanation;
  navigator.clipboard.writeText(text)
    .then(() => {
      // You can add a toast notification here if you want
      alert('Explanation copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });
};
  const languages = {
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
  "Interesting: Google's search algorithm uses more than 200 factors to rank web pages in search results."
];

  // Audio generation functions
  const fetchAudioUrl = async (text, languageCode) => {
    try {
      const response = await fetch('http://localhost:5000/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language_code: languageCode })
      });

      if (!response.ok) throw new Error('Failed to fetch audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        url: audioUrl,
        type: audioBlob.type
      };
    } catch (error) {
      console.error('Audio generation error:', error);
      return null;
    }
  };

  
  const handleGenerateAudio = async () => {
    const textToConvert = translatedExplanation || explanation;
    const languageCode = currentLanguage;
    
    if (!textToConvert) {
      setAudioError('No explanation available to convert to audio');
      return;
    }

    try {
      setIsGeneratingAudio(true);
      setAudioError(null);
      
      const audioResult = await fetchAudioUrl(textToConvert, languageCode);
      
      if (audioResult) {
        setAudioUrl(audioResult.url);
      } else {
        setAudioError('Failed to generate audio. Please try again.');
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      setAudioError('Failed to generate audio. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const formatText = (text) => {
    if (!text) return '';
    
    // Remove markdown-style formatting and clean up text
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/#{1,6}\s*(.*?)(?:\n|$)/g, '<strong>$1</strong><br>') // Headers
      .replace(/^\s*[-*+]\s+(.*)$/gm, '• $1') // Bullet points
      .replace(/^\s*\d+\.\s+(.*)$/gm, (match, p1, offset, string) => {
        const lineNum = (string.substring(0, offset).match(/^\s*\d+\./gm) || []).length;
        return `${lineNum + 1}. ${p1}`;
      }); // Numbered lists

    // Split into paragraphs and format
    const paragraphs = formatted.split(/\n\s*\n/).filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (trimmed.startsWith('•')) {
        // Handle bullet points
        const items = trimmed.split('\n').filter(item => item.trim());
        return (
          <ul key={index} style={{ marginBottom: '15px' }}>
            {items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/^•\s*/, '') }} />
            ))}
          </ul>
        );
      } else if (/^\d+\./.test(trimmed)) {
        // Handle numbered lists
        const items = trimmed.split('\n').filter(item => item.trim());
        return (
          <ol key={index} style={{ marginBottom: '15px' }}>
            {items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/^\d+\.\s*/, '') }} />
            ))}
          </ol>
        );
      } else {
        // Regular paragraph
        return (
          <p key={index} dangerouslySetInnerHTML={{ __html: trimmed.replace(/\n/g, '<br>') }} />
        );
      }
    });
  };

  const cleanTextForTranslation = (text) => {
    if (!text) return '';
    
    // Remove markdown formatting before translation
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
      .replace(/#{1,6}\s*(.*?)(?:\n|$)/g, '$1\n') // Remove header markers
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet point markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim();
  };

 const translateText = async (text, targetLanguage) => {
    setIsTranslating(true);
    
    try {
      // Clean the text before translation to avoid translating markdown
      const cleanedText = cleanTextForTranslation(text);
      
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(cleanedText)}`);
      const data = await response.json();
      
      if (data && data[0]) {
        const translatedText = data[0].map(item => item[0]).join('');
        setTranslatedExplanation(translatedText);
        setCurrentLanguage(targetLanguage);
        // Reset audio when language changes
        setAudioUrl(null);
        setAudioError(null);
      }
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
      setShowLanguageDropdown(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
    } catch (err) {
      alert('Camera access denied or not available');
      setShowCamera(false);
    }
  };

  const captureImage = async () => {
    const video = document.getElementById('cameraVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'captured.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      closeCamera();
    }, 'image/jpeg', 0.8);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

const analyzeImage = async () => {
  if (!selectedImage) return alert('Upload or capture an image first');
  
  setShowLoadingScreen(true);
  setIsProcessing(true);
  
  const formData = new FormData();
  formData.append('image', selectedImage);

  try {
    const res = await fetch('http://localhost:5000/api/analyze-diagram', { 
      method: 'POST', 
      body: formData 
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Analysis failed');
    
    setExplanation(data.explanation);
    setShowResults(true);
    setTranslatedExplanation('');
    setCurrentLanguage('en');
    
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    setShowLoadingScreen(false);
    setIsProcessing(false);
  }
};

  const resetAnalysis = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExplanation('');
    setTranslatedExplanation('');
    setShowResults(false);
    setShowLanguageDropdown(false);
    setCurrentLanguage('en');
    setAudioUrl(null);
    setAudioError(null);
  };

  const showOriginalExplanation = () => {
    setTranslatedExplanation('');
    setCurrentLanguage('en');
    // Reset audio when returning to original
    setAudioUrl(null);
    setAudioError(null);
  };

  // Generate YouTube search topic using Gemini API
  const generateYouTubeTopic = async (explanation) => {
    try {
      const response = await fetch('http://localhost:5000/api/generate-youtube-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explanation: explanation
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate topic');
      }

      return data.topic;
    } catch (error) {
      console.error('Error generating YouTube topic:', error);
      // Fallback to basic extraction if Gemini fails
      return extractSearchQueryFallback(explanation);
    }
  };

  // Fallback method (existing logic as backup)
  const extractSearchQueryFallback = (explanation) => {
    if (!explanation) return '';
    
    // Look for common diagram/concept indicators
    const lines = explanation.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    
    // Try to extract the main topic from the first line or explanation
    let searchQuery = '';
    
    // Look for patterns like "This diagram shows...", "This is a...", etc.
    const patterns = [
      /(?:this\s+(?:diagram|image|figure|chart)\s+(?:shows|illustrates|depicts|represents)\s+)([^.]+)/i,
      /(?:this\s+is\s+a\s+(?:diagram|image|figure|chart)\s+of\s+)([^.]+)/i,
      /(?:the\s+(?:diagram|image|figure|chart)\s+(?:shows|illustrates|depicts|represents)\s+)([^.]+)/i,
      /^([^.]+(?:diagram|cycle|process|system|structure|model|chart|graph))/i,
      /^([^.]+)/i // Fallback to first sentence
    ];
    
    for (const pattern of patterns) {
      const match = firstLine.match(pattern);
      if (match) {
        searchQuery = match[1].trim();
        break;
      }
    }
    
    // Clean up the search query
    searchQuery = searchQuery
      .replace(/^(a|an|the)\s+/i, '') // Remove articles
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // If still empty, try to extract key terms from the explanation
    if (!searchQuery) {
      const words = explanation.toLowerCase().split(/\s+/);
      const keyTerms = words.filter(word => 
        word.length > 4 && 
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word)
      );
      searchQuery = keyTerms.slice(0, 3).join(' ');
    }
    
    return searchQuery || 'educational diagram explanation';
  };

  const findYouTubeVideos = async () => {
    setIsGeneratingTopic(true);
    
    try {
      // Use the current explanation (translated or original)
      const currentExplanation = translatedExplanation || explanation;
      
      // Generate topic using Gemini
      const searchTopic = await generateYouTubeTopic(currentExplanation);
      
      // Use the onSearchYouTube prop to navigate to SearchResults with the generated topic
      if (onSearchYouTube) {
        onSearchYouTube(searchTopic);
      }
    } catch (error) {
      console.error('Error finding YouTube videos:', error);
      alert('Failed to generate search topic. Please try again.');
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.language-dropdown')) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isProcessing) {
      const factInterval = setInterval(() => {
        setCurrentFactIndex((prevIndex) => 
          prevIndex === funFacts.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000); // Change fact every 5 seconds

      return () => clearInterval(factInterval);
    }
  }, [isProcessing]);

  return (
    <div className="diagram-explainer">
      <header className="explainer-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div className="header-center">
          <h1 className="page-title">🔍 Diagram & Image Explainer</h1>
        </div>
        <div className="header-right">
          <button className="reset-btn" onClick={resetAnalysis}>
            🔄 Reset
          </button>
        </div>
      </header>

      <div className="explainer-content">
        {!showResults ? (
          <div className="upload-section">
            <div className="upload-container">
              <h2>📸 Upload or Capture an Image</h2>
              <p>Get detailed explanations and study notes for any diagram, chart, or image</p>
              
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" className="preview-img" />
                  <div className="image-actions">
                    <button className="remove-btn" onClick={resetAnalysis}>
                      🗑️ Remove Image
                    </button>
                  </div>
                </div>
              )}
              
              <div className="upload-options">
                <input 
                  type="file" 
                  id="imageInput" 
                  accept="image/*" 
                  hidden 
                  onChange={handleFileUpload} 
                />
                <button 
                  className="primary-btn" 
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  📁 Upload Image
                </button>
                <button className="secondary-btn" onClick={handleCameraCapture}>
                  📷 Use Camera
                </button>
                <button 
                  className="primary-btn" 
                  onClick={analyzeImage} 
                  disabled={isProcessing || !selectedImage}
                >
                {isProcessing ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  '🔍 Analyze'
                )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="result-section">
            <div className="result-box">
              <h3>📚 Explanation</h3>
              <div className="result-content">
                {translatedExplanation ? formatText(translatedExplanation) : formatText(explanation)}
              </div>
              
              {/* Audio Section */}
              <div className="audio-section">
                {!audioUrl && !isGeneratingAudio && (
                  <button 
                    className="generate-audio-btn" 
                    onClick={handleGenerateAudio}
                    disabled={!(translatedExplanation || explanation)}
                  >
                    🔊 
                  </button>
                )}
                
                {isGeneratingAudio && (
                  <div className="audio-loading">
                    <div className="loading-spinner"></div>
                    <span>.......</span>
                  </div>
                )}
                
                {audioError && (
                  <div className="audio-error">
                    <span className="error-icon">⚠️</span>
                    <span>{audioError}</span>
                    <button onClick={handleGenerateAudio} className="retry-btn">Try Again</button>
                  </div>
                )}
                
                {audioUrl && (
                  <div className="audio-player-container">
                    <h4>🎧 Listen to Explanation</h4>
                    <audio controls src={audioUrl} className="audio-player">
                      Your browser does not support the audio element.
                    </audio>
                    <button 
                      className="regenerate-audio-btn" 
                      onClick={handleGenerateAudio}
                      disabled={isGeneratingAudio}
                    >
                      🔄 Regenerate Audio
                    </button>
                  </div>
                )}
              </div>

              <div className="translation-controls">
                <div className="language-dropdown">
                  <button 
                    className="translate-btn"
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  >
                    🌐 Translate
                    {isTranslating && <div className="spinner"></div>}
                  </button>
                  {showLanguageDropdown && (
                    <div className="language-grid">
                      {Object.entries(languages).map(([name, code]) => (
                        <button
                          key={code}
                          className="language-btn"
                          onClick={() => translateText(explanation, code)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {translatedExplanation && (
                  <button 
                    className="secondary-btn"
                    onClick={showOriginalExplanation}
                  >
                    🔄 Show Original
                  </button>
                )}
                {translatedExplanation && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#ff6b6b',
                    marginTop: '5px'
                  }}>
                    PDF export only available for original English version
                  </div>
                )}
              </div>
              
              <div className="export-controls" style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
                justifyContent: 'center'
              }}>
                {/* PDF button - only show in original English */}
                {!translatedExplanation && (
                  <button 
                    className="secondary-btn"
                    onClick={downloadAsPDF}
                    title="Download as PDF"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 10L12 15M12 15L7 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    PDF
                  </button>
                )}
                
                {/* Keep Text and Copy buttons always available */}
                <button 
                  className="secondary-btn"
                  onClick={downloadAsText}
                  title="Download as Text"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 10L12 15M12 15L7 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Text
                </button>
                
                <button 
                  className="secondary-btn"
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copy
                </button>
              </div>
            </div>

            <div className="result-actions">
              <button 
                className="youtube-btn secondary-btn" 
                onClick={findYouTubeVideos}
                disabled={isGeneratingTopic}
              >
                {isGeneratingTopic ? (
                  <>
                    <div className="spinner"></div>
                    Generating Topic...
                  </>
                ) : (
                  '🎥 Find YouTube Videos'
                )}
              </button>
              <button className="primary-btn" onClick={resetAnalysis}>
                📸 Analyze Another Image
              </button>
              <button className="home-btn secondary-btn" onClick={onBack}>
                🏠 Home
              </button>
            </div>
          </div>
        )}

        {showCamera && (
          <div className="camera-overlay">
            <div className="camera-container">
              <div className="camera-header">
                <h3>📷 Camera</h3>
                <button className="close-camera-btn" onClick={closeCamera}>
                  ×
                </button>
              </div>
              <video 
                id="cameraVideo" 
                className="camera-video" 
                autoPlay 
                playsInline 
                ref={(video) => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream;
                  }
                }}
              ></video>
              <div className="camera-controls">
                <button className="capture-btn" onClick={captureImage}>
                  📸 Capture
                </button>
                <button className="cancel-btn" onClick={closeCamera}>
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Updated Loading Screen with Full Screen Center Layout */}
        {showLoadingScreen && (
          <div className="loading-overlay">
            <div className="loading-container">
              <div className="loading-header">
                <button className="back-btn" onClick={() => {
                  setShowLoadingScreen(false);
                  setIsProcessing(false);
                }}>
                  ← Cancel
                </button>
                <h2>Analyzing your diagram...</h2>
              </div>
              
              <div className="loading-content">
                <div className="loading-animation">
                  <div className="pulse-ring"></div>
                  <div className="pulse-ring delay-1"></div>
                  <div className="pulse-ring delay-2"></div>
                  <div className="search-icon">🔍</div>
                </div>
                
                <h3>Extracting knowledge from your image...</h3>
                
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
        )}
      </div>
    </div>
  );
};

export default DiagramExplainer;