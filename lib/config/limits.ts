/**
 * Shared input limits — imported by both server-side Zod schemas and
 * client-side form components. No server-only or heavy dependencies.
 */

/** Maximum character length for a pasted job description. */
export const JD_TEXT_MAX_LENGTH = 50_000;

/** Maximum character length for a single transcript turn. */
export const TRANSCRIPT_MAX_LENGTH = 10_000;

/** Maximum character length for TTS text input. */
export const TTS_TEXT_MAX_LENGTH = 2_000;
