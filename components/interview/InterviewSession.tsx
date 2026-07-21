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
import { useTTS } from '@/hooks/useTTS';
import { useSTT } from '@/hooks/useSTT';
import { trackInterviewStarted, trackInterviewCompleted, trackInterviewAbandoned } from '@/lib/analytics';
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

/** Fallback timeout if TTS fails — ensures the interview can still proceed */
const TTS_FALLBACK_TIMEOUT = 15000;

interface CurrentQuestion {
  text: string;
  type: string;
  isFollowUp: boolean;
  order: number;
}

/** Format a question type string for display (e.g. 'follow_up' → 'Follow-up', 'architectural' → 'Architectural') */
function formatQuestionType(type: string): string {
  if (type === 'follow_up') return 'Follow-up';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

export default function InterviewSession() {
  const router = useRouter();
  const [phase, setPhase] = useState<TurnPhase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionsAsked, setQuestionsAsked] = useState(0); // actual count so far
  const [transcript, setTranscript] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const transcriptRef = useRef('');
  const phaseRef = useRef<TurnPhase>('loading');
  const isLastQuestionRef = useRef(false);

  // Keep phaseRef in sync for use inside callbacks
  phaseRef.current = phase;

  const progress = phase === 'done' ? 100 : 0; // no bar until done — question count is unpredictable

  // Ref to hold the TTS fallback timer so onPlaybackStart can cancel it
  const ttsFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- TTS hook: plays the question audio during "asking" phase ----
  const { speak, stop: stopTTS } = useTTS({
    onDone: () => {
      // Only transition if we're still in the asking phase
      if (phaseRef.current === 'asking') {
        setPhase('listening');
        setTranscript('');
        transcriptRef.current = '';
        sttRef.current?.start();
      }
    },
    onPlaybackStart: () => {
      // Audio is actually playing — cancel the fallback timer
      if (ttsFallbackRef.current) {
        clearTimeout(ttsFallbackRef.current);
        ttsFallbackRef.current = null;
      }
    },
    onError: (err) => {
      console.error('[InterviewSession] TTS error:', err);
    },
  });

  // ---- STT hook: captures speech during "listening" phase ----
  const { start: startSTT, stop: stopSTT, getTranscript } = useSTT({
    onTranscript: (text) => {
      setTranscript(text);
      transcriptRef.current = text;
    },
    onError: (err) => {
      console.error('[InterviewSession] STT error:', err);
    },
  });

  // Store STT methods in a ref so TTS onDone can call start
  const sttRef = useRef({ start: startSTT, stop: stopSTT, getTranscript });
  sttRef.current = { start: startSTT, stop: stopSTT, getTranscript };

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

        trackInterviewStarted(sessionId);
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
            setQuestionsAsked((prev) => prev + 1);
            // Ensure follow-up questions are labeled correctly regardless of what
            // the server sends for questionType (defensive — server should fix this too)
            const displayType = chunk.isFollowUp ? 'follow_up' : chunk.questionType;
            setCurrentQuestion({
              text: chunk.text,
              type: displayType,
              isFollowUp: chunk.isFollowUp,
              order: chunk.questionOrder ?? questionIndex,
            });
            setPhase('asking');
          } else if (chunk.type === 'decision' && chunk.action === 'end') {
            // Mark this as the last question — the user should still see and
            // answer the closing question before we transition to 'done'.
            setIsLastQuestion(true);
            isLastQuestionRef.current = true;
          } else if (chunk.type === 'done') {
            setQuestionIndex(chunk.questionOrder);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  };

  // Play question audio via TTS when entering "asking" phase
  useEffect(() => {
    if (phase !== 'asking' || !currentQuestion) return;

    speak(currentQuestion.text);

    // Fallback: if TTS never starts playing within the timeout, force transition.
    // Once audio playback begins, onPlaybackStart cancels this timer.
    const fallback = setTimeout(() => {
      if (phaseRef.current === 'asking') {
        console.warn('[InterviewSession] TTS fallback timeout — moving to listening');
        stopTTS();
        setPhase('listening');
        setTranscript('');
        transcriptRef.current = '';
        sttRef.current.start();
      }
    }, TTS_FALLBACK_TIMEOUT);
    ttsFallbackRef.current = fallback;

    return () => {
      clearTimeout(fallback);
      ttsFallbackRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQuestion]);

  // Handle user finishing their answer
  const handleDoneAnswering = useCallback(async () => {
    if (!sessionId) return;

    // Stop STT and capture final transcript
    sttRef.current.stop();
    const userTranscript = transcriptRef.current || transcript || '(no response)';

    // If this was the last question, save the answer and end
    if (isLastQuestionRef.current) {
      setPhase('thinking');
      try {
        // Send the final answer to be persisted (the server already marked
        // the session as completed, but we still need to save this answer)
        const response = await fetch('/api/session/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, transcript: userTranscript }),
        });

        if (response.ok) {
          // Consume the stream — the server will persist the answer
          // and return an 'end' action again (which we can ignore)
          const reader = response.body?.getReader();
          if (reader) {
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          }
        }
      } catch {
        // Best-effort — still transition to done
      }
      trackInterviewCompleted(sessionId, questionsAsked);
      setPhase('done');
      return;
    }

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
    // Stop any active audio
    stopTTS();
    sttRef.current.stop();

    trackInterviewAbandoned(sessionId!, questionsAsked);

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
            Question {questionsAsked}
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
                  {/* Show the question type, formatted nicely. If it's a follow-up,
                      the type IS "Follow-up" so we don't need a separate chip. */}
                  <Chip
                    label={formatQuestionType(currentQuestion.type)}
                    size="small"
                    color={currentQuestion.isFollowUp ? 'secondary' : 'default'}
                    variant={currentQuestion.isFollowUp ? 'filled' : 'outlined'}
                  />
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
