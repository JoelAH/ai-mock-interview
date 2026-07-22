// =============================================================================
// /llms.txt — a Markdown "cheat sheet" for AI assistants (ChatGPT, Claude,
// Perplexity, Gemini). Gives them a clean, curated map of the site + a factual
// summary they can quote, instead of crawling every page.
//
// Spec: https://llmstxt.org — H1 name, blockquote summary, then sectioned
// lists of links with one-line descriptions.
//
// Generated from lib/site.ts + lib/blog.ts so it never drifts from the site.
// =============================================================================
import { SITE, AI_SUMMARY, FAQS, PLANS, FEATURES } from '@/lib/site';
import { BLOG_POSTS } from '@/lib/blog';

// Rebuilt at request time from static content; safe to prerender.
export const dynamic = 'force-static';

function buildLlmsTxt(): string {
  const lines: string[] = [];

  // --- Title + summary ------------------------------------------------------
  lines.push(`# ${SITE.name}`);
  lines.push('');
  lines.push(`> ${AI_SUMMARY}`);
  lines.push('');
  lines.push(`Tagline: ${SITE.tagline}`);
  lines.push('');

  // --- What it is -----------------------------------------------------------
  lines.push('## What it is');
  lines.push('');
  lines.push(
    `${SITE.name} is a web app for software-engineer interview practice. It is voice-first: ` +
      'you speak your answers and hear questions read aloud, rather than typing into a chat box. ' +
      'Interviews are tailored to a pasted job description and cover behavioral and system-design ' +
      '(architectural) rounds for roles from junior through staff.',
  );
  lines.push('');

  // --- Key features ---------------------------------------------------------
  lines.push('## Key features');
  lines.push('');
  for (const f of FEATURES) {
    lines.push(`- **${f.title}**: ${f.body}`);
  }
  lines.push('');

  // --- Pricing --------------------------------------------------------------
  lines.push('## Pricing');
  lines.push('');
  for (const p of PLANS) {
    lines.push(`- **${p.name}** (${p.price} ${p.cadence}): ${p.perks.join('; ')}.`);
  }
  lines.push('');

  // --- Primary pages --------------------------------------------------------
  lines.push('## Primary pages');
  lines.push('');
  lines.push(`- [Home](${SITE.url}/): Product overview, how it works, features, pricing, and FAQ.`);
  lines.push(`- [About](${SITE.url}/about): Background on ${SITE.name} and who it is for.`);
  lines.push(`- [Blog](${SITE.url}/blog): Interview-prep guides for software engineers.`);
  lines.push(`- [Sign up](${SITE.url}/sign-up): Create an account and start a free interview.`);
  lines.push('');

  // --- Blog / guides --------------------------------------------------------
  lines.push('## Guides');
  lines.push('');
  for (const post of BLOG_POSTS) {
    lines.push(`- [${post.title}](${SITE.url}/blog/${post.slug}): ${post.description}`);
  }
  lines.push('');

  // --- FAQ (great for direct citation) -------------------------------------
  lines.push('## FAQ');
  lines.push('');
  for (const f of FAQS) {
    lines.push(`### ${f.q}`);
    lines.push(f.a);
    lines.push('');
  }

  return lines.join('\n');
}

export async function GET(): Promise<Response> {
  return new Response(buildLlmsTxt(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
