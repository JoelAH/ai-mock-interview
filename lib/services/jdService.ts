/**
 * JD Service — parses job descriptions and extracts signals.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, returns static fixtures. In production mode, calls the
 * LLM layer for structured extraction and persists via repositories.
 */
import type { JdParseResponse } from '@/lib/schemas';
import { mockJdParseResponse } from '@/lib/mock';
import { isMockMode } from '@/lib/env';

export interface IJdService {
  /**
   * Parses a job description and creates an interview session.
   * Returns parsed signals, interview type, and estimated duration.
   */
  parse(userId: string, jdText: string, sourceType: 'paste' | 'preset'): Promise<JdParseResponse>;
}

export const jdService: IJdService = {
  async parse(userId: string, jdText: string, sourceType: 'paste' | 'preset'): Promise<JdParseResponse> {
    if (isMockMode()) {
      // Return static fixtures — no LLM call, no DB write.
      return mockJdParseResponse;
    }

    // Real implementation (Task 14):
    // 1. Call generateStructuredOutput via the LLM layer to extract signals from jdText.
    // 2. Persist a new interviewSession via sessionRepository.
    // 3. Return the parsed result matching JdParseResponse schema.
    //
    // Placeholder until the LLM layer + repository wiring is complete:
    throw new Error(
      'Real JD parsing not yet implemented. Set USE_MOCKS=true or implement Task 14.',
    );
  },
};
