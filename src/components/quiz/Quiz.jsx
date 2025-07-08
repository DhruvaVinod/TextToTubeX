import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Quiz.css';
import { submitQuizResult } from '../../services/quiz-service.js';
import { useAuth } from '../../context/AuthContext';
import { setLogLevel } from 'firebase/firestore';
import { auth, db } from '../../firebase'; 
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';

setLogLevel('debug'); // options: 'debug', 'error', 'silent'

const Quiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // useRef to store the SpeechRecognition instance
  const recognitionRef = useRef(null);
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
  const [startTime, setStartTime] = useState(Date.now());
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  
  // New states for document features
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [inputMode, setInputMode] = useState('topic'); // 'topic', 'document'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

useEffect(() => {
  // Check if speech recognition is supported
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
      
      setTopic(transcript);
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

// Helper function to detect native script characters
const hasNativeScript = (text, language) => {
  const scriptRanges = {
    'hi': /[\u0900-\u097F]/, // Devanagari
    'ta': /[\u0B80-\u0BFF]/, // Tamil
    'te': /[\u0C00-\u0C7F]/, // Telugu
    'kn': /[\u0C80-\u0CFF]/, // Kannada
    'ml': /[\u0D00-\u0D7F]/, // Malayalam
    'bn': /[\u0980-\u09FF]/, // Bengali
    'gu': /[\u0A80-\u0AFF]/, // Gujarati
    'mr': /[\u0900-\u097F]/, // Marathi (Devanagari)
    'pa': /[\u0A00-\u0A7F]/, // Punjabi (Gurmukhi)
    'ur': /[\u0600-\u06FF]/, // Urdu (Arabic script)
    'or': /[\u0B00-\u0B7F]/, // Odia
    'as': /[\u0980-\u09FF]/  // Assamese (Bengali script)
  };
  
  return scriptRanges[language] ? scriptRanges[language].test(text) : false;
};

const fetchAllQuizResults = async () => {
  try {
    const q = query(
      collection(db, 'quiz-results'),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return results;
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return [];
  }
};

const fetchUserQuizHistory = async (userId) => {
  try {
    const q = query(
      collection(db, 'quiz-results'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const userResults = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      userResults.push({
        id: doc.id,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: Math.round((data.score / data.totalQuestions) * 100),
        timestamp: data.timestamp
      });
    });
    
    return userResults;
  } catch (error) {
    console.error('Error fetching user quiz history:', error);
    return [];
  }
};

  // Helper functions
  const calculateAverageScore = (quizScores) => {
    if (!quizScores || quizScores.length === 0) return 0;
    const sum = quizScores.reduce((total, score) => total + score, 0);
    return Math.round((sum / quizScores.length) * 100) / 100;
  };

  const generateLeaderboard = async () => {
  setLeaderboardLoading(true);
  try {
    const allResults = await fetchAllQuizResults();
    
    // Group results by userId
    const userScores = {};
    
    allResults.forEach(result => {
      const userId = result.userId;
      const percentage = Math.round((result.score / result.totalQuestions) * 100);
      
      if (!userScores[userId]) {
        userScores[userId] = {
          scores: [],
          displayName: result.displayName || `User ${userId.substring(0, 8)}`
        };
      }
      userScores[userId].scores.push(percentage);
    });
    
    // Create leaderboard with stored names
    const leaderboardData = Object.entries(userScores).map(([userId, userData]) => {
      const averageScore = calculateAverageScore(userData.scores);
      const isCurrentUser = currentUser && userId === currentUser.uid;
      
      let displayName = userData.displayName;
      if (isCurrentUser) {
        displayName = 'You';
      }
      
      return {
        name: displayName,
        userId: userId,
        score: averageScore,
        quizCount: userData.scores.length,
        isCurrentUser: isCurrentUser
      };
    });
    
    // Sort by score and add ranks
    return leaderboardData
      .sort((a, b) => b.score - a.score)
      .map((student, index) => ({
        ...student,
        rank: index + 1
      }));
      
  } catch (error) {
    console.error('Error generating leaderboard:', error);
    return generateHardcodedLeaderboard();
  } finally {
    setLeaderboardLoading(false);
  }
};

// Keep your original function as fallback
const generateHardcodedLeaderboard = () => {
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

useEffect(() => {
  // Check if speech recognition is supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    setSpeechSupported(true);
  } else {
    setSpeechSupported(false);
  }
}, []);

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
      const response = await fetch('http://localhost:5001/api/camera-capture', {
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
    
    fetch('http://localhost:5001/api/upload-image', {
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
    alert('Please enter a topic or use speech input');
    return;
  }

  if (inputMode === 'document' && !documentContent.trim()) {
    alert('Please scan or upload a document first');
    return;
  }

  // Stop speech recognition if it's running
  if (isListening && speechRecognition) {
    speechRecognition.stop();
  }

  setIsLoading(true);
  setStartTime(Date.now()); // Reset start time when quiz begins
  
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

    const response = await fetch('http://localhost:5001/api/generate-quiz', {
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
    // Stop any ongoing speech when moving to next question
    stopSpeaking();

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

// Audio playback state
let currentAudio = null;
let isPlaying = false;

const stopSpeaking = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  setIsSpeaking(false);
  isPlaying = false;
};

// Language code mapping for gTTS API
const getLanguageCode = (language) => {
  const langMap = {
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
  
  return langMap[language] || 'en';
};

// Generate and play audio using the gTTS API
const speakText = async (text, buttonId) => {
  if (!text.trim()) {
    console.warn('[DEBUG] Empty text provided for speech');
    return;
  }

  console.log(`[DEBUG] Speaking from ${buttonId}:`, text);
  console.log(`[DEBUG] Selected language:`, selectedLanguage);

  // Stop any current audio
  stopSpeaking();

  try {
    // Show loading state
    setIsSpeaking(true);

    const languageCode = getLanguageCode(selectedLanguage);
    console.log(`[DEBUG] Using language code: ${languageCode}`);

    // Make API request to generate audio
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        language_code: languageCode
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate audio');
    }

    // Get the audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and play audio element
    currentAudio = new Audio(audioUrl);
    
    // Set up event listeners
    currentAudio.onloadstart = () => {
      console.log('[DEBUG] Audio loading started');
    };

    currentAudio.oncanplay = () => {
      console.log('[DEBUG] Audio can start playing');
    };

    currentAudio.onplay = () => {
      console.log('[DEBUG] Audio playback started');
      isPlaying = true;
      setIsSpeaking(true);
    };

    currentAudio.onended = () => {
      console.log('[DEBUG] Audio playback ended');
      isPlaying = false;
      setIsSpeaking(false);
      
      // Clean up
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };

    currentAudio.onerror = (event) => {
      console.error('[DEBUG] Audio playback error:', event);
      setIsSpeaking(false);
      isPlaying = false;
      
      // Clean up
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      
      alert('Audio playback failed. Please try again.');
    };

    currentAudio.onpause = () => {
      console.log('[DEBUG] Audio playback paused');
      isPlaying = false;
      setIsSpeaking(false);
    };

    // Start playing
    await currentAudio.play();

  } catch (error) {
    console.error('[DEBUG] Failed to generate or play audio:', error);
    setIsSpeaking(false);
    isPlaying = false;
    
    // Handle specific error cases
    if (error.message.includes('language_code')) {
      alert(`The selected language (${selectedLanguage}) may not be supported by the text-to-speech service.`);
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      alert('Network error. Please check your connection and try again.');
    } else {
      alert(`Speech generation failed: ${error.message}`);
    }
  }
};

// Enhanced speaking functions (now using the API)
const speakTextWithFallback = async (text, buttonId) => {
  console.log(`[DEBUG] Speaking with fallback from ${buttonId}:`, text);
  
  // The gTTS API handles multilingual text much better than browser TTS
  // So we can use it directly without complex fallback logic
  await speakText(text, buttonId);
};

const speakOption = async (optionText, optionIndex) => {
  const getOptionPrefix = (language, index) => {
    const optionPrefixes = {
      'English': `Option ${String.fromCharCode(65 + index)}`,
      'Hindi': `विकल्प ${String.fromCharCode(65 + index)}`,
      'Tamil': `விருப்பம் ${String.fromCharCode(65 + index)}`,
      'Telugu': `ఎంపిక ${String.fromCharCode(65 + index)}`,
      'Kannada': `ಆಯ್ಕೆ ${String.fromCharCode(65 + index)}`,
      'Malayalam': `ഓപ്ഷൻ ${String.fromCharCode(65 + index)}`,
      'Bengali': `বিকল্প ${String.fromCharCode(65 + index)}`,
      'Gujarati': `વિકલ્પ ${String.fromCharCode(65 + index)}`,
      'Marathi': `पर्याय ${String.fromCharCode(65 + index)}`,
      'Punjabi': `ਚੋਣ ${String.fromCharCode(65 + index)}`,
      'Urdu': `آপশন ${String.fromCharCode(65 + index)}`,
      'Odia': `ବିକଳ୍ପ ${String.fromCharCode(65 + index)}`,
      'Assamese': `বিকল্প ${String.fromCharCode(65 + index)}`
    };
    
    return optionPrefixes[language] || `Option ${String.fromCharCode(65 + index)}`;
  };
  
  const prefix = getOptionPrefix(selectedLanguage, optionIndex);
  const text = `${prefix}: ${optionText}`;
  await speakTextWithFallback(text, `option-${optionIndex}`);
};

const speakQuestion = async () => {
  const currentQ = questions[currentQuestionIndex];
  if (!currentQ) return;
  
  const questionText = currentQ.question;
  await speakTextWithFallback(questionText, 'question-only');
};

const speakExplanation = async () => {
  const currentQ = questions[currentQuestionIndex];
  if (!currentQ || !currentQ.explanation) return;
  
  const getExplanationPrefix = (language) => {
    const prefixes = {
      'English': 'Explanation:',
      'Hindi': 'व्याख्या:',
      'Tamil': 'விளக்கம்:',
      'Telugu': 'వివరణ:',
      'Kannada': 'ವಿವರಣೆ:',
      'Malayalam': 'വിശദീകരണം:',
      'Bengali': 'ব্যাখ্যা:',
      'Gujarati': 'સમજૂતી:',
      'Marathi': 'स्पष्टीकरण:',
      'Punjabi': 'ਵਿਆਖਿਆ:',
      'Urdu': 'وضاحت:',
      'Odia': 'ବ୍ୟାଖ୍ୟା:',
      'Assamese': 'ব্যাখ্যা:'
    };
    
    return prefixes[language] || 'Explanation:';
  };
  
  const prefix = getExplanationPrefix(selectedLanguage);
  const explanationText = `${prefix} ${currentQ.explanation}`;
  await speakTextWithFallback(explanationText, 'explanation');
};

useEffect(() => {
  console.log('[DEBUG] Audio system initialized with gTTS API');
  
  // Clean up any existing audio when component unmounts
  return () => {
    stopSpeaking();
  };
}, []);

const saveQuizResult = async (quizData) => {
  try {
    await addDoc(collection(db, 'quiz-results'), {
      ...quizData,
      userId: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous User',
      timestamp: serverTimestamp()
    });
    console.log('Quiz result saved successfully');
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
}

const finishQuiz = async () => {
  try {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    
    // Calculate badges (keep existing logic)
    let badgeEarned = null;
    if (percentage >= badges.platinum.threshold) badgeEarned = { ...badges.platinum, key: 'platinum' };
    else if (percentage >= badges.gold.threshold) badgeEarned = { ...badges.gold, key: 'gold' };
    else if (percentage >= badges.silver.threshold) badgeEarned = { ...badges.silver, key: 'silver' };
    else if (percentage >= badges.bronze.threshold) badgeEarned = { ...badges.bronze, key: 'bronze' };

    let nextBadge = null;
    if (percentage < badges.bronze.threshold) nextBadge = { ...badges.bronze, key: 'bronze' };
    else if (percentage < badges.silver.threshold) nextBadge = { ...badges.silver, key: 'silver' };
    else if (percentage < badges.gold.threshold) nextBadge = { ...badges.gold, key: 'gold' };
    else if (percentage < badges.platinum.threshold) nextBadge = { ...badges.platinum, key: 'platinum' };

    // Get current leaderboard position from Firebase
    const currentLeaderboard = await generateLeaderboard();
    const currentUserData = currentLeaderboard.find(student => student.isCurrentUser);
    const oldPosition = currentUserData ? currentUserData.rank : 0;
    const oldAverageScore = currentUserData ? currentUserData.score : 0;
    
    // Submit to Firebase first
    if (currentUser && currentUser.emailVerified) {
      try {
        const timeTaken = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
        const userAnswers = questions.map((_, index) => selectedAnswers[index] || -1);
        
        const quizData = {
          score: finalScore,
          totalQuestions: questions.length,
          timeTaken: timeTaken,
          answers: userAnswers.map((answer, index) => ({
            questionIndex: index,
            userAnswer: answer,
            correctAnswer: questions[index].correct,
            isCorrect: answer === questions[index].correct
          }))
        };
        
        // Use the new saveQuizResult function
        await saveQuizResult(quizData);
        console.log('Quiz submitted successfully to Firebase');
        
      } catch (firebaseError) {
        console.error('Error submitting to Firebase:', firebaseError);
      }
    }
    
    // Get updated leaderboard after submission
    const updatedLeaderboard = await generateLeaderboard();
    const updatedUserData = updatedLeaderboard.find(student => student.isCurrentUser);
    const newPosition = updatedUserData ? updatedUserData.rank : 0;
    const newAverageScore = updatedUserData ? updatedUserData.score : 0;
    
    // Calculate performance metrics
    const scoreImprovement = Math.round((newAverageScore - oldAverageScore) * 100) / 100;
    const positionChange = oldPosition - newPosition;

    // Get user's total quiz count from Firebase
    const userHistory = currentUser ? await fetchUserQuizHistory(currentUser.uid) : [];
    
    // Update local state
    setQuizResults({
      score: finalScore,
      totalQuestions: questions.length,
      percentage,
      badgeEarned,
      nextBadge,
      incorrectAnswers: questions.length - finalScore,
      averageScore: newAverageScore,
      totalQuizzesTaken: userHistory.length,
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
    
  } catch (error) {
    console.error('Error finishing quiz:', error);
  }
};

const getCurrentQuizId = () => {
  const currentLevel = selectedLevel || 'beginner';
  const currentLanguage = selectedLanguage || 'javascript';
  const questionCount = questions.length || 10;
  return `${currentLevel}_${currentLanguage}_${questionCount}q`;
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
                marginTop: '16px',
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
                    style={{
                      paddingRight: speechSupported ? '120px' : '60px' // Extra space for speech button
                    }}
                  />
                  
                  {/* Speech-to-Text Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      className="speech-btn"
                      onClick={handleSpeechInput}
                      disabled={isListening}
                      style={{
                        position: 'absolute',
                        right: '60px',
                        top: '50%',
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
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '15px',
                  marginBottom: '30px'
                }}>
                  <h3 style={{ 
                    fontSize: '1.4rem',
                    lineHeight: '1.6',
                    margin: '0',
                    color: '#ffffff',
                    flex: 1
                  }}>
                    {question.question}
                  </h3>
                  {speechSupported && (
                    <button
                      onClick={speakQuestion}
                      disabled={!speechSupported || isSpeaking}
                      style={{
                        background: isSpeaking ? 'rgba(255, 165, 0, 0.8)' : 'rgba(0, 212, 255, 0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        cursor: isSpeaking ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 212, 255, 0.3)',
                        minWidth: '90px'
                      }}
                      title={isSpeaking ? 'Speaking...' : 'Read question and options aloud'}
                    >
                      {isSpeaking ? '🔊 Speaking...' : '🔊 Read'}
                    </button>
                  )}
                </div>

                {/* Options with setup button styling */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  {question.options.map((option, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
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
                          opacity: showAnswer && index !== question.correct && userAnswer !== index ? 0.6 : 1,
                          flex: 1
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
                      {speechSupported && (
                        <button
                          onClick={() => speakOption(option, index)}
                          disabled={!speechSupported || isSpeaking}
                          style={{
                            background: isSpeaking ? 'rgba(255, 165, 0, 0.6)' : 'rgba(0, 212, 255, 0.6)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px',
                            color: '#ffffff',
                            cursor: isSpeaking ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s ease',
                            minWidth: '40px',
                            height: '40px'
                          }}
                          title={`Read option ${String.fromCharCode(65 + index)} aloud`}
                        >
                          🔊
                        </button>
                      )}
                    </div>
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
                        color: '#00d4ff',
                        flex: 1
                      }}>
                        Explanation
                      </h4>
                      {speechSupported && (
                        <button
                          onClick={speakExplanation}
                          disabled={!speechSupported || isSpeaking}
                          style={{
                            background: isSpeaking ? 'rgba(255, 165, 0, 0.6)' : 'rgba(0, 212, 255, 0.6)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: '#ffffff',
                            cursor: isSpeaking ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            transition: 'all 0.3s ease'
                          }}
                          title="Read explanation aloud"
                        >
                          🔊
                        </button>
                      )}
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