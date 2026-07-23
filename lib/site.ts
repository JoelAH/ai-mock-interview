// =============================================================================
// Site-level constants + marketing content for the landing page.
// Kept in /lib so screens, metadata, and structured data share one source.
// =============================================================================

export const SITE = {
  name: 'DevMockview',
  url: 'https://devmockview.com',
  tagline: 'Rehearse the real interview, out loud.',
  description:
    'DevMockview is a voice-first AI interviewer for software engineers. Paste a job description, practice behavioral and system-design questions out loud, get adaptive follow-ups, and receive a scored report on exactly what to fix.',
  locale: 'en_US',
  twitter: '@devmockview', // placeholder — update when an X account exists
} as const;

// -----------------------------------------------------------------------------
// Author / publisher identity. Drives E-E-A-T signals in structured data and
// llms.txt (who is behind the content). Update `name`/`sameAs` with the real
// author and public profiles.
// -----------------------------------------------------------------------------
export const AUTHOR = {
  name: 'The DevMockview Team',
  // Public profiles / verifiable presence for the brand.
  // These strengthen entity trust for AI engines and search.
  sameAs: [
    'https://www.threads.net/@joey.the.coder',
    'https://github.com/JoelAH',
  ] as string[],
} as const;

// A one-paragraph, plain-language elevator pitch written for AI assistants to
// quote directly. Keep it factual and self-contained.
export const AI_SUMMARY =
  'DevMockview is a voice-first AI mock interview platform for software engineers. ' +
  'Candidates paste a real job description, then practice behavioral and system-design ' +
  '(architectural) interviews out loud in the browser. An AI interviewer asks role-tailored ' +
  'questions, adapts with follow-up probes based on spoken answers, and produces a scored ' +
  'report covering technical accuracy, communication, and structure — plus the single ' +
  'highest-leverage thing to fix next. It supports roles from junior through staff, runs ' +
  'entirely in the browser with no install, and keeps sessions private (audio retention is opt-in).';

// -----------------------------------------------------------------------------
// Legal constants. These are PLACEHOLDERS — replace with your real legal entity,
// jurisdiction, and contact details, and have an attorney review the documents
// in app/terms and app/privacy before relying on them.
// -----------------------------------------------------------------------------
export const LEGAL = {
  // The legal entity that operates the service (you / your company).
  entity: 'DevMockview',
  // Where the operator is based — drives governing law / venue.
  governingLaw: 'the laws of Jamaica',
  jurisdiction: 'the courts of Kingston, Jamaica',
  contactEmail: 'admin@wimeki.com',
  privacyEmail: 'admin@wimeki.com',
  // Update whenever you materially change either document.
  effectiveDate: 'July 8, 2026',
  // Bump when the voice-recording consent wording changes so prior consent can
  // be re-collected. Stored alongside each captured consent.
  consentVersion: '2025-02-01',
} as const;

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: 'How it works', href: '/#how' },
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
];

export type Stat = { value: string; label: string };

export const STATS: Stat[] = [
  { value: '0', label: 'typing — it\u2019s a real voice conversation' },
  { value: '100%', label: 'tailored to the job description you paste in' },
  { value: '3', label: 'scored dimensions on every answer you give' },
  { value: '24/7', label: 'practice anytime, no one watching' },
];

export type Step = { n: string; title: string; body: string };

export const STEPS: Step[] = [
  {
    n: '01',
    title: 'Paste the job description',
    body: 'We pull out the role, seniority, stack, and the signals a real panel will actually probe for — no manual setup.',
  },
  {
    n: '02',
    title: 'Talk it through',
    body: 'Answer out loud. Live transcription captures every word. No typing, no multiple choice, no canned banks.',
  },
  {
    n: '03',
    title: 'Get pushed',
    body: 'Hand-wave and the interviewer digs deeper. Nail it and it moves on — adaptive follow-ups, like a human would.',
  },
  {
    n: '04',
    title: 'Watch the tape',
    body: 'A scored breakdown lands seconds later, with the single highest-leverage thing to fix before next time.',
  },
];

export type Feature = { icon: string; title: string; body: string };

export const FEATURES: Feature[] = [
  {
    icon: 'mic',
    title: 'Voice-first, not a chatbot',
    body: 'Hear each question and answer by speaking. Streaming speech in and out means it flows like a conversation, never a form.',
  },
  {
    icon: 'target',
    title: 'Tailored to the JD',
    body: "Drop in any job post and the session targets that exact role's expectations — not a generic question dump.",
  },
  {
    icon: 'branch',
    title: 'Adaptive follow-ups',
    body: 'Vague answer? It probes. Strong answer? It advances. The interview bends to how you actually respond.',
  },
  {
    icon: 'brackets',
    title: 'Behavioral + architectural',
    body: 'Move between storytelling and system design in a single sitting, the way real loops actually run.',
  },
  {
    icon: 'gauge',
    title: 'Scored feedback report',
    body: 'Technical accuracy, communication, and structure — plus the one recurring pattern worth fixing first.',
  },
  {
    icon: 'trend',
    title: 'Track your trend',
    body: 'Every session is logged with a score trend, so improvement is something you can actually see.',
  },
];

export type ScoreRow = { label: string; score: number };

export const REPORT = {
  overall: 82,
  verdict: 'Strong hire signal — with one habit holding you back.',
  rows: [
    { label: 'Technical accuracy', score: 78 },
    { label: 'Communication', score: 88 },
    { label: 'Structure', score: 80 },
  ] as ScoreRow[],
  insight:
    'You lead with the solution before the problem. Spend the first 15 seconds framing constraints and you read a full level more senior.',
};

export type Plan = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  cta: string;
  featured: boolean;
  perks: string[];
};

export const PLANS: Plan[] = [
  {
    name: 'Free trial',
    price: '$0',
    cadence: 'no card required',
    blurb: 'Feel the loop with two full interviews.',
    cta: 'Start free',
    featured: false,
    perks: [
      '2 full voice interviews',
      'Job-description tailoring',
      'Overall score + summary',
      'Runs in your browser',
    ],
  },
  {
    name: 'Starter',
    price: '$19',
    cadence: 'per month',
    blurb: 'Steady practice while you warm up.',
    cta: 'Choose Starter',
    featured: false,
    perks: [
      '10 interviews / month',
      'Behavioral + architectural',
      'Job-description tailoring',
      'Full scored reports + insights',
      'Progress trend over time',
    ],
  },
  {
    name: 'Pro',
    price: '$39',
    cadence: 'per month',
    blurb: 'Everything you need while actively in the loop.',
    cta: 'Go Pro',
    featured: true,
    perks: [
      '25 interviews / month',
      'Behavioral + architectural',
      'Job-description tailoring',
      'Full scored reports + insights',
      'Progress trend over time',
    ],
  },
  {
    name: 'Premium',
    price: '$79',
    cadence: 'per month',
    blurb: 'Maximum reps for the final stretch.',
    cta: 'Go Premium',
    featured: false,
    perks: [
      '60 interviews / month',
      'Behavioral + architectural',
      'Job-description tailoring',
      'Full scored reports + insights',
      'Progress trend over time',
      'Premium lifelike voice (coming soon)',
    ],
  },
];

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: 'Is it actually voice, or just another chat box?',
    a: 'Actually voice. You hear each question spoken and answer out loud; your speech is transcribed live. The whole point is to rehearse talking under pressure, which typing can never simulate.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. DevMockview runs entirely in your browser — just grant microphone access when prompted and you are in the room.',
  },
  {
    q: 'What kinds of interviews can I practice?',
    a: 'Behavioral and architectural (system design), for software engineering roles from junior through staff. You can run them separately or mix both in one session.',
  },
  {
    q: 'How does the scoring work?',
    a: 'Every answer is scored quietly in the background on technical accuracy, communication, and structure. At the end you get an overall score plus a synthesized insight naming the single pattern to fix first.',
  },
  {
    q: 'Is my audio stored or shared with employers?',
    a: 'This is practice-only. Your sessions are private to you and never shared with any employer. Audio retention is opt-in, not the default.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. All paid plans are billed monthly and you can cancel whenever you like — no contracts, no penalty.',
  },
];
