/**
 * Mock fixtures for development and testing.
 * All fixtures conform to the Zod schemas defined in /lib/schemas.
 */
import type { ParsedSignals, InterviewSessionDTO, InterviewQuestionDTO, FeedbackReportDTO } from '@/lib/schemas';
import type {
  JdParseResponse,
  SessionTurnResponse,
  FeedbackReportResponse,
  SessionSummary,
  DashboardResponse,
} from '@/lib/schemas';

// ---------------------------------------------------------------------------
// Raw JD text (sample)
// ---------------------------------------------------------------------------

export const mockJdText = `
Senior Software Engineer — Payments Platform

About the Role:
We're looking for a Senior Software Engineer to join our Payments Platform team.
You'll design, build, and operate services that process millions of transactions daily.

Requirements:
- 5+ years of professional software engineering experience
- Strong experience with distributed systems and microservices
- Proficiency in TypeScript/Node.js or Go
- Experience with event-driven architectures (Kafka, SQS)
- Familiarity with payment systems (Stripe, Adyen) is a plus
- Bachelor's degree in CS or equivalent experience

Culture:
- We value ownership and bias for action
- Collaborative, low-ego environment
- Strong emphasis on code quality and testing
- Remote-first with async communication
`.trim();

// ---------------------------------------------------------------------------
// Parsed signals (output of JD parsing)
// ---------------------------------------------------------------------------

export const mockParsedSignals: ParsedSignals = {
  role: 'Senior Software Engineer — Payments Platform',
  seniority: 'Senior (5+ years)',
  stack: ['TypeScript', 'Node.js', 'Go', 'Kafka', 'SQS', 'Stripe', 'Adyen'],
  culture: ['ownership', 'bias for action', 'collaborative', 'low-ego', 'code quality', 'remote-first'],
  focusAreas: ['distributed systems', 'microservices', 'event-driven architectures', 'payment systems'],
};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export const mockSessionId = '6651a2b3c4d5e6f7a8b9c0d1';
export const mockUserId = '6651a2b3c4d5e6f7a8b9c0d0';

export const mockSession: InterviewSessionDTO = {
  userId: mockUserId,
  sourceType: 'paste',
  jdText: mockJdText,
  parsedSignals: mockParsedSignals,
  interviewType: 'mix',
  status: 'completed',
  overallScore: 76,
};

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const mockQuestions: InterviewQuestionDTO[] = [
  {
    sessionId: mockSessionId,
    text: 'Tell me about a time you designed a system that needed to handle high throughput. What tradeoffs did you make?',
    type: 'architectural',
    order: 0,
    isFollowUp: false,
    answerTranscript:
      'At my previous company, I redesigned the notification pipeline to handle 50k messages per second. We moved from a synchronous REST approach to an event-driven architecture using Kafka. The main tradeoff was eventual consistency — we accepted that notifications might be slightly delayed in exchange for much higher throughput and better fault tolerance.',
    scores: { relevance: 85, depth: 78, clarity: 80 },
    strongAnswerNotes: 'Good use of concrete numbers and clear articulation of the tradeoff.',
  },
  {
    sessionId: mockSessionId,
    text: 'How did you handle failures in that event-driven pipeline?',
    type: 'follow_up',
    order: 1,
    isFollowUp: true,
    answerTranscript:
      'We implemented a dead-letter queue pattern. Failed messages went to a DLQ after 3 retries with exponential backoff. We had an alerting system that would page on-call if the DLQ depth exceeded a threshold. For critical payment notifications, we also had a synchronous fallback path.',
    scores: { relevance: 90, depth: 82, clarity: 85 },
    strongAnswerNotes: 'Excellent specifics on retry strategy and the fallback approach shows mature thinking.',
  },
  {
    sessionId: mockSessionId,
    text: 'Describe a situation where you had a disagreement with a teammate about a technical decision. How did you resolve it?',
    type: 'behavioral',
    order: 2,
    isFollowUp: false,
    answerTranscript:
      'I had a disagreement with a colleague about whether to use GraphQL or REST for a new internal API. I suggested we each write a short RFC outlining pros and cons for our specific use case. After reviewing both, we realized GraphQL would add complexity we didn\'t need since we had a single consumer. We went with REST and it was the right call.',
    scores: { relevance: 80, depth: 65, clarity: 88 },
    strongAnswerNotes: 'Good collaborative approach but could add more about the interpersonal dynamics.',
  },
  {
    sessionId: mockSessionId,
    text: 'You mentioned the notification pipeline — how would you scale it to 10x the current load?',
    type: 'architectural',
    order: 3,
    isFollowUp: false,
    answerTranscript:
      'I would add more Kafka partitions and scale consumers horizontally. I\'d also consider adding a caching layer for deduplication, and potentially splitting the pipeline by priority — critical payment notifications on a fast path, marketing notifications on a bulk path with batching.',
    scores: { relevance: 75, depth: 70, clarity: 72 },
    strongAnswerNotes: 'Reasonable approach but lacks detail on monitoring, capacity planning, or load testing strategy.',
  },
];

// ---------------------------------------------------------------------------
// Feedback report
// ---------------------------------------------------------------------------

export const mockFeedbackReport: FeedbackReportDTO = {
  sessionId: mockSessionId,
  overallScore: 76,
  technicalAccuracyScore: 82,
  communicationScore: 78,
  structureScore: 68,
  synthesizedInsight:
    'You demonstrate strong technical knowledge, especially in distributed systems and event-driven architecture. Your answers are technically accurate but could benefit from more structured delivery — consider using the STAR method to organize behavioral responses, and explicitly stating assumptions before diving into architectural solutions.',
};

// ---------------------------------------------------------------------------
// API response fixtures (matching API contract schemas)
// ---------------------------------------------------------------------------

export const mockJdParseResponse: JdParseResponse = {
  sessionId: mockSessionId,
  parsedSignals: mockParsedSignals,
  interviewType: 'mix',
  estimatedMinutes: 25,
};

export const mockSessionTurnResponse: SessionTurnResponse = {
  questionText: mockQuestions[0].text,
  questionType: mockQuestions[0].type,
  isFollowUp: false,
  questionOrder: 0,
  action: 'advance',
};

export const mockFeedbackReportResponse: FeedbackReportResponse = {
  sessionId: mockSessionId,
  overallScore: 76,
  technicalAccuracyScore: 82,
  communicationScore: 78,
  structureScore: 68,
  synthesizedInsight: mockFeedbackReport.synthesizedInsight,
  diagnosis: 'Solid technical foundation with room to improve answer structure and conciseness.',
  questions: mockQuestions.map((q) => ({
    text: q.text,
    type: q.type,
    order: q.order,
    isFollowUp: q.isFollowUp,
    answerTranscript: q.answerTranscript,
    scores: q.scores,
    strongAnswerNotes: q.strongAnswerNotes,
  })),
};

export const mockSessionSummaries: SessionSummary[] = [
  {
    sessionId: mockSessionId,
    interviewType: 'mix',
    status: 'completed',
    overallScore: 76,
    createdAt: '2025-06-15T14:30:00.000Z',
    parsedSignals: mockParsedSignals,
  },
  {
    sessionId: '6651a2b3c4d5e6f7a8b9c0d2',
    interviewType: 'behavioral',
    status: 'completed',
    overallScore: 82,
    createdAt: '2025-06-10T09:15:00.000Z',
    parsedSignals: {
      role: 'Engineering Manager',
      seniority: 'Senior (7+ years)',
      stack: ['TypeScript', 'React', 'AWS'],
      culture: ['mentorship', 'transparency', 'growth mindset'],
      focusAreas: ['people management', 'technical leadership', 'cross-team collaboration'],
    },
  },
  {
    sessionId: '6651a2b3c4d5e6f7a8b9c0d3',
    interviewType: 'architectural',
    status: 'completed',
    overallScore: 69,
    createdAt: '2025-06-05T16:45:00.000Z',
    parsedSignals: {
      role: 'Staff Engineer — Infrastructure',
      seniority: 'Staff (8+ years)',
      stack: ['Go', 'Kubernetes', 'Terraform', 'gRPC'],
      culture: ['deep technical expertise', 'mentorship', 'documentation'],
      focusAreas: ['platform engineering', 'reliability', 'developer experience'],
    },
  },
];

export const mockDashboardResponse: DashboardResponse = {
  sessions: mockSessionSummaries,
  totalSessions: 3,
  averageScore: 76,
};
