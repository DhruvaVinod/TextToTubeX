import React, { useState, useEffect } from 'react';
import './DiagramExplainer.css';

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
  
  // Audio-related states
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);

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

  // Audio generation functions
  const fetchAudioUrl = async (text, languageCode) => {
    try {
      const response = await fetch('https://youtube-analyzer-136108111450.us-central1.run.app/api/generate-audio', {
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
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const res = await fetch('https://youtube-analyzer-136108111450.us-central1.run.app/api/analyze-diagram', { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setExplanation(data.explanation);
      setShowResults(true);
      // Clear any previous translations and audio
      setTranslatedExplanation('');
      setCurrentLanguage('en');
      setAudioUrl(null);
      setAudioError(null);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
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
      const response = await fetch('https://youtube-analyzer-136108111450.us-central1.run.app/api/generate-youtube-topic', {
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
      </div>
    </div>
  );
};

export default DiagramExplainer;