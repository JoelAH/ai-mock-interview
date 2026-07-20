import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { grantConsent, getConsentVersion } from '../hooks/useConsent';
import './VoiceConsent.css';

export default function VoiceConsent() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';
  const [declined, setDeclined] = useState(false);

  function handleAccept() {
    grantConsent();
    // Proceed to mic check
    window.location.hash = `#/interview/mic-check?sessionId=${sessionId}`;
  }

  function handleDecline() {
    setDeclined(true);
  }

  function handleGoBack() {
    window.location.hash = '#/new-interview';
  }

  return (
    <div className="consent">
      <div className="consent-card">
        <div className="consent-header">
          <div className="consent-icon">🔒</div>
          <h1 className="consent-title">Voice Recording Consent</h1>
          <p className="consent-subtitle">
            Your privacy matters — please review before starting
          </p>
        </div>

        {declined ? (
          <div className="consent-declined">
            <p className="consent-declined-text">
              Voice consent is required to conduct the interview.
              Without microphone access and recording consent,
              the AI interviewer cannot process your answers.
            </p>
            <div className="consent-actions">
              <button className="consent-btn consent-btn--decline" onClick={handleGoBack}>
                Go Back
              </button>
              <button className="consent-btn consent-btn--accept" onClick={handleAccept}>
                I Consent
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="consent-body">
              <div className="consent-section">
                <h3 className="consent-section-title">What We Capture</h3>
                <ul>
                  <li>Your voice is streamed in real-time to a speech-to-text service (Deepgram)</li>
                  <li>Only the resulting text transcript is stored — not audio recordings</li>
                  <li>Transcripts are used to generate interview feedback</li>
                </ul>
              </div>

              <div className="consent-section">
                <h3 className="consent-section-title">What We Store</h3>
                <ul>
                  <li>Text transcripts of your answers (associated with your account)</li>
                  <li>AI-generated feedback scores and analysis</li>
                  <li>Session metadata (timestamps, interview type)</li>
                </ul>
              </div>

              <div className="consent-section">
                <h3 className="consent-section-title">Your Rights</h3>
                <ul>
                  <li>You can withdraw consent and delete your data at any time</li>
                  <li>Raw audio is never permanently stored or shared</li>
                  <li>You may end an interview session at any point</li>
                </ul>
              </div>

              <div className="consent-highlight">
                <p>Audio is processed in real-time and immediately discarded. Only text transcripts persist.</p>
              </div>
            </div>

            <div className="consent-actions">
              <button className="consent-btn consent-btn--decline" onClick={handleDecline}>
                Decline
              </button>
              <button className="consent-btn consent-btn--accept" onClick={handleAccept}>
                I Consent
              </button>
            </div>

            <p className="consent-version">Consent version: {getConsentVersion()}</p>
          </>
        )}
      </div>
    </div>
  );
}
