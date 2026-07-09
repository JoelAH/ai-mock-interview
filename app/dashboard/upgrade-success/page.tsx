'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 10_000;

export default function UpgradeSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'polling' | 'success' | 'timeout'>('polling');
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function poll() {
      if (cancelled) return;

      // Timeout after 10 seconds — redirect anyway
      if (Date.now() - startTime > TIMEOUT_MS) {
        setStatus('timeout');
        setTimeout(() => router.replace('/dashboard'), 1000);
        return;
      }

      try {
        const res = await fetch('/api/billing/status');
        if (res.ok) {
          const data = await res.json();
          // If tier is no longer 'free', the webhook has synced
          if (data.tier !== 'free') {
            setTier(data.tier);
            setStatus('success');
            setTimeout(() => router.replace('/dashboard'), 1500);
            return;
          }
        }
      } catch {
        // Network error — keep polling
      }

      // Schedule next poll
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        textAlign: 'center',
        px: 3,
      }}
    >
      {status === 'polling' && (
        <>
          <CircularProgress size={48} sx={{ color: 'var(--teal)' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
            Activating your plan...
          </Typography>
          <Typography color="text.secondary">
            Confirming your subscription. This usually takes a few seconds.
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'var(--teal)' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
            You&apos;re on the {tier?.charAt(0).toUpperCase()}{tier?.slice(1)} plan!
          </Typography>
          <Typography color="text.secondary">
            Redirecting to your dashboard...
          </Typography>
        </>
      )}

      {status === 'timeout' && (
        <>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'var(--amber)' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
            Payment received!
          </Typography>
          <Typography color="text.secondary">
            Your plan may take a moment to activate. Redirecting to dashboard...
          </Typography>
        </>
      )}
    </Box>
  );
}
