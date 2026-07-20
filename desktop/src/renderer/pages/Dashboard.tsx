import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useIAP } from '../hooks/useIAP';
import type { BillingStatusResponse } from '../api/types';
import ScoreChart from '../components/ScoreChart';
import SessionList from '../components/SessionList';
import SubscriptionOfferings from '../components/SubscriptionOfferings';
import './Dashboard.css';

interface DashboardData {
  billing: BillingStatusResponse;
  sessions: Array<{
    sessionId: string;
    interviewType: string;
    overallScore: number | null;
    createdAt: string;
    status: string;
  }>;
  scoreHistory: Array<{ date: string; score: number }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscription } = useIAP();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const billing = await api.billingStatus();

      // TODO: Replace with actual dashboard API call when available
      // For now, use billing status and empty session list
      setData({
        billing,
        sessions: [],
        scoreHistory: [],
      });
    } catch (err) {
      console.error('[Dashboard] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleManageSubscription() {
    // Determine source from IAP subscription or billing response
    const source = subscription?.isActive ? 'apple' : null;

    if (source === 'apple') {
      // Open macOS subscription management
      window.open('macappstores://showManageSubscriptions');
    } else if (data?.billing.status === 'active') {
      // Lemon Squeezy customer portal — opens in system browser
      window.open('https://devmockview.lemonsqueezy.com/billing');
    } else {
      // Free user — show upgrade
      setShowUpgrade(true);
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="shimmer" style={{ height: 32, width: 200 }} />
          <div className="dashboard-grid">
            <div className="shimmer" style={{ height: 100 }} />
            <div className="shimmer" style={{ height: 100 }} />
          </div>
          <div className="shimmer" style={{ height: 140 }} />
          <div className="shimmer" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (showUpgrade) {
    return (
      <div className="dashboard">
        <SubscriptionOfferings onClose={() => setShowUpgrade(false)} />
      </div>
    );
  }

  const tier = data?.billing.tier ?? 'free';
  const isFreeTier = tier === 'free';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Your interview practice overview</p>
      </div>

      <div className="dashboard-grid">
        {/* Tier card */}
        <div className="stat-card">
          <p className="stat-card-label">Plan</p>
          <span className={`tier-badge tier-badge--${tier}`}>{tier}</span>
          {!isFreeTier && (
            <p className="tier-source">
              via {subscription?.isActive ? 'App Store' : 'Web'}
            </p>
          )}
          <div className="dashboard-sub-actions">
            {isFreeTier ? (
              <button
                className="dashboard-sub-btn dashboard-sub-btn--upgrade"
                onClick={() => setShowUpgrade(true)}
              >
                Upgrade
              </button>
            ) : (
              <button
                className="dashboard-sub-btn"
                onClick={handleManageSubscription}
              >
                Manage
              </button>
            )}
          </div>
        </div>

        {/* Sessions remaining */}
        <div className="stat-card">
          <p className="stat-card-label">Sessions This Month</p>
          <p className="stat-card-value">
            {data?.sessions.filter((s) => s.status === 'completed').length ?? 0}
          </p>
          <p className="stat-card-hint">
            {isFreeTier
              ? 'Upgrade for more sessions'
              : `${tier} plan`}
          </p>
        </div>
      </div>

      {/* Score trend chart */}
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Score Trend</h2>
        <ScoreChart data={data?.scoreHistory ?? []} />
      </div>

      {/* Recent sessions */}
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Recent Sessions</h2>
        <SessionList sessions={data?.sessions.slice(0, 10) ?? []} />
      </div>

      {/* Quick action */}
      <button
        className="dashboard-sub-btn dashboard-sub-btn--upgrade"
        onClick={() => navigate('/new-interview')}
        style={{ marginTop: 8, padding: '10px 20px', fontSize: 13 }}
      >
        Start New Interview
      </button>
    </div>
  );
}
