/**
 * JD Service — parses job descriptions and extracts signals.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * Currently uses mock data; Task 14 will wire in the real LLM call.
 */
import type { JdParseResponse } from '@/lib/schemas';
import { mockJdParseResponse } from '@/lib/mock';

export interface IJdService {
  /**
   * Parses a job description and creates an interview session.
   * Returns parsed signals, interview type, and estimated duration.
   */
  parse(userId: string, jdText: string, sourceType: 'paste' | 'preset'): Promise<JdParseResponse>;
}

export const jdService: IJdService = {
  async parse(_userId: string, _jdText: string, _sourceType: 'paste' | 'preset'): Promise<JdParseResponse> {
    // Mock implementation — returns static parsed signals.
    // Real implementation (Task 14) will call generateStructuredOutput via the LLM layer
    // and persist to interviewSessions via the repository.
    return mockJdParseResponse;
  },
};
