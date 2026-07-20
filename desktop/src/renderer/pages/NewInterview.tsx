import React, { useState } from 'react';
import { api } from '../api/client';
import { ApiRequestError } from '../api/client';
import type { JdParseResponse } from '../api/types';
import { useIAP } from '../hooks/useIAP';
import { hasValidConsent } from '../hooks/useConsent';
import SubscriptionOfferings from '../components/SubscriptionOfferings';
import './NewInterview.css';

const JD_MAX_LENGTH = 10_000;

type Step = 'input' | 'loading' | 'review' | 'cap-reached';

export default function NewInterview() {
  const [step, setStep] = useState<Step>('input');
  const [jdText, setJdText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<JdParseResponse | null>(null);
  const { subscription } = useIAP();

  async function handleAnalyze() {
    if (!jdText.trim()) return;

    setError(null);
    setStep('loading');

    try {
      const result = await api.jdParse({
        jdText: jdText.trim(),
        sourceType: 'paste',
      });
      setParseResult(result);
      setStep('review');
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        // Session cap reached
        setStep('cap-reached');
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Failed to analyze job description'
      );
      setStep('input');
    }
  }

  function handleConfirm() {
    if (!parseResult) return;
    // Check if voice consent has been granted; if not, route to consent gate
    if (!hasValidConsent()) {
      window.location.hash = `#/interview/consent?sessionId=${parseResult.sessionId}`;
    } else {
      window.location.hash = `#/interview/mic-check?sessionId=${parseResult.sessionId}`;
    }
  }

  function handleBack() {
    setStep('input');
    setParseResult(null);
  }

  // --- Cap reached: show upgrade ---
  if (step === 'cap-reached') {
    return (
      <div className="new-interview">
        <div className="new-interview-cap">
          <h2 className="new-interview-cap-title">Session Limit Reached</h2>
          <p className="new-interview-cap-desc">
            You've used all your interview sessions this month.
            Upgrade your plan for more practice.
          </p>
        </div>
        <SubscriptionOfferings onClose={() => setStep('input')} />
      </div>
    );
  }

  // --- Loading ---
  if (step === 'loading') {
    return (
      <div className="new-interview">
        <div className="new-interview-loading">
          <div className="new-interview-spinner" />
          <p className="new-interview-loading-text">
            Analyzing job description…
          </p>
          <p className="new-interview-loading-hint">
            Extracting role signals and preparing your interview
          </p>
        </div>
      </div>
    );
  }

  // --- Review ---
  if (step === 'review' && parseResult) {
    const { parsedSignals, interviewType, estimatedMinutes } = parseResult;

    return (
      <div className="new-interview">
        <div className="new-interview-header">
          <h1 className="new-interview-title">Interview Setup</h1>
          <p className="new-interview-subtitle">
            Review the extracted signals and confirm to begin
          </p>
        </div>

        <div className="review-signals">
          <div className="review-signal-card">
            <span className="review-signal-label">Role</span>
            <span className="review-signal-value">{parsedSignals.role}</span>
          </div>
          <div className="review-signal-card">
            <span className="review-signal-label">Seniority</span>
            <span className="review-signal-value">{parsedSignals.seniority}</span>
          </div>
          <div className="review-signal-card">
            <span className="review-signal-label">Interview Type</span>
            <span className="review-signal-value review-signal-value--type">
              {interviewType}
            </span>
          </div>
          <div className="review-signal-card">
            <span className="review-signal-label">Estimated Duration</span>
            <span className="review-signal-value">{estimatedMinutes} min</span>
          </div>
        </div>

        {parsedSignals.stack.length > 0 && (
          <div className="review-section">
            <h3 className="review-section-title">Tech Stack</h3>
            <div className="review-tags">
              {parsedSignals.stack.map((item) => (
                <span key={item} className="review-tag">{item}</span>
              ))}
            </div>
          </div>
        )}

        {parsedSignals.focusAreas.length > 0 && (
          <div className="review-section">
            <h3 className="review-section-title">Focus Areas</h3>
            <div className="review-tags">
              {parsedSignals.focusAreas.map((area) => (
                <span key={area} className="review-tag">{area}</span>
              ))}
            </div>
          </div>
        )}

        {parsedSignals.culture.length > 0 && (
          <div className="review-section">
            <h3 className="review-section-title">Culture Signals</h3>
            <div className="review-tags">
              {parsedSignals.culture.map((item) => (
                <span key={item} className="review-tag review-tag--culture">{item}</span>
              ))}
            </div>
          </div>
        )}

        <div className="review-actions">
          <button className="review-btn review-btn--secondary" onClick={handleBack}>
            ← Re-paste
          </button>
          <button className="review-btn review-btn--primary" onClick={handleConfirm}>
            Continue to Mic Check →
          </button>
        </div>
      </div>
    );
  }

  // --- JD Input ---
  return (
    <div className="new-interview">
      <div className="new-interview-header">
        <h1 className="new-interview-title">New Interview</h1>
        <p className="new-interview-subtitle">
          Paste a job description to start a tailored mock interview
        </p>
      </div>

      <div className="jd-input-container">
        <textarea
          className="jd-textarea"
          placeholder="Paste the full job description here…"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          maxLength={JD_MAX_LENGTH}
          spellCheck={false}
          autoFocus
        />
        <div className="jd-input-footer">
          <span className={`jd-char-count ${jdText.length > JD_MAX_LENGTH * 0.9 ? 'jd-char-count--warn' : ''}`}>
            {jdText.length.toLocaleString()} / {JD_MAX_LENGTH.toLocaleString()}
          </span>
          <button
            className="jd-analyze-btn"
            onClick={handleAnalyze}
            disabled={!jdText.trim()}
          >
            Analyze
          </button>
        </div>
      </div>

      {error && (
        <div className="jd-error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
