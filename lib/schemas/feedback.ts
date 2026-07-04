/**
 * LLM structured output schemas for feedback scoring.
 *
 * Two schemas:
 * 1. answerScoringResultSchema — scores a single answer (called silently after each turn)
 * 2. reportGenerationResultSchema — scores the full session and synthesizes insight
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Per-answer scoring (background, never surfaced mid-interview)
// ---------------------------------------------------------------------------

export const answerScoringResultSchema = z.object({
  /** Relevance to the question asked (0-100) */
  relevance: z.number().min(0).max(100),
  /** Depth of the answer — specifics, numbers, tradeoffs (0-100) */
  depth: z.number().min(0).max(100),
  /** Clarity of communication (0-100) */
  clarity: z.number().min(0).max(100),
  /** Brief notes on what a strong answer would include (for the feedback report) */
  strongAnswerNotes: z.string(),
});

export type AnswerScoringResult = z.infer<typeof answerScoringResultSchema>;

/** Schema name for mock registration / OpenAI structured output */
export const ANSWER_SCORING_SCHEMA_NAME = 'answer_scoring';

// ---------------------------------------------------------------------------
// Full report generation (called once at session end)
// ---------------------------------------------------------------------------

export const reportGenerationResultSchema = z.object({
  /** Overall score aggregated from all answers (0-100) */
  overallScore: z.number().min(0).max(100),
  /** Technical accuracy / domain knowledge score (0-100) */
  technicalAccuracyScore: z.number().min(0).max(100),
  /** Communication and articulation score (0-100) */
  communicationScore: z.number().min(0).max(100),
  /** Answer structure and organization score (0-100) */
  structureScore: z.number().min(0).max(100),
  /** One-line plain-English diagnosis of overall performance */
  diagnosis: z.string(),
  /** Actionable synthesized insight — "focus on this next time" */
  synthesizedInsight: z.string(),
});

export type ReportGenerationResult = z.infer<typeof reportGenerationResultSchema>;

/** Schema name for mock registration / OpenAI structured output */
export const REPORT_GENERATION_SCHEMA_NAME = 'report_generation';
