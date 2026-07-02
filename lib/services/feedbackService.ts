/**
 * Feedback Service — generates scored feedback reports.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * Currently uses mock data; Task 18 will wire in the real LLM scoring.
 */
import type { FeedbackReportResponse, DashboardResponse } from '@/lib/schemas';
import { mockFeedbackReportResponse, mockDashboardResponse } from '@/lib/mock';

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

export const feedbackService: IFeedbackService = {
  async generateReport(_userId: string, sessionId: string): Promise<FeedbackReportResponse> {
    // Mock implementation — returns a static report.
    // Real implementation (Task 18) will score via LLM and persist to feedbackReports.
    return {
      ...mockFeedbackReportResponse,
      sessionId,
    };
  },

  async getDashboard(_userId: string): Promise<DashboardResponse> {
    // Mock implementation — returns static session history.
    // Real implementation will query sessionRepository + feedbackRepository.
    return { ...mockDashboardResponse };
  },
};
