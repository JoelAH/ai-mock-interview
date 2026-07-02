'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DoneIcon from '@mui/icons-material/Done';
import { mockQuestions } from '@/lib/mock';
import styles from './session.module.scss';

/**
 * Interview turn states:
 * - asking: interviewer is presenting the question (simulated TTS delay)
 * - listening: user is speaking (live transcript building)
 * - thinking: interviewer is processing (simulated LLM delay)
 * - done: all questions exhausted, session complete
 */
type TurnPhase = 'asking' | 'listening' | 'thinking' | 'done';

/** Simulated delay durations (ms) */
const ASKING_DELAY = 2000;
const THINKING_DELAY = 1500;

export default function InterviewSession() {
  const router = useRouter();
  const [phase, setPhase] = useState<TurnPhase>('asking');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [displayedTranscript, setDisplayedTranscript] = useState('');

  const currentQuestion = mockQuestions[questionIndex];
  const totalQuestions = mockQuestions.length;
  const progress = ((questionIndex + (phase === 'done' ? 1 : 0)) / totalQuestions) * 100;

  // Simulate "asking" phase — auto-transition to listening after delay
  useEffect(() => {
    if (phase !== 'asking') return;

    const timer = setTimeout(() => {
      setPhase('listening');
    }, ASKING_DELAY);

    return () => clearTimeout(timer);
  }, [phase, questionIndex]);

  // Simulate live transcript building during listening
  useEffect(() => {
    if (phase !== 'listening') return;

    const mockAnswer = currentQuestion.answerTranscript;
    let charIndex = 0;
    setDisplayedTranscript('');

    const interval = setInterval(() => {
      charIndex += 3;
      if (charIndex >= mockAnswer.length) {
        setDisplayedTranscript(mockAnswer);
        clearInterval(interval);
      } else {
        setDisplayedTranscript(mockAnswer.slice(0, charIndex));
      }
    }, 30);

    return () => clearInterval(interval);
  }, [phase, currentQuestion]);

  const handleDoneAnswering = useCallback(() => {
    setTranscript(currentQuestion.answerTranscript);
    setPhase('thinking');

    // Simulate LLM thinking, then advance
    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= totalQuestions) {
        setPhase('done');
      } else {
        setQuestionIndex(nextIndex);
        setTranscript('');
        setDisplayedTranscript('');
        setPhase('asking');
      }
    }, THINKING_DELAY);
  }, [questionIndex, totalQuestions, currentQuestion]);

  const handleViewFeedback = () => {
    router.push('/interview/feedback');
  };

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        {/* Progress header */}
        <Box className={styles.header}>
          <Typography variant="body2" color="text.secondary">
            Question {Math.min(questionIndex + 1, totalQuestions)} of {totalQuestions}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            className={styles.progressBar}
            aria-label="Interview progress"
          />
        </Box>

        {/* Main content area */}
        <Box className={styles.content}>
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
          ) : (
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
                    {phase === 'thinking' ? transcript : displayedTranscript}
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
          )}
        </Box>
      </Box>
    </Box>
  );
}
