import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './components/homepage/Homepage';
import StudyPlanner from './components/studyplanner/StudyPlanner';
import StudyResult from './components/studyplanner/StudyResult'; // adjust path if needed
import './App.css';
import MyStudyPlans from './components/studyplanner/MyStudyPlans';


function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/study-planner" element={<StudyPlanner />} />
          <Route path="/study-result" element={<StudyResult />} />
          <Route path="/my-study-plans" element={<MyStudyPlans />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
