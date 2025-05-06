import React from 'react';

const ExerciseSelector = ({ exerciseOptions, selectedExercise, onChange }) => (
  <div 
    style={{
      position: 'absolute',
      top: 90,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      background: 'rgba(0,0,0,0.7)',
      borderRadius: 5,
      padding: '8px 16px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: 16
    }}
  >
    <label htmlFor="exercise-select" style={{ marginRight: 8 }}>Exercise:</label>
    <select
      id="exercise-select"
      value={selectedExercise?.id}
      onChange={e => {
        const selected = exerciseOptions.find(opt => opt.id === e.target.value);
        if (selected) onChange(selected);
      }}
      style={{ fontSize: 16, borderRadius: 4, padding: '2px 8px' }}
    >
      {exerciseOptions.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
  </div>
);

export default ExerciseSelector; 