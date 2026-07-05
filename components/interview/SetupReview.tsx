'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WorkIcon from '@mui/icons-material/Work';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CodeIcon from '@mui/icons-material/Code';
import GroupsIcon from '@mui/icons-material/Groups';
import TimerIcon from '@mui/icons-material/Timer';
import CategoryIcon from '@mui/icons-material/Category';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { JdParseResponse } from '@/lib/schemas';
import styles from './setup.module.scss';

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  architectural: 'Architectural',
  mix: 'Mixed (Behavioral + Technical + Architectural)',
};

export default function SetupReview() {
  const router = useRouter();
  const [data, setData] = useState<JdParseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parseJd = async () => {
      // Read the JD input stored by JdInput component
      const stored = sessionStorage.getItem('jd-input');
      if (!stored) {
        setError('No job description found. Please go back and enter one.');
        setLoading(false);
        return;
      }

      try {
        const payload = JSON.parse(stored);

        // Call the JD parse API (which respects USE_MOCKS internally)
        const response = await fetch('/api/jd/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jdText: payload.jdText,
            sourceType: payload.sourceType,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Request failed: ${response.status}`);
        }

        const result: JdParseResponse = await response.json();

        // Store the session ID for the interview session to use
        sessionStorage.setItem('session-id', result.sessionId);
        setData(result);
      } catch (err) {
        console.error('[SetupReview] Parse error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to parse job description. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    parseJd();
  }, []);

  if (loading) {
    return (
      <Box className={styles.page}>
        <Paper className={styles.card} sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={40} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Analyzing job description...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box className={styles.page}>
        <Paper className={styles.card} sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="error" gutterBottom>
            {error ?? 'Something went wrong'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/interview/new')}
          >
            Go back
          </Button>
        </Paper>
      </Box>
    );
  }

  const { parsedSignals, interviewType, estimatedMinutes } = data;

  return (
    <Box className={styles.page}>
      <Paper className={styles.card}>
        <Typography variant="h4" className={styles.heading}>
          Interview setup
        </Typography>
        <Typography color="text.secondary" className={styles.subheading}>
          Here&apos;s what we extracted from the job description. Review the details and start when
          you&apos;re ready.
        </Typography>

        <List className={styles.signalList} aria-label="Parsed interview signals">
          <ListItem>
            <ListItemIcon>
              <WorkIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Role" secondary={parsedSignals.role} />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <TrendingUpIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Seniority" secondary={parsedSignals.seniority} />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CodeIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Tech stack"
              slotProps={{ secondary: { component: 'div' } }}
              secondary={
                <Box className={styles.chipRow} component="span">
                  {parsedSignals.stack.map((tech) => (
                    <Chip key={tech} label={tech} size="small" variant="outlined" />
                  ))}
                </Box>
              }
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <GroupsIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Culture signals"
              slotProps={{ secondary: { component: 'div' } }}
              secondary={
                <Box className={styles.chipRow} component="span">
                  {parsedSignals.culture.map((val) => (
                    <Chip key={val} label={val} size="small" variant="outlined" />
                  ))}
                </Box>
              }
            />
          </ListItem>

          <Divider component="li" />

          <ListItem>
            <ListItemIcon>
              <CategoryIcon color="secondary" />
            </ListItemIcon>
            <ListItemText
              primary="Interview type"
              secondary={INTERVIEW_TYPE_LABELS[interviewType] ?? interviewType}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <TimerIcon color="secondary" />
            </ListItemIcon>
            <ListItemText primary="Estimated duration" secondary={`~${estimatedMinutes} minutes`} />
          </ListItem>
        </List>

        {parsedSignals.focusAreas.length > 0 && (
          <Box className={styles.focusSection}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Focus areas
            </Typography>
            <Box className={styles.chipRow}>
              {parsedSignals.focusAreas.map((area) => (
                <Chip key={area} label={area} size="small" color="secondary" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        <Box className={styles.actions}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/interview/new')}
          >
            Back
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={() => router.push('/mic-check')}
            className={styles.submitBtn}
          >
            Start interview
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
