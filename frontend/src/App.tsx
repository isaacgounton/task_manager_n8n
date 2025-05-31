import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TaskViewer from './components/TaskViewer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TaskViewer />} />
          <Route path="/:externalId" element={<TaskViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
