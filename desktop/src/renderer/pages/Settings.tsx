import React from 'react';
import './Page.css';

export default function Settings() {
  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">
        Manage your account, subscription, and app preferences.
      </p>
      <div className="page-placeholder">
        <div className="placeholder-card" />
        <div className="placeholder-card" />
      </div>
    </div>
  );
}
