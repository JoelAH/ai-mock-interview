import React from 'react';
import './Page.css';

export default function NewInterview() {
  return (
    <div className="page">
      <h1 className="page-title">New Interview</h1>
      <p className="page-subtitle">
        Paste a job description to start a tailored mock interview session.
      </p>
      <div className="page-placeholder">
        <div className="placeholder-card placeholder-card--tall" />
      </div>
    </div>
  );
}
