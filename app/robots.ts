import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Major AI crawlers we explicitly welcome. Being explicit signals intent to be
// ingested and cited by these assistants (they still respect the wildcard rule,
// but named allows make the policy unambiguous and easy to audit/adjust later).
const AI_CRAWLERS = [
  'GPTBot', // OpenAI — model training
  'OAI-SearchBot', // OpenAI — ChatGPT Search index
  'ChatGPT-User', // OpenAI — live browsing on a user's behalf
  'ClaudeBot', // Anthropic — Claude crawler
  'Claude-Web', // Anthropic — live retrieval
  'anthropic-ai', // Anthropic — legacy agent
  'PerplexityBot', // Perplexity — index
  'Perplexity-User', // Perplexity — live retrieval
  'Google-Extended', // Google — Gemini / Vertex AI grounding
  'Applebot-Extended', // Apple — Apple Intelligence
  'Amazonbot', // Amazon — Alexa / answers
  'Meta-ExternalAgent', // Meta — AI ingestion
  'CCBot', // Common Crawl — corpus feeding many LLMs
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everything else — index the whole public site.
      { userAgent: '*', allow: '/' },
      // Named AI crawlers — same open policy, stated explicitly.
      { userAgent: AI_CRAWLERS, allow: '/' },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
