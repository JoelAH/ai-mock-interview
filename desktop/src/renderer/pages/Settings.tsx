import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useIAP } from '../hooks/useIAP';
import type { BillingStatusResponse } from '../api/types';
import './Settings.css';

export default function Settings() {
  const { userId, signOut } = useAuth();
  const { subscription, restore, canMakePayments } = useIAP();

  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    api.billingStatus().then(setBilling).catch(() => {});
  }, []);

  const tier = billing?.tier ?? subscription?.tier ?? 'free';
  const isFreeTier = tier === 'free';
  const source = subscription?.isActive ? 'apple' : billing?.status === 'active' ? 'lemonsqueezy' : null;

  function handleManageSubscription() {
    if (source === 'apple') {
      window.open('macappstores://showManageSubscriptions');
    } else if (source === 'lemonsqueezy') {
      window.open('https://devmockview.lemonsqueezy.com/billing');
    }
  }

  async function handleRestore() {
    setIsRestoring(true);
    try {
      await restore();
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="settings">
      <h1 className="settings-title">Settings</h1>

      {/* Account */}
      <div className="settings-section">
        <h2 className="settings-section-title">Account</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">User ID</span>
            <span className="settings-row-value settings-row-value--muted">
              {userId ? `${userId.slice(0, 16)}…` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="settings-section">
        <h2 className="settings-section-title">Subscription</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">Plan</span>
            <span className="settings-tier">
              <span className={`settings-tier-name settings-tier-name--${tier}`}>
                {tier}
              </span>
              {source && (
                <span className="settings-tier-source">
                  via {source === 'apple' ? 'App Store' : 'Web'}
                </span>
              )}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">Status</span>
            <span className="settings-row-value">
              {billing?.status === 'active'
                ? 'Active'
                : subscription?.isActive
                  ? 'Active'
                  : isFreeTier
                    ? 'Free tier'
                    : billing?.status ?? 'Inactive'}
            </span>
          </div>
          {subscription?.expiresAt && (
            <div className="settings-row">
              <span className="settings-row-label">Renews</span>
              <span className="settings-row-value settings-row-value--muted">
                {new Date(subscription.expiresAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="settings-section">
        <h2 className="settings-section-title">Actions</h2>
        <div className="settings-actions">
          {!isFreeTier && source && (
            <button
              className="settings-action-btn"
              onClick={handleManageSubscription}
            >
              <span>Manage Subscription</span>
              <span className="settings-action-arrow">→</span>
            </button>
          )}

          {isFreeTier && (
            <button
              className="settings-action-btn"
              onClick={() => (window.location.hash = '#/dashboard')}
            >
              <span>Upgrade Plan</span>
              <span className="settings-action-arrow">→</span>
            </button>
          )}

          {canMakePayments && (
            <button
              className="settings-action-btn"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              <span>{isRestoring ? 'Restoring…' : 'Restore Purchases'}</span>
              <span className="settings-action-arrow">→</span>
            </button>
          )}

          <button
            className="settings-action-btn settings-action-btn--danger"
            onClick={() => setShowSignOutConfirm(true)}
          >
            <span>Sign Out</span>
            <span className="settings-action-arrow">→</span>
          </button>
        </div>

        {showSignOutConfirm && (
          <div className="settings-signout-confirm">
            <p>Are you sure you want to sign out?</p>
            <button
              className="settings-signout-confirm-btn settings-signout-no"
              onClick={() => setShowSignOutConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="settings-signout-confirm-btn settings-signout-yes"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* About */}
      <div className="settings-section">
        <h2 className="settings-section-title">About</h2>
        <div className="settings-about">
          <span className="settings-about-version">DevMockView v1.0.0</span>
          <div className="settings-about-links">
            <a
              className="settings-about-link"
              onClick={() => window.open('https://devmockview.com/terms')}
            >
              Terms of Service
            </a>
            <a
              className="settings-about-link"
              onClick={() => window.open('https://devmockview.com/privacy')}
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
