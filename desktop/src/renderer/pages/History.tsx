import React from 'react';
import './Page.css';

export default function History() {
  return (
    <div className="page">
      <h1 className="page-title">History</h1>
      <p className="page-subtitle">
        Review past interview sessions, scores, and feedback reports.
      </p>
      <div className="page-placeholder">
        <div className="placeholder-card placeholder-card--wide" />
        <div className="placeholder-card placeholder-card--wide" />
        <div className="placeholder-card placeholder-card--wide" />
      </div>
    </div>
  );
}
