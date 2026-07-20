import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './SignIn.css';

export default function SignIn() {
  const { signIn } = useAuth();

  return (
    <div className="signin">
      <div className="signin-drag-region" />
      <div className="signin-content">
        <div className="signin-logo">D</div>
        <h1 className="signin-title">DevMockView</h1>
        <p className="signin-subtitle">
          AI-powered mock interviews for software engineers
        </p>
        <button className="signin-button" onClick={signIn}>
          Sign in with your browser
        </button>
        <p className="signin-hint">
          Opens your default browser for secure authentication
        </p>
      </div>
    </div>
  );
}
