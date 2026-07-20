import React from 'react';
import './Page.css';

export default function Dashboard() {
  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        Your interview practice overview, session history, and performance
        trends will appear here.
      </p>
      <div className="page-placeholder">
        <div className="placeholder-card" />
        <div className="placeholder-card placeholder-card--wide" />
        <div className="placeholder-card" />
      </div>
    </div>
  );
}
