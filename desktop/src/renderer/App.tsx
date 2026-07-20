import React from 'react';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Hello DevMockView</h1>
      <p style={{ color: '#999', fontSize: '0.95rem' }}>
        Electron + React + Vite — ready for development
      </p>
    </div>
  );
}
