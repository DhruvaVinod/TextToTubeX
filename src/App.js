import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Homepage from './components/homepage/Homepage';
import StudyPlanner from './components/studyplanner/StudyPlanner';
import StudyResult from './components/studyplanner/StudyResult';
import MyStudyPlans from './components/studyplanner/MyStudyPlans';
import PreviousSummaries from './components/search/PreviousSummaries';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/study-planner" element={<StudyPlanner />} />
            <Route path="/study-result" element={<StudyResult />} />
            <Route path="/my-study-plans" element={<MyStudyPlans />} />
            <Route path="/previous-summaries" element={<PreviousSummaries />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;