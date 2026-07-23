import React, { useState } from 'react';
import { SignIn as ClerkSignIn, SignUp as ClerkSignUp } from '@clerk/clerk-react';
import './SignIn.css';

export default function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const clerkAppearance = {
    variables: {
      colorPrimary: '#ff8a5b',
      colorText: '#edf0f6',
      colorTextSecondary: '#aeb7ca',
      colorBackground: 'transparent',
      colorInputBackground: '#1a2132',
      colorInputText: '#edf0f6',
      colorDanger: '#ff7a8a',
      borderRadius: '10px',
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Geist', system-ui, sans-serif",
    },
    elements: {
      formButtonPrimary: {
        background: 'linear-gradient(135deg, #ffc06b 0%, #ff8a5b 100%)',
        color: '#1a1000',
        fontWeight: 700,
        border: 'none',
        borderRadius: '999px',
        boxShadow: '0 12px 30px -12px rgba(255, 154, 77, 0.5)',
      },
      // Hide Clerk's built-in footer link (we handle sign-in/sign-up toggle ourselves)
      footerAction: {
        display: 'none',
      },
    },
    layout: {
      socialButtonsPlacement: 'top' as const,
      showOptionalFields: false,
    },
  };

  return (
    <div className="signin">
      <div className="signin-drag-region" />

      {/* Background effects */}
      <div className="signin-glow" aria-hidden="true" />
      <div className="signin-grid" aria-hidden="true" />

      <div className="signin-container">
        {/* Left — branding panel */}
        <div className="signin-brand">
          <div className="signin-brand-top">
            {/* Logo */}
            <div className="signin-logo">
              <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <rect
                  x="1.5"
                  y="1.5"
                  width="25"
                  height="25"
                  rx="8"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                />
                <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                  <path d="M8 14v0" />
                  <path d="M11.3 10v8" />
                  <path d="M14.7 6.5v15" />
                  <path d="M18 9v10" />
                  <path d="M21 12.5v3" />
                </g>
              </svg>
            </div>

            <h1 className="signin-title">DevMockview</h1>
            <p className="signin-tagline">
              Rehearse the real interview,{' '}
              <span className="signin-tagline-accent">out loud.</span>
            </p>
          </div>

          {/* Feature list */}
          <div className="signin-features">
            <div className="signin-feature">
              <div className="signin-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2.5" width="6" height="11" rx="3" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
                  <path d="M12 17.5V21M8.5 21h7" />
                </svg>
              </div>
              <div>
                <span className="signin-feature-title">Voice-first practice</span>
                <span className="signin-feature-desc">Real-time speech recognition with Deepgram</span>
              </div>
            </div>

            <div className="signin-feature">
              <div className="signin-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <circle cx="12" cy="12" r="4.5" />
                  <circle cx="12" cy="12" r="0.6" fill="currentColor" />
                </svg>
              </div>
              <div>
                <span className="signin-feature-title">Tailored to your role</span>
                <span className="signin-feature-desc">Paste a JD and get role-specific questions</span>
              </div>
            </div>

            <div className="signin-feature">
              <div className="signin-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 15a8.5 8.5 0 1 1 17 0" />
                  <path d="M12 15l4-4.5" />
                  <circle cx="12" cy="15" r="1.4" />
                </svg>
              </div>
              <div>
                <span className="signin-feature-title">Scored feedback</span>
                <span className="signin-feature-desc">Detailed report on what to fix after each session</span>
              </div>
            </div>
          </div>

          {/* Decorative waveform */}
          <div className="signin-waveform" aria-hidden="true">
            <div className="signin-wave-bar" style={{ height: '12px', animationDelay: '0s' }} />
            <div className="signin-wave-bar" style={{ height: '24px', animationDelay: '0.15s' }} />
            <div className="signin-wave-bar" style={{ height: '36px', animationDelay: '0.3s' }} />
            <div className="signin-wave-bar" style={{ height: '28px', animationDelay: '0.45s' }} />
            <div className="signin-wave-bar" style={{ height: '16px', animationDelay: '0.6s' }} />
            <div className="signin-wave-bar" style={{ height: '32px', animationDelay: '0.75s' }} />
            <div className="signin-wave-bar" style={{ height: '20px', animationDelay: '0.9s' }} />
          </div>
        </div>

        {/* Right — Clerk form */}
        <div className="signin-form">
          {mode === 'signin' ? (
            <ClerkSignIn appearance={clerkAppearance} />
          ) : (
            <ClerkSignUp appearance={clerkAppearance} />
          )}

          {/* Custom toggle between sign-in and sign-up */}
          <div className="signin-mode-toggle">
            {mode === 'signin' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => setMode('signup')}>
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('signin')}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="signin-footer">DevMockView for macOS · v1.0</div>
    </div>
  );
}
