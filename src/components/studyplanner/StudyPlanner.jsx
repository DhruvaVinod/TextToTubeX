import React, { useState, useEffect } from 'react';
import './StudyPlanner.css';
import { useNavigate } from 'react-router-dom';

const StudyPlanner = ({ onBack }) => {
  const [formData, setFormData] = useState({ topic: '', language: 'English', days: '', hours: '' });
  const [studyPlan, setStudyPlan] = useState('');
  const [calendarData, setCalendarData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setCurrentFactIndex(Math.floor(Math.random() * funFacts.length));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDDwEucj4KNsnUT4m4qpt1pwnByhm6_vjM`;

  const languages = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
    'Bengali', 'Gujarati', 'Marathi', 'Punjabi', 'Urdu', 'Odia', 'Assamese',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
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
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-blue-600 mb-4 border-b-2 border-blue-200 pb-2">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-gray-700 mt-6 mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium text-blue-500 mt-4 mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gm, '<strong class="font-semibold text-gray-800">$1</strong>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br>');
  };

  const generateStudyPlan = async () => {
    const { topic, language, days, hours } = formData;
    if (!topic.trim() || !days || !hours) {
      return setError('Please fill in all fields.');
    }

    setIsLoading(true);
    setError('');

    try {
      let prompt = `Create a study plan in ${language} for learning "${topic}". The plan should span exactly ${days} days with ${hours} study hours per day. 
Respond entirely in ${language} — do not include English translations. Avoid using markdown symbols like #, *, or **. Structure the plan in clear, plain paragraphs and bullet points using only ${language}.`;
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
          isWeekend: date.getDay() === 0 || date.getDay() === 6
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
            progress: { completed: 0, total: totalDays }
          }
        });
      }, 500);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="study-planner">
      <header className="planner-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>📚 AI Study Planner</h1>
      </header>

      <div className="planner-content">
        <div className="planner-form">
          <div className="form-section">
            <h2>Create Your Personalized Study Plan</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Study Topic *</label>
                <input type="text" name="topic" value={formData.topic} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Language</label>
                <select name="language" value={formData.language} onChange={handleInputChange}>
                  {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Total Days *</label>
                <input type="number" name="days" value={formData.days} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Hours per Day *</label>
                <input type="number" name="hours" value={formData.hours} onChange={handleInputChange} />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button className="generate-btn" onClick={generateStudyPlan} disabled={isLoading}>
                {isLoading ? 'Generating...' : '🚀 Generate Study Plan'}
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
              <div className="search-icon">📚</div>
            </div>
            <h3>Creating your personalized study plan...</h3>
            <div className="fun-fact">
              <div className="fact-icon">💡</div>
              <p className="fact-text">{funFacts[currentFactIndex]}</p>
            </div>
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanner;
