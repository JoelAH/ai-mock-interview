import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { FeedbackReportResponse } from '../api/types';
import './FeedbackReport.css';

export default function FeedbackReport() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';

  const [report, setReport] = useState<FeedbackReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFeedback() {
    setIsLoading(true);
    try {
      const data = await api.sessionFeedback({ sessionId });
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="feedback">
        <div className="feedback-loading">
          <div className="feedback-loading-spinner" />
          <p className="feedback-loading-text">Generating your feedback report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="feedback">
        <div className="feedback-header">
          <h1 className="feedback-title">Feedback Report</h1>
          <p className="feedback-subtitle">{error || 'Report not available'}</p>
        </div>
        <div className="feedback-actions">
          <button
            className="feedback-btn feedback-btn--secondary"
            onClick={() => (window.location.hash = '#/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const scores = [
    { label: 'Technical Accuracy', value: report.technicalAccuracyScore },
    { label: 'Communication', value: report.communicationScore },
    { label: 'Structure', value: report.structureScore },
  ].filter((s) => s.value !== null);

  return (
    <div className="feedback">
      <div className="feedback-header">
        <h1 className="feedback-title">Feedback Report</h1>
        <p className="feedback-subtitle">
          {report.questions.length} question{report.questions.length !== 1 ? 's' : ''} answered
        </p>
      </div>

      {report.abandoned && (
        <div className="feedback-abandoned">
          <p>This interview was ended early. Scores reflect only the completed questions.</p>
        </div>
      )}

      {/* Overall score */}
      <div className="feedback-scores">
        {report.overallScore !== null && (
          <div className="feedback-score-card feedback-score-card--overall">
            <ScoreRing score={report.overallScore} large />
            <div>
              <p className="feedback-score-label" style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>
                Overall Score
              </p>
              <p className="feedback-score-label">out of 100</p>
            </div>
          </div>
        )}

        {scores.map((s) => (
          <div key={s.label} className="feedback-score-card">
            <ScoreRing score={s.value!} />
            <p className="feedback-score-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Synthesized insight */}
      {report.synthesizedInsight && (
        <div className="feedback-insight">
          <p className="feedback-insight-title">Key Insight</p>
          <p className="feedback-insight-text">{report.synthesizedInsight}</p>
        </div>
      )}

      {report.diagnosis && (
        <div className="feedback-insight">
          <p className="feedback-insight-title">Diagnosis</p>
          <p className="feedback-insight-text">{report.diagnosis}</p>
        </div>
      )}

      {/* Per-question breakdown */}
      {report.questions.length > 0 && (
        <>
          <h2 className="feedback-questions-title">Question Breakdown</h2>
          {report.questions.map((q) => {
            const avgScore = getAverageScore(q.scores);
            return (
              <div key={q.order} className="feedback-question">
                <div className="feedback-question-header">
                  <div className="feedback-question-meta">
                    <span className="feedback-question-type">{q.type}</span>
                    <span className="feedback-question-order">Q{q.order}</span>
                  </div>
                  {avgScore !== null && (
                    <span className={`feedback-question-score ${getScoreClass(avgScore)}`}>
                      {avgScore}
                    </span>
                  )}
                </div>
                <p className="feedback-question-text">{q.text}</p>
                {q.answerTranscript && (
                  <p className="feedback-question-answer">{q.answerTranscript}</p>
                )}
                {q.strongAnswerNotes && (
                  <p className="feedback-question-notes">{q.strongAnswerNotes}</p>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Actions */}
      <div className="feedback-actions">
        <button
          className="feedback-btn feedback-btn--secondary"
          onClick={() => (window.location.hash = '#/dashboard')}
        >
          Back to Dashboard
        </button>
        <button
          className="feedback-btn feedback-btn--primary"
          onClick={() => (window.location.hash = '#/new-interview')}
        >
          Practice Again
        </button>
      </div>
    </div>
  );
}

// --- Helpers ---

function ScoreRing({ score, large }: { score: number; large?: boolean }) {
  const size = large ? 72 : 56;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = score >= 75 ? '--high' : score >= 50 ? '--mid' : '--low';

  return (
    <div className={`feedback-score-ring ${large ? 'feedback-score-ring--large' : ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="feedback-score-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={`feedback-score-ring-fill feedback-score-ring-fill${colorClass}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`feedback-score-value ${large ? 'feedback-score-value--large' : ''}`}>
        {score}
      </span>
    </div>
  );
}

function getAverageScore(scores: { relevance?: number; depth?: number; clarity?: number } | null): number | null {
  if (!scores) return null;
  const vals = [scores.relevance, scores.depth, scores.clarity].filter(
    (v): v is number => v !== undefined && v !== null
  );
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'feedback-question-score--high';
  if (score >= 50) return 'feedback-question-score--mid';
  return 'feedback-question-score--low';
}
