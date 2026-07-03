/**
 * Feedback Service — generates scored feedback reports.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, returns static fixtures. In production mode, calls the
 * LLM layer for structured scoring and persists via repositories.
 */
import type { FeedbackReportResponse, DashboardResponse } from '@/lib/schemas';
import { mockFeedbackReportResponse, mockDashboardResponse } from '@/lib/mock';
import { isMockMode } from '@/lib/env';

export interface IFeedbackService {
  /**
   * Generates a feedback report for a completed session.
   * In production, this calls generateStructuredOutput to score the full transcript.
   */
  generateReport(userId: string, sessionId: string): Promise<FeedbackReportResponse>;

  /**
   * Returns dashboard data: past sessions with scores and trend info.
   */
  getDashboard(userId: string): Promise<DashboardResponse>;
}

// ---------------------------------------------------------------------------
// Mock implementation — returns static fixtures.
// ---------------------------------------------------------------------------

const mockFeedbackService: IFeedbackService = {
  async generateReport(_userId: string, sessionId: string): Promise<FeedbackReportResponse> {
    return {
      ...mockFeedbackReportResponse,
      sessionId,
    };
  },

  async getDashboard(_userId: string): Promise<DashboardResponse> {
    return { ...mockDashboardResponse };
  },
};

// ---------------------------------------------------------------------------
// Real implementation placeholder — wired in Task 18.
// ---------------------------------------------------------------------------

const realFeedbackService: IFeedbackService = {
  async generateReport(_userId, _sessionId) {
    // Task 18: call generateStructuredOutput over the full transcript,
    // persist to feedbackReports + interviewSessions.overallScore via repositories.
    throw new Error(
      'Real feedback generation not yet implemented. Set USE_MOCKS=true or implement Task 18.',
    );
  },

  async getDashboard(_userId) {
    // Task 18: query sessionRepository + feedbackRepository for real history.
    throw new Error(
      'Real dashboard not yet implemented. Set USE_MOCKS=true or implement Task 18.',
    );
  },
};

// ---------------------------------------------------------------------------
// Export — resolved at call time based on environment.
// ---------------------------------------------------------------------------

export const feedbackService: IFeedbackService = {
  generateReport(...args) {
    return isMockMode()
      ? mockFeedbackService.generateReport(...args)
      : realFeedbackService.generateReport(...args);
  },
  getDashboard(...args) {
    return isMockMode()
      ? mockFeedbackService.getDashboard(...args)
      : realFeedbackService.getDashboard(...args);
  },
};
