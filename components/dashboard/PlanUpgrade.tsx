'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { trackUpgradeCheckoutClicked } from '@/lib/analytics';
import styles from './dashboard.module.scss';

interface PlanUpgradeProps {
  currentTier: string;
  checkoutUrls: {
    starter: string | null;
    pro: string | null;
    premium: string | null;
  };
  clerkUserId: string;
  appUrl: string;
}

const PLANS = [
  { tier: 'starter', label: 'Starter', price: '$19/mo', sessions: '10 sessions', featured: false },
  { tier: 'pro', label: 'Pro', price: '$39/mo', sessions: '25 sessions', featured: true },
  { tier: 'premium', label: 'Premium', price: '$79/mo', sessions: '60 sessions', featured: false },
] as const;

const TIER_ORDER = ['free', 'starter', 'pro', 'premium'];

export function PlanUpgrade({ currentTier, checkoutUrls, clerkUserId, appUrl }: PlanUpgradeProps) {
  const currentTierIndex = TIER_ORDER.indexOf(currentTier);

  // Only show plans above the current tier
  const upgradePlans = PLANS.filter(
    (plan) => TIER_ORDER.indexOf(plan.tier) > currentTierIndex,
  );

  if (upgradePlans.length === 0) return null;

  const buildCheckoutUrl = (tier: string): string | null => {
    const baseUrl = checkoutUrls[tier as keyof typeof checkoutUrls];
    if (!baseUrl) return null;
    // Append clerk_user_id as custom data and redirect URL
    const separator = baseUrl.includes('?') ? '&' : '?';
    const redirectUrl = `${appUrl}/dashboard/upgrade-success`;
    return `${baseUrl}${separator}checkout[custom][clerk_user_id]=${encodeURIComponent(clerkUserId)}&checkout[redirect_url]=${encodeURIComponent(redirectUrl)}&redirect_url=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <Box className={styles.upgradeSection}>
      <Box className={styles.upgradeHeader}>
        <RocketLaunchIcon sx={{ color: 'var(--amber)', fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {currentTier === 'free' ? 'Upgrade to unlock more sessions' : 'Upgrade your plan'}
        </Typography>
      </Box>
      <Box className={styles.upgradePlans}>
        {upgradePlans.map((plan) => {
          const url = buildCheckoutUrl(plan.tier);
          return (
            <Box
              key={plan.tier}
              className={`${styles.upgradePlan} ${plan.featured ? styles.upgradePlanFeatured : ''}`}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {plan.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {plan.sessions} &middot; {plan.price}
                </Typography>
              </Box>
              {url ? (
                <Button
                  variant={plan.featured ? 'contained' : 'outlined'}
                  size="small"
                  LinkComponent="a"
                  href={url}
                  onClick={() => trackUpgradeCheckoutClicked(plan.tier)}
                >
                  Upgrade
                </Button>
              ) : (
                <Chip label="Coming soon" size="small" variant="outlined" />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
