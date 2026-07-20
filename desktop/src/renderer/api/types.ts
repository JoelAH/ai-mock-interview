/**
 * API request/response types for the DevMockView backend.
 * These mirror the Zod schemas in lib/schemas/api.ts on the server.
 */

// ---------------------------------------------------------------------------
// Shared Enums / Primitives
// ---------------------------------------------------------------------------

export type SourceType = 'paste' | 'preset';
export type InterviewType = 'behavioral' | 'technical' | 'architectural' | 'mix';
export type SessionStatus = 'setup' | 'in_progress' | 'completed' | 'abandoned';
export type QuestionType = 'behavioral' | 'architectural' | 'follow_up' | 'rescue';
export type TurnAction = 'probe' | 'advance' | 'rescue' | 'end';

export interface ParsedSignals {
  role: string;
  seniority: string;
  stack: string[];
  culture: string[];
  focusAreas: string[];
}

export interface QuestionScores {
  relevance?: number;
  depth?: number;
  clarity?: number;
}

// ---------------------------------------------------------------------------
// JD Parse — POST /api/jd/parse
// ---------------------------------------------------------------------------

export interface JdParseRequest {
  jdText: string;
  sourceType: SourceType;
}

export interface JdParseResponse {
  sessionId: string;
  parsedSignals: ParsedSignals;
  interviewType: InterviewType;
  estimatedMinutes: number;
}

// ---------------------------------------------------------------------------
// Session Turn — POST /api/session/turn (SSE streaming)
// ---------------------------------------------------------------------------

export interface SessionTurnRequest {
  sessionId: string;
  transcript: string; // Use '__START__' to initiate, '__ABANDON__' to abandon
}

/** Discriminated union for SSE chunks from /api/session/turn */
export type TurnChunk =
  | { type: 'question'; text: string; questionType: QuestionType; isFollowUp: boolean }
  | { type: 'decision'; action: TurnAction }
  | { type: 'audio'; data: string }
  | { type: 'done'; questionOrder: number }
  | { type: 'error'; message: string };

// ---------------------------------------------------------------------------
// TTS — POST /api/session/tts
// ---------------------------------------------------------------------------

export interface TtsRequest {
  text: string;
}

// Response is a binary audio stream (audio/mpeg or audio/opus)

// ---------------------------------------------------------------------------
// Feedback — POST /api/session/feedback
// ---------------------------------------------------------------------------

export interface FeedbackRequest {
  sessionId: string;
}

export interface FeedbackQuestion {
  text: string;
  type: QuestionType;
  order: number;
  isFollowUp: boolean;
  answerTranscript: string;
  scores: QuestionScores | null;
  strongAnswerNotes: string;
}

export interface FeedbackReportResponse {
  sessionId: string;
  abandoned: boolean;
  overallScore: number | null;
  technicalAccuracyScore: number | null;
  communicationScore: number | null;
  structureScore: number | null;
  synthesizedInsight: string | null;
  diagnosis: string | null;
  questions: FeedbackQuestion[];
}

// ---------------------------------------------------------------------------
// Deepgram Token — POST /api/deepgram/token
// ---------------------------------------------------------------------------

export interface DeepgramTokenResponse {
  token: string;
  url: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Billing Status — GET /api/billing/status
// ---------------------------------------------------------------------------

export interface BillingStatusResponse {
  tier: 'free' | 'starter' | 'pro' | 'premium';
  status: 'none' | 'active' | 'cancelled' | 'past_due' | 'paused';
}

// ---------------------------------------------------------------------------
// API Error shape
// ---------------------------------------------------------------------------

export interface ApiError {
  error: string;
  issues?: Array<{ message: string; path: (string | number)[] }>;
}
