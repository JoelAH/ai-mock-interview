'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import styles from './session.module.scss';

/**
 * Interview turn states:
 * - loading: fetching the first question from the API
 * - asking: interviewer is presenting the question (TTS playback)
 * - listening: user is speaking (live transcript building)
 * - thinking: interviewer is processing (API call in progress)
 * - done: session complete
 */
type TurnPhase = 'loading' | 'asking' | 'listening' | 'thinking' | 'done';

/** Simulated delay for the "asking" phase while TTS plays (fallback) */
const ASKING_DELAY = 2000;

interface CurrentQuestion {
  text: string;
  type: string;
  isFollowUp: boolean;
  order: number;
}

export default function InterviewSession() {
  const router = useRouter();
  const [phase, setPhase] = useState<TurnPhase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(4); // estimate, updated as we go
  const [transcript, setTranscript] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef('');

  const progress = ((questionIndex + (phase === 'done' ? 1 : 0)) / totalQuestions) * 100;

  // Load sessionId from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('session-id');
    if (!stored) {
      setError('No active session found. Please start a new interview.');
      return;
    }
    setSessionId(stored);
  }, []);

  // Start the session — fetch the first question
  useEffect(() => {
    if (!sessionId) return;

    const startSession = async () => {
      try {
        const response = await fetch('/api/session/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, transcript: '__START__' }),
        });

        if (!response.ok) {
          throw new Error(`Failed to start session: ${response.status}`);
        }

        await processSSEResponse(response);
      } catch (err) {
        console.error('[InterviewSession] Failed to start:', err);
        setError('Failed to start interview session. Please try again.');
      }
    };

    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Process SSE streaming response from the turn API
  const processSSEResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const chunk = JSON.parse(data);

          if (chunk.type === 'question') {
            setCurrentQuestion({
              text: chunk.text,
              type: chunk.questionType,
              isFollowUp: chunk.isFollowUp,
              order: chunk.questionOrder ?? questionIndex,
            });
            setPhase('asking');
          } else if (chunk.type === 'decision' && chunk.action === 'end') {
            setPhase('done');
            return;
          } else if (chunk.type === 'done') {
            setQuestionIndex(chunk.questionOrder);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  };

  // Simulate "asking" phase — auto-transition to listening after delay
  // In full implementation, this would wait for TTS playback to finish
  useEffect(() => {
    if (phase !== 'asking') return;

    const timer = setTimeout(() => {
      setPhase('listening');
      setTranscript('');
      transcriptRef.current = '';
    }, ASKING_DELAY);

    return () => clearTimeout(timer);
  }, [phase, currentQuestion]);

  // Handle user finishing their answer
  const handleDoneAnswering = useCallback(async () => {
    if (!sessionId) return;

    const userTranscript = transcriptRef.current || transcript || '(no response)';
    setPhase('thinking');

    try {
      const response = await fetch('/api/session/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, transcript: userTranscript }),
      });

      if (!response.ok) {
        throw new Error(`Turn API error: ${response.status}`);
      }

      await processSSEResponse(response);
    } catch (err) {
      console.error('[InterviewSession] Turn error:', err);
      setError('Something went wrong processing your answer. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, transcript]);

  const handleViewFeedback = () => {
    router.push(`/interview/feedback?sessionId=${sessionId}`);
  };

  const handleEndInterview = async () => {
    // Mark session as abandoned via API, then redirect to dashboard
    if (sessionId) {
      try {
        await fetch('/api/session/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, transcript: '__ABANDON__' }),
        });
      } catch {
        // Best-effort — still navigate away
      }
    }
    router.push('/dashboard');
  };

  // Handle transcript updates from STT (or manual typing for now)
  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
    transcriptRef.current = text;
  };

  if (error) {
    return (
      <Box className={styles.page}>
        <Box className={styles.container}>
          <Typography variant="h6" color="error" sx={{ textAlign: 'center', mt: 4 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button variant="outlined" onClick={() => router.push('/interview/new')}>
              Start over
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        {/* Progress header */}
        <Box className={styles.header} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Question {questionIndex + 1}{totalQuestions > 0 ? ` of ~${totalQuestions}` : ''}
          </Typography>
          {phase !== 'done' && phase !== 'loading' && (
            <Button
              variant="text"
              size="small"
              startIcon={<CloseIcon />}
              onClick={handleEndInterview}
              sx={{ color: 'text.secondary' }}
              aria-label="End interview early"
            >
              End interview
            </Button>
          )}
          <LinearProgress
            variant="determinate"
            value={Math.min(progress, 100)}
            className={styles.progressBar}
            aria-label="Interview progress"
          />
        </Box>

        {/* Main content area */}
        <Box className={styles.content}>
          {phase === 'loading' && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">Preparing your interview...</Typography>
            </Box>
          )}

          {phase === 'done' ? (
            <Box className={styles.doneCard}>
              <DoneIcon className={styles.doneIcon} />
              <Typography variant="h5" className={styles.doneTitle}>
                Interview complete
              </Typography>
              <Typography color="text.secondary" className={styles.doneSubtitle}>
                Great work! Your responses are being scored. View your feedback report to see how
                you did.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleViewFeedback}
                className={styles.feedbackBtn}
              >
                View feedback
              </Button>
            </Box>
          ) : currentQuestion && phase !== 'loading' ? (
            <>
              {/* Question display */}
              <Box className={styles.questionCard}>
                <Box className={styles.questionMeta}>
                  <Chip
                    label={currentQuestion.type}
                    size="small"
                    color={currentQuestion.isFollowUp ? 'secondary' : 'default'}
                    variant="outlined"
                  />
                  {currentQuestion.isFollowUp && (
                    <Chip label="Follow-up" size="small" color="secondary" variant="filled" />
                  )}
                </Box>
                <Typography variant="h6" className={styles.questionText}>
                  {currentQuestion.text}
                </Typography>
              </Box>

              {/* Phase indicator */}
              <Box className={styles.phaseIndicator} aria-live="polite">
                {phase === 'asking' && (
                  <Box className={styles.statusBadge} data-phase="asking">
                    <span className={styles.pulsingDot} />
                    <Typography variant="body2">Interviewer is speaking...</Typography>
                  </Box>
                )}
                {phase === 'listening' && (
                  <Box className={styles.statusBadge} data-phase="listening">
                    <MicIcon fontSize="small" className={styles.micIcon} />
                    <Typography variant="body2">Listening to your answer...</Typography>
                  </Box>
                )}
                {phase === 'thinking' && (
                  <Box className={styles.statusBadge} data-phase="thinking">
                    <span className={styles.pulsingDot} />
                    <Typography variant="body2">Interviewer is thinking...</Typography>
                  </Box>
                )}
              </Box>

              {/* Live transcript */}
              {(phase === 'listening' || phase === 'thinking') && (
                <Box className={styles.transcriptCard} aria-label="Your answer transcript">
                  <Typography variant="body2" color="text.secondary" className={styles.transcriptLabel}>
                    Your answer
                  </Typography>
                  <Typography className={styles.transcriptText}>
                    {transcript}
                    {phase === 'listening' && <span className={styles.cursor} />}
                  </Typography>
                </Box>
              )}

              {/* Done answering control */}
              {phase === 'listening' && (
                <Box className={styles.controls}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<StopIcon />}
                    onClick={handleDoneAnswering}
                    className={styles.doneBtn}
                    aria-label="Done answering"
                  >
                    Done answering
                  </Button>
                </Box>
              )}
            </>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
