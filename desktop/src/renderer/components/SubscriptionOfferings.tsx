import React from 'react';
import { useIAP } from '../hooks/useIAP';
import './SubscriptionOfferings.css';

const TIER_FEATURES: Record<string, string[]> = {
  starter: ['5 interviews/month', 'Basic feedback', 'Behavioral questions'],
  pro: ['15 interviews/month', 'Detailed feedback', 'All question types', 'Score trends'],
  premium: ['Unlimited interviews', 'Premium feedback', 'All question types', 'Priority TTS', 'Score analytics'],
};

interface Props {
  onClose?: () => void;
}

export default function SubscriptionOfferings({ onClose }: Props) {
  const { offerings, subscription, isPurchasing, canMakePayments, purchase, restore } = useIAP();

  if (!canMakePayments) {
    return (
      <div className="offerings">
        <p className="offerings-unavailable">
          In-app purchases are not available on this device.
        </p>
      </div>
    );
  }

  const handlePurchase = async (productId: string) => {
    const success = await purchase(productId);
    if (success && onClose) {
      onClose();
    }
  };

  return (
    <div className="offerings">
      <div className="offerings-header">
        <h2 className="offerings-title">Upgrade Your Plan</h2>
        <p className="offerings-subtitle">
          Choose a plan to unlock more interviews and features
        </p>
      </div>

      <div className="offerings-grid">
        {offerings.map((offering) => {
          const isCurrentTier = subscription?.tier === offering.tier;
          const features = TIER_FEATURES[offering.tier] || [];

          return (
            <div
              key={offering.product.productIdentifier}
              className={`offering-card ${offering.tier === 'pro' ? 'offering-card--popular' : ''} ${isCurrentTier ? 'offering-card--current' : ''}`}
            >
              {offering.tier === 'pro' && (
                <span className="offering-badge">Most Popular</span>
              )}
              <h3 className="offering-tier">
                {offering.tier.charAt(0).toUpperCase() + offering.tier.slice(1)}
              </h3>
              <div className="offering-price">
                <span className="offering-price-amount">
                  {offering.product.formattedPrice}
                </span>
                <span className="offering-price-period">/month</span>
              </div>
              <ul className="offering-features">
                {features.map((feature) => (
                  <li key={feature} className="offering-feature">
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className="offering-button"
                disabled={isPurchasing || isCurrentTier}
                onClick={() => handlePurchase(offering.product.productIdentifier)}
              >
                {isCurrentTier
                  ? 'Current Plan'
                  : isPurchasing
                    ? 'Processing…'
                    : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="offerings-footer">
        <button
          className="offerings-restore"
          onClick={restore}
          disabled={isPurchasing}
        >
          Restore Purchases
        </button>
        {onClose && (
          <button className="offerings-close" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
