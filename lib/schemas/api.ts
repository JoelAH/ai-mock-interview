/**
 * API request/response contracts — Zod schemas for all REST endpoints.
 * These are the formal contracts any client (web, mobile, desktop) must adhere to.
 */
import { z } from 'zod';
import {
  interviewTypeEnum,
  sourceTypeEnum,
  sessionStatusEnum,
  parsedSignalsSchema,
} from './interviewSession';
import { questionTypeEnum, questionScoresSchema } from './interviewQuestion';

// ---------------------------------------------------------------------------
// JD Parse
// ---------------------------------------------------------------------------

export const jdParseRequestSchema = z.object({
  jdText: z.string().min(1, 'Job description text is required'),
  sourceType: sourceTypeEnum,
});
export type JdParseRequest = z.infer<typeof jdParseRequestSchema>;

export const jdParseResponseSchema = z.object({
  sessionId: z.string(),
  parsedSignals: parsedSignalsSchema.unwrap(), // non-nullable in response
  interviewType: interviewTypeEnum,
  estimatedMinutes: z.number().int().positive(),
});
export type JdParseResponse = z.infer<typeof jdParseResponseSchema>;

// ---------------------------------------------------------------------------
// Session Turn
// ---------------------------------------------------------------------------

export const sessionTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  transcript: z.string().min(1, 'Transcript cannot be empty'),
});
export type SessionTurnRequest = z.infer<typeof sessionTurnRequestSchema>;

/** A single chunk in the streaming turn response */
export const turnChunkSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('question'),
    text: z.string(),
    questionType: questionTypeEnum,
    isFollowUp: z.boolean(),
  }),
  z.object({
    type: z.literal('decision'),
    action: z.enum(['probe', 'advance', 'rescue', 'end']),
  }),
  z.object({
    type: z.literal('audio'),
    /** base64-encoded audio chunk */
    data: z.string(),
  }),
  z.object({
    type: z.literal('done'),
    questionOrder: z.number().int(),
  }),
]);
export type TurnChunk = z.infer<typeof turnChunkSchema>;

export const sessionTurnResponseSchema = z.object({
  questionText: z.string(),
  questionType: questionTypeEnum,
  isFollowUp: z.boolean(),
  questionOrder: z.number().int(),
  action: z.enum(['probe', 'advance', 'rescue', 'end']),
});
export type SessionTurnResponse = z.infer<typeof sessionTurnResponseSchema>;

// ---------------------------------------------------------------------------
// Session Status
// ---------------------------------------------------------------------------

export const sessionStatusResponseSchema = z.object({
  sessionId: z.string(),
  status: sessionStatusEnum,
  currentQuestionOrder: z.number().int(),
  totalQuestions: z.number().int(),
  interviewType: interviewTypeEnum,
});
export type SessionStatusResponse = z.infer<typeof sessionStatusResponseSchema>;

// ---------------------------------------------------------------------------
// Feedback Report
// ---------------------------------------------------------------------------

export const feedbackReportResponseSchema = z.object({
  sessionId: z.string(),
  overallScore: z.number().min(0).max(100),
  technicalAccuracyScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  structureScore: z.number().min(0).max(100),
  synthesizedInsight: z.string(),
  diagnosis: z.string(),
  questions: z.array(
    z.object({
      text: z.string(),
      type: questionTypeEnum,
      order: z.number().int(),
      isFollowUp: z.boolean(),
      answerTranscript: z.string(),
      scores: questionScoresSchema,
      strongAnswerNotes: z.string(),
    }),
  ),
});
export type FeedbackReportResponse = z.infer<typeof feedbackReportResponseSchema>;

// ---------------------------------------------------------------------------
// Dashboard / Session History
// ---------------------------------------------------------------------------

export const sessionSummarySchema = z.object({
  sessionId: z.string(),
  interviewType: interviewTypeEnum,
  status: sessionStatusEnum,
  overallScore: z.number().min(0).max(100).nullable(),
  createdAt: z.string().datetime(),
  parsedSignals: parsedSignalsSchema,
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const dashboardResponseSchema = z.object({
  sessions: z.array(sessionSummarySchema),
  totalSessions: z.number().int(),
  averageScore: z.number().nullable(),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
