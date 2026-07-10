'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReplayIcon from '@mui/icons-material/Replay';
import DashboardIcon from '@mui/icons-material/Dashboard';
import type { FeedbackReportResponse } from '@/lib/schemas';
import styles from './feedback.module.scss';

/** Map a 0–100 score to a color tier */
function scoreColor(score: number): 'high' | 'mid' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

/** Plain-English one-liner based on overall score */
function scoreDiagnosis(score: number): string {
  if (score >= 90) return 'Exceptional — you nailed it.';
  if (score >= 80) return 'Strong performance with minor areas to refine.';
  if (score >= 70) return 'Solid foundation — a few targeted improvements will level you up.';
  if (score >= 60) return 'Decent effort — focused practice on weak areas will make a difference.';
  return 'Needs work — review the breakdown and practice the flagged areas.';
}

export default function FeedbackReport({
  report,
}: {
  report: FeedbackReportResponse | null;
}) {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!report) {
    return (
      <Box className={styles.page}>
        <Box className={styles.container}>
          <Typography variant="h5" sx={{ textAlign: 'center', mt: 4 }}>
            No feedback available
          </Typography>
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            Complete an interview session to see your feedback report.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => router.push('/dashboard')}
            >
              Back to dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  if (report.abandoned) {
    return (
      <Box className={styles.page}>
        <Box className={styles.container}>
          <Box className={styles.abandonedBanner} role="alert">
            <WarningAmberIcon className={styles.abandonedIcon} />
            <Box>
              <Typography variant="h6" className={styles.abandonedTitle}>
                Interview abandoned
              </Typography>
              <Typography className={styles.abandonedText}>
                This session was ended early and was not scored. Start a new interview to get a full feedback report.
              </Typography>
            </Box>
          </Box>

          {/* CTAs */}
          <Box className={styles.actions}>
            <Button
              variant="contained"
              startIcon={<ReplayIcon />}
              onClick={() => router.push('/interview/new')}
              className={styles.practiceBtn}
            >
              Start a new interview
            </Button>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => router.push('/dashboard')}
            >
              Back to dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        {/* Overall score */}
        <Box className={styles.scoreHero}>
          <Box className={`${styles.scoreCircle} ${styles[scoreColor(report.overallScore!)]}`}>
            <Typography variant="h2" className={styles.scoreValue}>
              {report.overallScore}
            </Typography>
            <Typography variant="body2" className={styles.scoreLabel}>
              Overall
            </Typography>
          </Box>
          <Typography className={styles.diagnosis}>
            {scoreDiagnosis(report.overallScore!)}
          </Typography>
        </Box>

        {/* Sub-scores */}
        <Box className={styles.subScores} aria-label="Sub-scores">
          <SubScore label="Technical Accuracy" score={report.technicalAccuracyScore!} />
          <SubScore label="Communication" score={report.communicationScore!} />
          <SubScore label="Structure" score={report.structureScore!} />
        </Box>

        {/* Synthesized insight */}
        {report.synthesizedInsight && (
          <Box className={styles.insightCard}>
            <Typography variant="subtitle2" className={styles.insightLabel}>
              Focus on this next time
            </Typography>
            <Typography className={styles.insightText}>
              {report.synthesizedInsight}
            </Typography>
          </Box>
        )}

        {/* Per-question breakdown */}
        <Box className={styles.questionsSection}>
          <Typography variant="h6" className={styles.questionsHeading}>
            Question breakdown
          </Typography>
          {report.questions.map((q, idx) => (
            <Box
              key={idx}
              className={`${styles.questionItem} ${styles[scoreColor(avgScore(q.scores))]}`}
            >
              <Box
                className={styles.questionHeader}
                onClick={() => toggleQuestion(idx)}
                role="button"
                aria-expanded={expandedIndex === idx}
                aria-controls={`question-detail-${idx}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleQuestion(idx);
                  }
                }}
              >
                <Box className={styles.questionHeaderLeft}>
                  <Chip
                    label={q.type}
                    size="small"
                    variant="outlined"
                    className={styles.typeChip}
                  />
                  <Typography className={styles.questionPreview}>
                    {q.text.length > 80 ? q.text.slice(0, 80) + '...' : q.text}
                  </Typography>
                </Box>
                <Box className={styles.questionHeaderRight}>
                  <Typography
                    className={`${styles.questionScore} ${styles[scoreColor(avgScore(q.scores))]}`}
                  >
                    {avgScore(q.scores)}
                  </Typography>
                  <IconButton
                    size="small"
                    className={`${styles.expandIcon} ${expandedIndex === idx ? styles.expanded : ''}`}
                    aria-label={expandedIndex === idx ? 'Collapse' : 'Expand'}
                    tabIndex={-1}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Box>
              </Box>
              <Collapse in={expandedIndex === idx} id={`question-detail-${idx}`}>
                <Box className={styles.questionDetail}>
                  <Typography variant="body2" className={styles.detailLabel}>
                    Your answer
                  </Typography>
                  <Typography className={styles.detailTranscript}>
                    {q.answerTranscript}
                  </Typography>
                  {q.scores && (
                    <Box className={styles.detailScores}>
                      {q.scores.relevance != null && (
                        <MiniScore label="Relevance" value={q.scores.relevance} />
                      )}
                      {q.scores.depth != null && (
                        <MiniScore label="Depth" value={q.scores.depth} />
                      )}
                      {q.scores.clarity != null && (
                        <MiniScore label="Clarity" value={q.scores.clarity} />
                      )}
                    </Box>
                  )}
                  {q.strongAnswerNotes && (
                    <Box className={styles.detailNotes}>
                      <Typography variant="body2" className={styles.detailLabel}>
                        Notes
                      </Typography>
                      <Typography className={styles.notesText}>
                        {q.strongAnswerNotes}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          ))}
        </Box>

        {/* CTAs */}
        <Box className={styles.actions}>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={() => router.push('/interview/new')}
            className={styles.practiceBtn}
          >
            Start a new interview
          </Button>
          <Button
            variant="outlined"
            startIcon={<DashboardIcon />}
            onClick={() => router.push('/dashboard')}
          >
            View all sessions
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SubScore({ label, score }: { label: string; score: number }) {
  return (
    <Box className={`${styles.subScoreCard} ${styles[scoreColor(score)]}`}>
      <Typography className={styles.subScoreValue}>{score}</Typography>
      <Typography className={styles.subScoreLabel}>{label}</Typography>
    </Box>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <Box className={`${styles.miniScore} ${styles[scoreColor(value)]}`}>
      <Typography className={styles.miniScoreValue}>{value}</Typography>
      <Typography className={styles.miniScoreLabel}>{label}</Typography>
    </Box>
  );
}

function avgScore(scores: { relevance?: number; depth?: number; clarity?: number } | null): number {
  if (!scores) return 0;
  const vals = [scores.relevance, scores.depth, scores.clarity].filter(
    (v): v is number => v != null,
  );
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
