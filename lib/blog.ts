// =============================================================================
// Blog post metadata — single source of truth.
// Consumed by the blog index, per-post Article/Breadcrumb JSON-LD, the sitemap,
// and llms.txt so metadata never drifts across surfaces.
// =============================================================================

export interface BlogPost {
  slug: string;
  title: string;
  /** Short marketing excerpt shown on the blog index card. */
  excerpt: string;
  /** One-line description used for metadata + llms.txt. */
  description: string;
  /** Human-readable display date. */
  date: string;
  /** ISO 8601 date (YYYY-MM-DD) for structured data. */
  isoDate: string;
  /** e.g. "5 min read" */
  readTime: string;
  keywords: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'why-practicing-interviews-out-loud-beats-studying',
    title: 'Why practicing interviews out loud beats studying silently',
    excerpt:
      'Reading answers in your head feels productive — until you freeze in the real room. Here is why speaking your answers changes everything.',
    description:
      'Reading answers in your head feels productive — until you freeze in the real room. Learn why speaking your answers out loud is the single highest-leverage interview prep habit for software engineers.',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '5 min read',
    keywords: [
      'mock interview practice',
      'interview prep tips',
      'speaking practice for interviews',
      'software engineer interview tips',
      'how to stop freezing in interviews',
    ],
  },
  {
    slug: 'how-to-prepare-for-system-design-interview',
    title: 'How to prepare for a system design interview in 2026',
    excerpt:
      'System design rounds trip up even senior engineers. A structured approach to preparation that covers scope, tradeoffs, and communication.',
    description:
      'System design interviews test how you think about tradeoffs at scale. A practical guide to preparation covering scope, structure, communication, and the mistakes that cost senior engineers offers.',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '7 min read',
    keywords: [
      'system design interview preparation',
      'system design interview tips',
      'how to pass system design interview',
      'software engineer system design',
      'architecture interview practice',
    ],
  },
  {
    slug: 'common-behavioral-interview-mistakes-engineers-make',
    title: 'The most common behavioral interview mistakes engineers make',
    excerpt:
      'Technical people tend to under-invest in behavioral prep. These are the patterns that cost offers — and how to fix them.',
    description:
      'Technical people tend to under-invest in behavioral prep. These are the patterns that cost software engineers offers — and practical ways to fix them before your next interview.',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '6 min read',
    keywords: [
      'behavioral interview tips for engineers',
      'STAR method software engineer',
      'behavioral interview mistakes',
      'software engineer interview behavioral',
      'how to answer behavioral questions',
    ],
  },
];

/** Look up a single post by slug. */
export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
