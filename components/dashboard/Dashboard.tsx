'use client';

import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { DashboardResponse, SessionSummary } from '@/lib/schemas';
import type { SessionAllowance } from '@/lib/services/billingService';
import { ScoreTrendChart } from './ScoreTrendChart';
import styles from './dashboard.module.scss';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  setup: 'Setup',
  abandoned: 'Abandoned',
};

const TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  architectural: 'Architectural',
  mix: 'Mixed',
};

function scoreColor(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return styles.high;
  if (score >= 60) return styles.mid;
  return styles.low;
}

interface DashboardProps {
  /** Optional user name for greeting */
  userName?: string;
  /** Dashboard data fetched server-side (null if user not resolved) */
  data?: DashboardResponse | null;
  /** Session allowance info (tier, used, remaining) */
  allowance?: SessionAllowance | null;
}

export default function Dashboard({ userName, data, allowance }: DashboardProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const sessions = data?.sessions ?? [];
  const totalSessions = data?.totalSessions ?? 0;
  const averageScore = data?.averageScore ?? null;
  const [limitAlert, setLimitAlert] = useState(false);

  const handleNewInterview = () => {
    if (allowance && allowance.remaining === 0) {
      setLimitAlert(true);
      return;
    }
    router.push('/interview/new');
  };

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        {/* Header */}
        <Box className={styles.header}>
          <Box>
            <Typography variant="h4" className={styles.greeting}>
              {userName ? `Welcome back, ${userName}` : 'Dashboard'}
            </Typography>
            <Typography color="text.secondary">
              {totalSessions > 0
                ? `${totalSessions} session${totalSessions !== 1 ? 's' : ''} completed`
                : 'No sessions yet — start your first mock interview!'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewInterview}
            >
              New interview
            </Button>
            <Tooltip title="Sign out">
              <IconButton
                onClick={() => signOut({ redirectUrl: '/' })}
                aria-label="Sign out"
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Session allowance */}
        {allowance && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.5,
              borderRadius: 1,
              bgcolor: allowance.remaining === 0 ? 'error.50' : 'action.hover',
              border: '1px solid',
              borderColor: allowance.remaining === 0 ? 'error.200' : 'divider',
            }}
          >
            <Chip
              label={allowance.tier === 'free' ? 'Free plan' : `${allowance.tier.charAt(0).toUpperCase() + allowance.tier.slice(1)} plan`}
              size="small"
              color={allowance.tier === 'free' ? 'default' : 'primary'}
              variant="outlined"
            />
            <Typography variant="body2" color={allowance.remaining === 0 ? 'error.main' : 'text.secondary'}>
              {allowance.remaining === 0
                ? `No sessions remaining this month (${allowance.used}/${allowance.limit} used)`
                : `${allowance.remaining} session${allowance.remaining !== 1 ? 's' : ''} remaining this month (${allowance.used}/${allowance.limit} used)`}
            </Typography>
          </Box>
        )}

        {/* Stats + Trend */}
        {totalSessions > 0 && (
          <Box className={styles.statsRow}>
            <Box className={styles.statCard}>
              <Typography className={styles.statValue}>
                {averageScore ?? '—'}
              </Typography>
              <Typography className={styles.statLabel}>Avg. Score</Typography>
            </Box>
            <Box className={styles.statCard}>
              <Typography className={styles.statValue}>{totalSessions}</Typography>
              <Typography className={styles.statLabel}>Sessions</Typography>
            </Box>
            <Box className={styles.trendCard}>
              <Typography className={styles.trendLabel}>Score Trend</Typography>
              <ScoreTrendChart scores={sessions.map((s) => s.overallScore)} />
            </Box>
          </Box>
        )}

        {/* Session history */}
        {sessions.length === 0 ? (
          <Box className={styles.emptyState}>
            <Typography variant="h6" className={styles.emptyTitle}>
              No sessions yet
            </Typography>
            <Typography color="text.secondary">
              Start a mock interview to see your history and progress here.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleNewInterview}
              sx={{ mt: 2 }}
            >
              Start your first interview
            </Button>
          </Box>
        ) : (
          <Box className={styles.sessionList} aria-label="Session history">
            <Typography variant="h6" className={styles.sectionTitle}>
              Recent sessions
            </Typography>
            {sessions.map((session) => (
              <SessionRow key={session.sessionId} session={session} />
            ))}
          </Box>
        )}
      </Box>

      {/* Session limit alert */}
      <Snackbar
        open={limitAlert}
        autoHideDuration={5000}
        onClose={() => setLimitAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setLimitAlert(false)} variant="filled">
          You have no sessions remaining this month. Upgrade your plan to continue practicing.
        </Alert>
      </Snackbar>
    </Box>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  const router = useRouter();

  return (
    <Box
      className={styles.sessionRow}
      onClick={() => router.push(`/interview/feedback?sessionId=${session.sessionId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/interview/feedback?sessionId=${session.sessionId}`);
        }
      }}
      aria-label={`View session: ${session.parsedSignals?.role ?? 'Interview'}`}
    >
      <Box className={styles.sessionInfo}>
        <Typography className={styles.sessionRole}>
          {session.parsedSignals?.role ?? 'Mock Interview'}
        </Typography>
        <Box className={styles.sessionMeta}>
          <Chip
            label={TYPE_LABELS[session.interviewType] ?? session.interviewType}
            size="small"
            variant="outlined"
          />
          <Chip
            label={STATUS_LABELS[session.status] ?? session.status}
            size="small"
            color={session.status === 'completed' ? 'success' : 'default'}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            {formatDate(session.createdAt)}
          </Typography>
        </Box>
      </Box>
      <Box className={styles.sessionScore}>
        {session.overallScore !== null ? (
          <Typography className={`${styles.scoreValue} ${scoreColor(session.overallScore)}`}>
            {session.overallScore}
          </Typography>
        ) : (
          <Typography className={styles.scoreValue} color="text.secondary">
            —
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
