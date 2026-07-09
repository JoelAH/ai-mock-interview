import 'server-only';

import { RateLimit } from '@/lib/models';
import { dbConnect } from '@/lib/db';

/**
 * Rate limiter backed by MongoDB.
 *
 * Uses atomic findOneAndUpdate with upsert to increment a counter per
 * (route, userId) or (route, IP) bucket. Each bucket expires via a
 * MongoDB TTL index, so no cron or manual cleanup is needed.
 *
 * This is a fixed-window implementation. Slightly less precise than
 * sliding-window but far simpler, and sufficient for abuse prevention.
 */

export interface RateLimitConfig {
  /** Unique route identifier, e.g. "session:turn" */
  route: string;
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Requests used in the current window */
  used: number;
  /** Max allowed in the window */
  limit: number;
  /** Requests remaining (never negative) */
  remaining: number;
  /** When the current window resets (ms since epoch) */
  resetAt: number;
}

/**
 * Checks and increments the rate limit for a given identifier.
 *
 * @param config - The rate limit configuration for this route
 * @param identifier - User ID or IP address
 * @returns RateLimitResult indicating whether the request should proceed
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  identifier: string,
): Promise<RateLimitResult> {
  await dbConnect();

  const key = `${config.route}:${identifier}`;
  const now = new Date();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(now.getTime() - windowMs);

  // Atomically increment the counter for this key.
  // If the existing bucket has expired (windowStart is too old), reset it.
  const bucket = await RateLimit.findOneAndUpdate(
    {
      key,
      windowStart: { $gte: windowStart },
    },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        key,
        windowStart: now,
        expiresAt: new Date(now.getTime() + windowMs),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const count = bucket!.count as number;
  const resetAt = (bucket!.expiresAt as Date).getTime();
  const allowed = count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);

  return { allowed, used: count, limit: config.maxRequests, remaining, resetAt };
}

/**
 * Pre-configured rate limit definitions for the app's sensitive routes.
 * Centralized here so limits are easy to audit and adjust.
 */
export const RATE_LIMITS = {
  /** Deepgram token minting: 10 requests per minute */
  deepgramToken: {
    route: 'deepgram:token',
    maxRequests: 10,
    windowSeconds: 60,
  },
  /** JD parsing (triggers LLM): 10 requests per minute */
  jdParse: {
    route: 'jd:parse',
    maxRequests: 10,
    windowSeconds: 60,
  },
  /** Session turn (triggers LLM): 30 requests per minute */
  sessionTurn: {
    route: 'session:turn',
    maxRequests: 30,
    windowSeconds: 60,
  },
  /** TTS generation: 30 requests per minute */
  sessionTts: {
    route: 'session:tts',
    maxRequests: 30,
    windowSeconds: 60,
  },
  /** Feedback report generation (triggers LLM): 5 per minute */
  sessionFeedback: {
    route: 'session:feedback',
    maxRequests: 5,
    windowSeconds: 60,
  },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Returns standard rate-limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

/**
 * Convenience: returns a 429 Response if rate limited, or null if allowed.
 * The caller can short-circuit on a non-null return.
 */
export async function enforceRateLimit(
  config: RateLimitConfig,
  identifier: string,
): Promise<Response | null> {
  const result = await checkRateLimit(config, identifier);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfterSeconds: Math.ceil((result.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          ...rateLimitHeaders(result),
        },
      },
    );
  }

  return null;
}
