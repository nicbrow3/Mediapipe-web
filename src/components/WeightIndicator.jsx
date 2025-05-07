import React from 'react';

const WeightIndicator = ({ weight, setWeight }) => {
  return (
    <div style={{
      background: '#222',
      borderRadius: 10,
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      zIndex: 300
    }}>
      <button
        onClick={() => setWeight(w => Math.max(0, w - 10))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        -10
      </button>
      <button
        onClick={() => setWeight(w => Math.max(0, w - 5))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        -5
      </button>
      <span style={{ minWidth: 60, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 22 }}>
        {weight} lb
      </span>
      <button
        onClick={() => setWeight(w => Math.min(200, w + 5))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        +5
      </button>
      <button
        onClick={() => setWeight(w => Math.min(200, w + 10))}
        style={{ fontSize: 20, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}
      >
        +10
      </button>
    </div>
  );
};

export default WeightIndicator; 