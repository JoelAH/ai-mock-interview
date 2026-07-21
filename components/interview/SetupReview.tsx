'use client';

import { useEffect, useState, useRef } from 'react';
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
import { trackInterviewStartClicked } from '@/lib/analytics';
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
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

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

        // Build the JD text to send to the parser
        let jdText = payload.jdText;

        if (payload.sourceType === 'preset') {
          // Build a synthetic JD with role-appropriate culture & focus areas
          // so the LLM has meaningful context to extract from
          jdText = buildPresetJdText(
            payload.role ?? payload.jdText,
            payload.level ?? 'Mid-level',
            payload.tech ?? [],
          );
        }

        // Call the JD parse API (which respects USE_MOCKS internally)
        const response = await fetch('/api/jd/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jdText,
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
            onClick={() => {
              trackInterviewStartClicked(interviewType);
              router.push('/mic-check');
            }}
            className={styles.submitBtn}
          >
            Start interview
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Preset JD builder — generates a synthetic JD with role-appropriate
// culture signals and focus areas so the LLM parser produces rich results.
// ---------------------------------------------------------------------------

/** Culture signals by seniority level */
const CULTURE_BY_LEVEL: Record<string, string[]> = {
  Junior: ['structured onboarding', 'growth-oriented', 'collaborative', 'learning culture', 'supportive team'],
  Intermediate: ['ownership', 'collaboration', 'continuous improvement', 'autonomy', 'iterative delivery'],
  Senior: ['technical leadership', 'mentoring others', 'cross-team collaboration', 'high standards', 'ownership'],
  Staff: ['technical vision', 'organizational influence', 'mentoring others', 'strategic thinking', 'driving alignment across teams'],
};

/** Focus areas by role */
const FOCUS_BY_ROLE: Record<string, string[]> = {
  'Frontend Engineer': ['UI/UX implementation', 'performance optimization', 'accessibility', 'component architecture', 'state management', 'responsive design'],
  'Backend Engineer': ['API design', 'data modeling', 'scalability', 'reliability', 'security', 'concurrency and async patterns'],
  'Full-Stack Engineer': ['end-to-end feature delivery', 'API design', 'frontend architecture', 'database design', 'system integration'],
  'Engineering Manager': ['team leadership', 'project delivery', 'hiring and talent development', 'technical strategy', 'stakeholder management', 'performance management'],
  'DevOps / SRE': ['infrastructure automation', 'observability', 'incident response', 'CI/CD pipelines', 'reliability', 'capacity planning'],
  'Platform Engineer': ['developer experience', 'infrastructure abstraction', 'scalability', 'internal tooling', 'CI/CD', 'platform reliability'],
  'QA Engineer': ['test strategy', 'automation frameworks', 'quality metrics', 'CI integration', 'regression testing', 'risk assessment'],
};

/** Senior+ levels get additional focus areas reflecting broader scope */
const SENIOR_FOCUS_EXTRAS = ['architecture design', 'technical tradeoffs', 'system design'];
const STAFF_FOCUS_EXTRAS = ['architecture design', 'technical tradeoffs', 'system design', 'technical roadmapping', 'cross-org alignment'];

function buildPresetJdText(role: string, level: string, tech: string[]): string {
  const culture = CULTURE_BY_LEVEL[level] ?? CULTURE_BY_LEVEL['Intermediate'];
  let focusAreas = FOCUS_BY_ROLE[role] ?? ['problem solving', 'code quality', 'collaboration'];

  // Senior+ roles get architecture/tradeoffs; Staff gets broader strategic extras
  if (level === 'Staff') {
    focusAreas = [...focusAreas, ...STAFF_FOCUS_EXTRAS.filter((f) => !focusAreas.includes(f))];
  } else if (level === 'Senior') {
    focusAreas = [...focusAreas, ...SENIOR_FOCUS_EXTRAS.filter((f) => !focusAreas.includes(f))];
  }

  const lines = [
    `Role: ${level} ${role}`,
    `Seniority: ${level}`,
    '',
    `We are looking for a ${level} ${role} to join our team.`,
    '',
    `Culture and values: ${culture.join(', ')}.`,
    '',
    `Key focus areas: ${focusAreas.join(', ')}.`,
  ];

  if (tech.length > 0) {
    lines.push('', `Required technologies: ${tech.join(', ')}.`);
  }

  return lines.join('\n');
}
