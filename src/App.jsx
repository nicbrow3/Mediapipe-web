import React, { useState, useRef } from 'react';
import WorkoutTracker from './components/WorkoutTracker';
import Sidebar from './components/Sidebar'; // Assuming Sidebar component exists
import * as exercises from './exercises'; // Import all exercises
import './App.css'; // Add styles for layout and toggle button

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [latestPoseData, setLatestPoseData] = useState(null); // State for pose data

  // --- Lifted Exercise State ---
  const availableExercises = useRef(Object.values(exercises)); // Get all exercises
  // console.log('Available exercises:', availableExercises.current); // DEBUG LOG
  const [selectedExercise, setSelectedExercise] = useState(availableExercises.current[0]); // Default to first

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handler function to update pose data state
  const handlePoseResultUpdate = (poseResult) => {
    setLatestPoseData(poseResult);
  };

  // --- Lifted Exercise Handler ---
  const handleExerciseChange = (event) => {
    const exerciseId = event.target.value;
    const newExercise = availableExercises.current.find(ex => ex.id === exerciseId);
    console.log('Selected exerciseId:', exerciseId, 'Resolved exercise:', newExercise); // DEBUG LOG
    if (newExercise) {
      setSelectedExercise(newExercise);
      // Note: Resetting rep count and stage will happen in WorkoutTracker's useEffect
      // or via a dedicated prop if needed, but handled simply here for now.
    }
  };

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
        {/* Simple toggle icon, adjust as needed */}
        {isSidebarOpen ? '>' : '<'}
      </button>

      <div className="main-content">
        <h1>React Workout Tracker</h1>
        <WorkoutTracker
          onPoseResultUpdate={handlePoseResultUpdate}
          availableExercises={availableExercises.current} // Pass down list
          selectedExercise={selectedExercise} // Pass down selected exercise
          onExerciseChange={handleExerciseChange} // Pass down handler
        />
      </div>

      {/* Pass selected exercise and pose data to Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        latestPoseData={latestPoseData}
        selectedExercise={selectedExercise} // Pass down selected exercise
      />
    </div>
  );
}

export default App; 