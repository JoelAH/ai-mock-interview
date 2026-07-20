import React from 'react';
import './SessionList.css';

interface SessionItem {
  sessionId: string;
  interviewType: string;
  overallScore: number | null;
  createdAt: string;
  status: string;
}

interface Props {
  sessions: SessionItem[];
}

const TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  architectural: 'System Design',
  mix: 'Mixed',
};

export default function SessionList({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>No interviews yet. Start your first one!</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {sessions.map((session) => (
        <div key={session.sessionId} className="session-list-item">
          <div className="session-list-item-left">
            <span className="session-list-type">
              {TYPE_LABELS[session.interviewType] || session.interviewType}
            </span>
            <span className="session-list-date">
              {formatDate(session.createdAt)}
            </span>
          </div>
          <div className="session-list-item-right">
            {session.status === 'completed' && session.overallScore !== null ? (
              <span
                className={`session-list-score ${getScoreClass(session.overallScore)}`}
              >
                {session.overallScore}
              </span>
            ) : (
              <span className="session-list-status">
                {session.status === 'abandoned' ? 'Abandoned' : 'In Progress'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'session-list-score--high';
  if (score >= 50) return 'session-list-score--mid';
  return 'session-list-score--low';
}
