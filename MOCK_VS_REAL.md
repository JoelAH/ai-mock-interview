# Mock Mode vs Real Mode

This document explains what each service returns in mock mode (`USE_MOCKS=true`) versus real mode (`USE_MOCKS=false`). The response shapes are always identical — only the content source differs.

## Environment Setup

| Mode | When | External services needed |
|------|------|-------------------------|
| **Mock** (`USE_MOCKS=true`, default in dev/test) | UI development, component testing, CI | Clerk + MongoDB only |
| **Real** (`USE_MOCKS=false`) | Integration testing, staging, production | Clerk + MongoDB + OpenAI + Deepgram |

---

## JD Parsing (`POST /api/jd/parse`)

| | Mock | Real |
|--|------|------|
| **Source** | Static fixture in `lib/mock/fixtures.ts` | OpenAI `generateStructuredOutput` against the actual JD text |
| **Behavior** | Always returns the same signals regardless of input | Extracts real role/stack/culture from whatever JD you paste |
| **DB write** | None | Creates an `interviewSession` doc |
| **Response shape** | `{ sessionId, parsedSignals, interviewType, estimatedMinutes }` | Same |
| **Gap in mock** | Paste "janitor needed" and you still get "Senior Software Engineer — Payments Platform" | Real responds to actual input |

---

## Session Turn (`POST /api/session/turn`)

| | Mock | Real |
|--|------|------|
| **Source** | 4 hardcoded questions cycled in order | OpenAI decides next question based on conversation history |
| **Adaptiveness** | None — same questions regardless of your answer | Probes deeper if shallow, advances if thorough, rescues if stuck |
| **Persistence** | None — in-memory Map of turn indexes | Saves transcript to previous question, creates new question doc |
| **Session end** | After question 4 always | LLM decides when enough ground is covered (typically 4-6 Qs) |
| **Response shape** | 3 SSE chunks: `decision` → `question` → `done` | Same |
| **Gap in mock** | No follow-ups based on what you said | Real is context-aware and adaptive |

---

## TTS (`POST /api/session/tts`)

| | Mock | Real |
|--|------|------|
| **Source** | 1KB of zeros per text fragment | OpenAI `audio.speech.create` with gpt-4o-mini-tts |
| **Audio** | Silent (no audible output) | Real spoken voice (default: alloy, opus format) |
| **Streaming** | Instant yield | ~200-500ms latency before audio starts |
| **Response shape** | Binary stream, `audio/opus` content-type | Same |
| **Gap in mock** | You hear nothing | You hear the interviewer speak |

---

## Deepgram Token (`POST /api/deepgram/token`)

| | Mock | Real |
|--|------|------|
| **Source** | Hardcoded fake values | `POST https://api.deepgram.com/v1/auth/grant` |
| **Token** | `"mock-deepgram-token-dev"` | A real JWT valid for 120s |
| **URL** | `wss://mock.deepgram.local/v1/listen` | `wss://api.deepgram.com/v1/listen?model=nova-3&...` |
| **Browser behavior** | WebSocket connection fails (fake URL) | WebSocket connects, real-time transcription works |
| **Response shape** | `{ token, url, expiresAt }` | Same |
| **Gap in mock** | No live STT in the browser | Real transcription from mic audio |

---

## Feedback Report (`POST /api/session/feedback`)

| | Mock | Real |
|--|------|------|
| **Source** | Static fixture (overall 76, technical 82, etc.) | OpenAI scores the full transcript |
| **Scores** | Always the same numbers | Calibrated to actual answer quality |
| **Insight** | Generic "improve answer structure" text | Specific to patterns in your answers |
| **Persistence** | None | Creates `feedbackReport` doc, updates `session.overallScore` |
| **Per-question breakdown** | 4 mock questions with pre-set scores | Real questions from the session with LLM-scored per-answer metrics |
| **Response shape** | `FeedbackReportResponse` with questions array | Same |
| **Gap in mock** | Score is meaningless (always 76) | Score reflects real performance |

---

## Background Scoring (`feedbackService.scoreAnswer`)

| | Mock | Real |
|--|------|------|
| **Behavior** | No-op (returns immediately) | Calls LLM to score relevance/depth/clarity, persists to question doc |
| **Visibility** | N/A | Never surfaced mid-interview — only visible in final report |

---

## Billing / Session Gating (`billingService.canCreateSession`)

| | Mock | Real |
|--|------|------|
| **Behavior** | Same code path — always hits DB | Same code path — always hits DB |
| **Difference** | None. Not mock-gated. | Same |
| **Fresh user** | Tier "free", 1 session/month allowed | Same |

---

## Lemon Squeezy Webhook (`POST /api/webhooks/lemonsqueezy`)

| | Mock | Real |
|--|------|------|
| **Signature verification** | Skipped — any body is accepted | HMAC-SHA256 verified against `LEMONSQUEEZY_WEBHOOK_SECRET` |
| **Processing** | Same `billingService.handleWebhookEvent` logic | Same |

---

## Summary: What feels broken in mock mode

| Issue | Why |
|-------|-----|
| JD parsing ignores your input | Always returns the same fixture role/stack |
| Interview isn't adaptive | Same 4 questions no matter what you say |
| No audio output | TTS yields silent bytes |
| STT doesn't work | Fake WebSocket URL can't connect |
| Scores are meaningless | Always the same fixture numbers (76/82/78/68) |

Mock mode is useful for **UI flow, layout, navigation, and component behavior**. For testing the actual product experience, set `USE_MOCKS=false` and provide the real API keys.
