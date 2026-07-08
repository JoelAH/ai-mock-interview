# Pre-Launch Checklist

Everything below must be resolved before going to production. Items are grouped
by urgency — **blockers** will break user trust or expose legal risk on day one;
**important** should land before you market the product publicly; **nice to
have** can follow in the first few weeks.

---

## Blockers (must fix before deploy)

### Legal placeholders in `lib/site.ts → LEGAL`

| Constant | Current value | What to replace it with |
|----------|---------------|-------------------------|
| `entity` | `DevMockview` | Your registered legal entity name (e.g. "DevMockview LLC") |
| `governingLaw` | `[Your State/Country, e.g. the State of Delaware, USA]` | The actual jurisdiction whose laws govern your terms |
| `jurisdiction` | `[Your county/court venue, e.g. New Castle County, Delaware]` | The venue for disputes / arbitration seat |
| `contactEmail` | `legal@devmockview.app` | A monitored legal-contact address |
| `privacyEmail` | `privacy@devmockview.app` | A monitored privacy-request address |
| `effectiveDate` | `February 1, 2025` | The date you actually publish the final versions |
| `consentVersion` | `2025-02-01` | Update whenever the voice-consent wording changes |

### Domain / URLs in `lib/site.ts → SITE`

| Constant | Current value | Action |
|----------|---------------|--------|
| `SITE.url` | `https://devmockview.app` | Confirm this is the production domain — it drives `metadataBase`, canonical URLs, `sitemap.xml`, `robots.txt`, JSON-LD, and the OG image |
| `SITE.twitter` | `@devmockview` | Replace with the actual Twitter/X handle, or remove |

### Attorney review of legal documents

- [ ] Have Terms of Service (`app/terms/page.tsx`) reviewed by a qualified attorney in your jurisdiction
- [ ] Have Privacy Policy (`app/privacy/page.tsx`) reviewed by a qualified attorney in your jurisdiction
- [ ] Confirm arbitration + class-action waiver is enforceable where your primary users are located
- [ ] Confirm the BIPA/wiretap consent wording in `VoiceConsent.tsx` satisfies the "informed, written consent" requirement in Illinois (BIPA), California (CalECPA), and any other state where you have users
- [ ] Add a cookie/tracking consent banner if marketing analytics are added later (GDPR/ePrivacy)

### Voice-recording consent — server persistence

- [ ] Persist the `ConsentResult` (`{ version, at }`) server-side against the user record as durable proof of consent (the `VoiceConsent` component captures it client-side — needs a POST to save it)
- [ ] Implement a "withdraw consent" mechanism (e.g. end-session deletes audio immediately)
- [ ] Wire the consent gate into the real session start flow (before `/api/session/turn` first call)

### Environment variables

All keys listed in `.env.example` must be populated in your hosting environment:

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SECRET`
- [ ] `MONGODB_URI`
- [ ] `OPENAI_API_KEY` (used by both LLM and TTS adapters)
- [ ] `LLM_PROVIDER` (default: `openai`)
- [ ] `DEEPGRAM_API_KEY`
- [ ] `ELEVENLABS_API_KEY` (only needed once Premium tier flips to ElevenLabs)
- [ ] `LEMONSQUEEZY_API_KEY` / `LEMONSQUEEZY_WEBHOOK_SECRET` / `LEMONSQUEEZY_STORE_ID`
- [ ] `LEMONSQUEEZY_VARIANT_STARTER` / `LEMONSQUEEZY_VARIANT_PRO` / `LEMONSQUEEZY_VARIANT_PREMIUM`
- [ ] `USE_MOCKS=false` (must be explicitly false in production)

### Webhook endpoints to register

- [ ] Register the Clerk webhook URL: `https://<domain>/api/webhooks/clerk` — events: `user.created`, `user.updated`, `user.deleted`
- [ ] Register the Lemon Squeezy webhook URL: `https://<domain>/api/webhooks/lemonsqueezy` — events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`

---

## Important (before public launch / marketing)

### End-to-end integration testing

The full backend is implemented (all 19 tasks, 235 unit tests pass). Before launch, manually verify the following real-API flows:

- [ ] Paste a real JD → LLM extracts signals correctly (not just mock data)
- [ ] Full voice interview loop: mic → Deepgram STT → orchestrator → TTS playback → feedback report
- [ ] Deepgram token minting works with a real API key (WebSocket connects)
- [ ] TTS audio plays in the browser (OpenAI adapter produces valid opus/mp3)
- [ ] Feedback report scores are reasonable (not all 50s or all 100s)
- [ ] Lemon Squeezy test-mode checkout → webhook → tier sync → session cap enforcement
- [ ] CDK deploy: S3 bucket accessible, audio upload/retrieval works (if audio persistence is enabled)

### Footer placeholder links

These footer links currently point to `#` (non-functional):

| Link | Location | Action |
|------|----------|--------|
| About | footer "Company" column | Create `/about` or link to an external page |
| Blog | footer "Company" column | Create `/blog` or remove |
| Contact | footer "Company" column | Create a contact page or replace with `mailto:` |

### Auth routes

- [x] Header / pricing CTAs link to `/sign-in` and `/sign-up` — Clerk integration is complete (Task 3). Verify routes work on production domain with correct Clerk environment keys.

### Payment processor

- [x] Lemon Squeezy integration is complete (Task 19) — webhook verification, subscription sync, session-cap gating all wired.
- [ ] Create three subscription products in Lemon Squeezy dashboard (Starter/Pro/Premium) and populate `LEMONSQUEEZY_VARIANT_*` env vars with the variant IDs
- [ ] Wire checkout overlay / links on the pricing page — pass `checkout[custom][clerk_user_id]` to map subscription back to user
- [ ] Test full checkout → webhook → tier sync flow in Lemon Squeezy test mode
- [ ] Confirm the no-refunds language aligns with Lemon Squeezy's merchant-of-record terms (they handle disputes)

### OG image verification

- [ ] Deploy and test the generated OG image at `/opengraph-image` using a social-card validator (Twitter Card Validator, Facebook Sharing Debugger, LinkedIn Post Inspector)
- [ ] If the default sans-serif rendering looks too generic, consider bundling a `.woff2` font for `next/og`

### Frontend wiring (mock → real)

The UI screens were built on mock data (Phase 2). They need to be wired to the real API endpoints:

- [ ] JD input → calls `POST /api/jd/parse` instead of returning mock fixture
- [ ] Setup review → make parsed signals editable (user confirms/tweaks LLM output before starting)
- [ ] Mic check → calls `POST /api/deepgram/token` for WebSocket credentials
- [ ] Session screen → real Deepgram WebSocket for STT, `POST /api/session/turn` for orchestrator, `POST /api/session/tts` for audio playback
- [ ] Feedback screen → calls `POST /api/session/feedback` for real report
- [ ] Dashboard → calls the real `getDashboard` endpoint (needs a GET route or client-side fetch)
- [ ] Show tier + remaining sessions in dashboard (from `billingService.canCreateSession`)

### Hero image alt text

- [ ] Verify the `alt` attribute on the hero image (`/sinterview.jpg`) accurately describes the photo's content — current text assumes it shows a candidate

### Accessibility audit

- [ ] Run axe / Lighthouse on the deployed site and fix any issues beyond the baseline already handled (skip-link, focus-visible, reduced-motion, semantic landmarks, contrast)

---

## Nice to have (first few weeks)

### Analytics

- [ ] Add privacy-respecting analytics (e.g. Vercel Analytics, Plausible) — if anything sets cookies, add a consent banner
- [ ] Hook up conversion tracking on CTA clicks

### Performance

- [ ] Generate a `blurDataURL` placeholder for the hero image for smoother loading
- [ ] Consider adding an explicit `sizes` hint on the OG image route

### Legal hardening

- [ ] Add a "last updated" auto-display on Terms/Privacy (currently uses `LEGAL.effectiveDate` manually)
- [ ] Build a consent-log dashboard so you can query who consented, when, and to which version
- [ ] If you expand to the EU market, consider appointing a GDPR representative and adding their details to the Privacy Policy (Section 14)

### Content

- [ ] Replace the landing "About" / "Blog" / "Contact" placeholders with real content
- [ ] Write a data-processing agreement (DPA) addendum for enterprise / team customers if planned

---

## Post-v1 Roadmap

Features and improvements planned after the initial launch. These are not blockers — v1 ships without them.

### Audio playback (listen back to your answers)

- [ ] Add optional audio-retention consent checkbox back to `VoiceConsent.tsx` (re-add `retainAudio` field to `ConsentResult`)
- [ ] Implement `uploadAudio` in `lib/integrations/storage.ts` (S3 PutObject via AWS SDK v3)
- [ ] Tee TTS audio in the session route — stream to client AND buffer → S3
- [ ] Store the S3 key on the `interviewQuestions` doc
- [ ] Add `GET /api/session/audio/[questionId]` route (returns pre-signed S3 URL, 15min expiry)
- [ ] Add play button per question on the feedback report screen
- [ ] Skip upload if user declined audio retention
- [ ] Set S3 lifecycle policy (auto-delete after 90 days, or on consent withdrawal)

### ElevenLabs premium voice

- [ ] Flip `tierConfigs.premium.ttsProvider` from `'openai'` to `'elevenlabs'` in `lib/config/tiers.ts`
- [ ] Validate latency and quality with real users before committing
- [ ] A/B test conversion impact of premium voice vs OpenAI

### "Practice this gap again" focused sessions

- [ ] When user clicks "practice this gap" CTA on the feedback screen, seed a new session weighted toward the weak area (pass weak `focusAreas` into the orchestrator system prompt)
- [ ] Add a `focusOverride` field to the session model so the orchestrator prioritizes those topics

### Mobile / multi-client support

- [ ] React Native app consuming the same REST/SSE endpoints with bearer-token auth
- [ ] Document the streaming protocol (SSE format for turns, chunked binary for TTS) for third-party clients
- [ ] Consider extracting to a standalone API server if Next.js serverless cold starts become a latency issue

### Team / enterprise features

- [ ] Multi-seat accounts with shared session history
- [ ] Manager dashboard (view team aggregate scores, coaching insights)
- [ ] Custom question banks uploaded per org
- [ ] DPA (Data Processing Agreement) for enterprise contracts

### Interview type expansion

- [ ] Technical coding interviews (live code editor + AI evaluation)
- [ ] Case study / product interviews
- [ ] Custom interview templates (user defines their own question flow)

### Engagement / retention

- [ ] Email reminders for users who haven't practiced in 7+ days
- [ ] Weekly progress digest (score trend, suggested focus)
- [ ] Streak / gamification (optional, low priority)

### Infrastructure

- [ ] Promote JD parsing or feedback generation to Lambda if latency or timeout becomes an issue (extraction is trivial — services have no framework coupling)
- [ ] Add CloudWatch alarms on the CDK prod stack (error rate, latency P99)
- [ ] Implement rate limiting on token-minting and session-creation routes

---

## File reference

| File | Contains |
|------|----------|
| `lib/site.ts` | `SITE` (domain, name, twitter) and `LEGAL` (entity, jurisdiction, emails, dates) constants |
| `lib/config/tiers.ts` | Subscription tier definitions (price, session cap, TTS provider per tier) |
| `lib/services/billingService.ts` | Session gating (`canCreateSession`), webhook handling, TTS provider resolution |
| `lib/services/jdService.ts` | JD parsing via LLM + session persistence |
| `lib/services/sessionService.ts` | Interview orchestrator (turn loop, probe/advance/rescue/end) |
| `lib/services/feedbackService.ts` | Background scoring + report generation |
| `lib/integrations/deepgram.ts` | Scoped token minting for browser STT |
| `lib/integrations/tts/` | Provider-agnostic TTS (OpenAI + ElevenLabs adapters) |
| `lib/integrations/lemonsqueezy.ts` | Webhook HMAC verification + event parsing |
| `lib/llm/` | Provider-agnostic LLM layer (OpenAI adapter, mock adapter, factory) |
| `app/api/jd/parse/route.ts` | JD parsing endpoint |
| `app/api/session/turn/route.ts` | Interview turn endpoint (SSE streaming) |
| `app/api/session/tts/route.ts` | TTS audio streaming endpoint |
| `app/api/session/feedback/route.ts` | Feedback report generation endpoint |
| `app/api/deepgram/token/route.ts` | Scoped Deepgram token endpoint |
| `app/api/webhooks/clerk/route.ts` | Clerk user sync webhook |
| `app/api/webhooks/lemonsqueezy/route.ts` | Lemon Squeezy subscription webhook |
| `app/layout.tsx` | Root metadata (title, OG, robots, keywords) |
| `app/terms/page.tsx` | Terms of Service content |
| `app/privacy/page.tsx` | Privacy Policy content |
| `app/opengraph-image.tsx` | Dynamic social card |
| `app/sitemap.ts` | Sitemap (add routes as pages are created) |
| `app/robots.ts` | Robots (currently allows all) |
| `components/interview/VoiceConsent.tsx` | Voice-recording consent gate |
| `components/landing/SiteFooter.tsx` | Footer links (About/Blog/Contact point to `#`) |
| `.env.example` | All required environment variables |
