/**
 * JD Service — parses job descriptions and extracts signals.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, returns static fixtures. In production mode, calls the
 * LLM layer for structured extraction and persists via repositories.
 */
import type { JdParseResponse } from '@/lib/schemas';
import { jdParsingResultSchema, JD_PARSING_SCHEMA_NAME } from '@/lib/schemas';
import { mockJdParseResponse } from '@/lib/mock';
import { isMockMode } from '@/lib/env';
import { llm } from '@/lib/llm';
import { sessionRepository } from '@/lib/repositories';

export interface IJdService {
  /**
   * Parses a job description and creates an interview session.
   * Returns parsed signals, interview type, and estimated duration.
   */
  parse(userId: string, jdText: string, sourceType: 'paste' | 'preset'): Promise<JdParseResponse>;
}

/** System prompt for JD parsing — instructs the LLM on extraction rules. */
const JD_PARSE_SYSTEM_PROMPT = `You are a job description analyst for an AI mock interview platform.

Given a job description, extract the following structured information:
- role: The job title as stated (or best inferred)
- seniority: The seniority level with years if mentioned (e.g. "Senior (5+ years)", "Mid-level", "Staff")
- stack: An array of technologies, languages, frameworks, and tools mentioned or strongly implied. IMPORTANT: preserve the order they appear in the JD — items listed first are higher priority.
- culture: An array of cultural values and workplace norms mentioned (e.g. "remote-first", "collaborative", "ownership")
- focusAreas: An array of key technical or domain areas the role focuses on (e.g. "distributed systems", "payments", "frontend performance"). IMPORTANT: list items from "Required" sections before items from "Preferred" or "Nice to have" sections. Order reflects priority.
- interviewType: Choose the best interview type:
  - "behavioral" — if the role emphasizes leadership, soft skills, people management
  - "technical" — if it emphasizes specific language/framework knowledge or CS fundamentals
  - "architectural" — if it emphasizes system design, scalability, infrastructure
  - "mix" — if it spans multiple areas (most common for senior+ IC roles)
- estimatedMinutes: Estimate interview length (20 for junior/narrow roles, 25-30 for senior, 30-35 for staff+)

Be thorough but concise. Extract what is explicitly stated or strongly implied. Do not fabricate information not present in the JD. Preserve ordering from the original JD to reflect priority.`;

export const jdService: IJdService = {
  async parse(userId: string, jdText: string, sourceType: 'paste' | 'preset'): Promise<JdParseResponse> {
    if (isMockMode()) {
      // Return static fixtures — no LLM call, no DB write.
      return mockJdParseResponse;
    }

    // 1. Call the LLM to extract structured signals from the JD.
    const parsed = await llm.generateStructuredOutput({
      messages: [
        { role: 'system', content: JD_PARSE_SYSTEM_PROMPT },
        { role: 'user', content: jdText },
      ],
      schema: jdParsingResultSchema,
      schemaName: JD_PARSING_SCHEMA_NAME,
      temperature: 0.2,
    });

    // 2. Build the parsed signals object (matches parsedSignalsSchema).
    const parsedSignals = {
      role: parsed.role,
      seniority: parsed.seniority,
      stack: parsed.stack,
      culture: parsed.culture,
      focusAreas: parsed.focusAreas,
    };

    // 3. Persist a new interview session via the repository.
    const session = await sessionRepository.create({
      userId,
      sourceType,
      jdText,
      parsedSignals,
      interviewType: parsed.interviewType,
      status: 'setup',
      overallScore: null,
    });

    // 4. Return the response matching JdParseResponse schema.
    return {
      sessionId: session._id.toString(),
      parsedSignals,
      interviewType: parsed.interviewType,
      estimatedMinutes: parsed.estimatedMinutes,
    };
  },
};
