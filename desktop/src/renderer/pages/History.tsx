import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { BillingStatusResponse } from '../api/types';
import SessionList from '../components/SessionList';
import './History.css';

interface SessionItem {
  sessionId: string;
  interviewType: string;
  overallScore: number | null;
  createdAt: string;
  status: string;
}

export default function History() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    try {
      // billingStatus gives us basic info; a dedicated history endpoint would be ideal.
      // For now we rely on the billing/dashboard data pattern.
      await api.billingStatus();
      // TODO: Replace with dedicated GET /api/sessions/history endpoint when available
      setSessions([]);
    } catch {
      // Silently fail — show empty state
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="history">
      <div className="history-header">
        <h1 className="history-title">History</h1>
        <p className="history-subtitle">
          Review past interview sessions and track your progress
        </p>
      </div>

      {isLoading ? (
        <div className="history-loading">
          <div className="history-shimmer" />
          <div className="history-shimmer" />
          <div className="history-shimmer" />
        </div>
      ) : (
        <>
          {sessions.length > 0 && (
            <div className="history-stats">
              <div className="history-stat">
                <span className="history-stat-value">{sessions.length}</span>
                <span className="history-stat-label">Total Sessions</span>
              </div>
              <div className="history-stat">
                <span className="history-stat-value">
                  {getAverageScore(sessions)}
                </span>
                <span className="history-stat-label">Avg Score</span>
              </div>
              <div className="history-stat">
                <span className="history-stat-value">
                  {sessions.filter((s) => s.status === 'completed').length}
                </span>
                <span className="history-stat-label">Completed</span>
              </div>
            </div>
          )}

          <SessionList sessions={sessions} />
        </>
      )}
    </div>
  );
}

function getAverageScore(sessions: SessionItem[]): string {
  const scored = sessions
    .filter((s) => s.overallScore !== null)
    .map((s) => s.overallScore!);
  if (scored.length === 0) return '—';
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length).toString();
}
