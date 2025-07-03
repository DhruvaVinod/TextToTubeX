import React, { useState, useEffect } from 'react';
import './StudyPlanner.css';
import { useNavigate } from 'react-router-dom';

const StudyPlanner = ({ onBack }) => {
  const [formData, setFormData] = useState({ topic: '', language: 'English', days: '', hours: '', difficulty: 'Intermediate' });
  const [studyPlan, setStudyPlan] = useState('');
  const [calendarData, setCalendarData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiTips, setAiTips] = useState([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [formCompletion, setFormCompletion] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const topicSuggestions = [
    'React.js Development', 'Data Science with Python', 'Digital Marketing', 
    'Machine Learning Basics', 'Web Design Fundamentals', 'JavaScript ES6+',
    'Photography Essentials', 'Financial Planning', 'UI/UX Design',
    'Spanish Language', 'Yoga and Meditation', 'Cooking Techniques'
  ];

  const smartTips = [
    "💡 Studies show that spaced repetition improves retention by 200%!",
    "🧠 Taking breaks every 25 minutes (Pomodoro Technique) boosts focus by 40%.",
    "📊 Visual learners retain 65% more information with diagrams and charts.",
    "🎯 Setting specific daily goals increases completion rates by 90%.",
    "🔄 Reviewing material before sleep improves memory consolidation by 60%.",
    "👥 Study groups can improve understanding by up to 75%.",
    "✍️ Writing notes by hand activates more brain regions than typing.",
    "🌅 Morning study sessions are 23% more effective for most people."
  ];

  const funFacts = [
    "🚀 Creating your AI-powered study roadmap...",
    "📚 Analyzing optimal learning patterns for your topic...",
    "🎯 Designing personalized milestones and checkpoints...",
    "⚡ Optimizing study schedule for maximum retention...",
    "🌟 Adding interactive elements to boost engagement...",
    "🧠 Incorporating cognitive science principles...",
    "📈 Calculating progress tracking metrics...",
    "✨ Finalizing your custom learning experience..."
  ];

  const languages = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
    'Bengali', 'Gujarati', 'Marathi', 'Punjabi', 'Urdu', 'Odia', 'Assamese',
  ];

  // Language code mapping for audio generation
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

  const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % funFacts.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % smartTips.length);
    }, 5000);
    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    const filledFields = Object.values(formData).filter(value => value.trim() !== '').length;
    const totalFields = Object.keys(formData).length;
    setFormCompletion((filledFields / totalFields) * 100);
  }, [formData]);

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDDwEucj4KNsnUT4m4qpt1pwnByhm6_vjM`;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    
    if (name === 'topic' && value.length > 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setFormData(prev => ({ ...prev, topic: suggestion }));
    setShowSuggestions(false);
  };

  const callGeminiAPI = async (prompt) => {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Unknown API error');
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  };

  const formatPlanText = (text) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="plan-title">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="plan-section">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="plan-subsection">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gm, '<strong class="plan-bold">$1</strong>')
      .replace(/^- (.*$)/gm, '<li class="plan-item">$1</li>')
      .replace(/\n\n/g, '</p><p class="plan-paragraph">')
      .replace(/\n/g, '<br>');
  };

  const generatePreview = () => {
    const { topic, days, hours, difficulty } = formData;
    if (!topic.trim() || !days || !hours) return;
    
    setShowPreview(true);
    setTimeout(() => setShowPreview(false), 3000);
  };

  const generateStudyPlan = async () => {
    const { topic, language, days, hours, difficulty } = formData;
    if (!topic.trim() || !days || !hours) {
      return setError('Please fill in all required fields.');
    }

    setIsLoading(true);
    setError('');

    try {
      let prompt = `Create a comprehensive and engaging study plan in ${language} for learning "${topic}" at ${difficulty} level. 
      
      The plan should span exactly ${days} days with ${hours} study hours per day.
      
      Structure the plan with:
      1. Clear daily objectives
      2. Progressive skill building
      3. Interactive exercises and projects
      4. Regular assessment checkpoints
      5. Practical applications
      6. Resource recommendations
      
      Make it motivating and include tips for staying engaged. Respond entirely in ${language}.`;

      const result = await callGeminiAPI(prompt);
      const formatted = formatPlanText(result);

      const totalDays = parseInt(days);
      const dailyHours = parseInt(hours);
      const startDate = new Date();
      const calendarDays = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return {
          date,
          dayNumber: i + 1,
          hours: dailyHours,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          completed: false
        };
      });

      const calendarInfo = { days: calendarDays, totalDays, dailyHours };

      setStudyPlan(formatted);
      setCalendarData(calendarInfo);
      setProgress({ completed: 0, total: totalDays });
      setShowProgress(true);

      setTimeout(() => {
        navigate('/study-result', {
          state: {
            plan: formatted,
            calendar: calendarInfo,
            topic,
            difficulty,
            language, // Pass the selected language
            languageCode: languageCodeMap[language], // Pass the language code for audio
            progress: { completed: 0, total: totalDays }
          }
        });
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="study-planner">
      <header className="planner-header">
        <button className="back-btn" onClick={onBack}>
          <span className="back-icon">←</span>
          <span>Back</span>
        </button>
        <h1 className="header-title">
          <span className="header-emoji">🎓</span>
          AI Study Planner
          <span className="header-sparkle">✨</span>
        </h1>
      </header>

      <div className="planner-content">
        {/* Smart Tips Section */}
        <div className="tips-section">
          <div className="tip-card">
            <div className="tip-icon">🧠</div>
            <div className="tip-content">
              <h4>Smart Study Tip</h4>
              <p>{smartTips[currentTipIndex]}</p>
            </div>
          </div>
        </div>

        <div className="planner-form">
          {/* Progress Bar */}
          <div className="form-progress">
            <div className="progress-label">Form Completion</div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${formCompletion}%` }}
              ></div>
            </div>
            <div className="progress-percentage">{Math.round(formCompletion)}%</div>
          </div>

          <div className="form-section">
            <h2 className="form-title">
              🚀 Create Your Personalized Study Journey
            </h2>
            
            <div className="form-row">
              <div className="form-group">
                <div class="form-section">
                  <h3 class="form-section-title">
                  <label>📚 Study Topic *</label></h3>
                <div className="input-container">
                  <input 
                    type="text" 
                    name="topic" 
                    value={formData.topic} 
                    onChange={handleInputChange}
                    placeholder="e.g., React Development, Data Science..."
                    className="smart-input"
                  />
                  <div className="input-icon">🔍</div>
                </div>
                {showSuggestions && (
                  <div className="suggestions-dropdown">
                    {topicSuggestions
                      .filter(suggestion => 
                        suggestion.toLowerCase().includes(formData.topic.toLowerCase())
                      )
                      .slice(0, 4)
                      .map((suggestion, index) => (
                        <div 
                          key={index}
                          className="suggestion-item"
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              </div>
              
              <div className="form-group">
                <div class="form-section">
                  <h3 class="form-section-title">
                  <label>🎯 Difficulty Level</label></h3>
                <div className="difficulty-selector">
                  {difficulties.map((level, index) => (
                    <button
                      key={level}
                      type="button"
                      className={`difficulty-btn ${formData.difficulty === level ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: level }))}
                    >
                      <div className="difficulty-indicator">
                        {Array.from({ length: index + 1 }, (_, i) => (
                          <div key={i} className="difficulty-dot"></div>
                        ))}
                      </div>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <div class="form-section">
                  <h3 class="form-section-title">
                  <label>🌍 Language *</label></h3>
                <select 
                  name="language" 
                  value={formData.language} 
                  onChange={handleInputChange}
                  className="smart-select"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="language-note">
                  <small>📢 Study plan and audio will be generated in this language</small>
                </div>
              </div>
              </div>
              
              <div className="form-group">
                  <div class="form-section">
                    <h3 class="form-section-title">
                <label>📅 Total Days *</label></h3>
                <div className="number-input-container">
                  <input 
                    type="number" 
                    name="days" 
                    value={formData.days} 
                    onChange={handleInputChange}
                    min="1"
                    max="365"
                    className="smart-input"
                  />
                  <div className="input-unit">days</div>
                </div>
              </div>
              </div>
              
              <div className="form-group">
                <div class="form-section">
                  <h3 class="form-section-title">
                <label>⏰ Hours per Day *</label></h3>
                <div className="number-input-container">
                  <input 
                    type="number" 
                    name="hours" 
                    value={formData.hours} 
                    onChange={handleInputChange}
                    min="0.5"
                    max="12"
                    step="0.5"
                    className="smart-input"
                  />
                  <div className="input-unit">hrs</div>
                </div>
              </div>
            </div>
            </div>
            
            {/* Study Plan Preview */}
            {formData.topic && formData.days && formData.hours && (
              <div className="plan-preview">
                <h4>📋 Plan Overview</h4>
                <div className="preview-stats">
                  <div className="stat-item">
                    <div className="stat-value">{formData.days}</div>
                    <div className="stat-label">Days</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{formData.hours * formData.days}</div>
                    <div className="stat-label">Total Hours</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{formData.difficulty}</div>
                    <div className="stat-label">Level</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{formData.language}</div>
                    <div className="stat-label">Language</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <div className="error-icon">⚠️</div>
                <div className="error-text">{error}</div>
              </div>
            )}
            
            <div className="button-group">
              <button 
                className="generate-btn" 
                onClick={generateStudyPlan} 
                disabled={isLoading || !formData.topic || !formData.days || !formData.hours}
              >
                <span className="btn-icon">🚀</span>
                <span className="btn-text">
                  {isLoading ? 'Creating Magic...' : 'Generate My Study Plan'}
                </span>
                {isLoading && <div className="btn-loader"></div>}
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="loading-container">
            <div className="loading-animation">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <div className="search-icon">🎯</div>
            </div>
            <h3 className="loading-title">Crafting Your Perfect Study Plan</h3>
            <div className="fun-fact">
              <div className="fact-icon">✨</div>
              <p className="fact-text">{funFacts[currentFactIndex]}</p>
            </div>
            <div className="loading-progress">
              <div className="loading-bar">
                <div className="loading-fill"></div>
              </div>
              <div className="loading-percentage">
                {Math.min(95, (currentFactIndex + 1) * 12)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanner;