import React from 'react';

const RepGoalIndicator = ({ repGoal, setRepGoal }) => {
  return (
    <div style={{
      background: '#222',
      borderRadius: 10,
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      zIndex: 301
    }}>
      <button
        onClick={() => setRepGoal(g => Math.max(1, g - 5))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        -5
      </button>
      <button
        onClick={() => setRepGoal(g => Math.max(1, g - 1))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        -1
      </button>
      <span style={{ minWidth: 60, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 22 }}>
        {repGoal} reps
      </span>
      <button
        onClick={() => setRepGoal(g => Math.min(99, g + 1))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        +1
      </button>
      <button
        onClick={() => setRepGoal(g => Math.min(99, g + 5))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        +5
      </button>
    </div>
  );
};

export default RepGoalIndicator; 