/**
 * Google Analytics custom event helpers.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('interview_started', { interview_type: 'behavioral' });
 *
 * All helpers are no-ops when `window.gtag` is unavailable (SSR, ad-blockers, etc.)
 */

type GTagEvent = {
  action: string;
  params?: Record<string, string | number | boolean | undefined>;
};

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...(args as Parameters<typeof window.gtag>));
}

/** Fire a custom GA4 event */
export function trackEvent(action: string, params?: GTagEvent['params']) {
  gtag('event', action, params);
}

// ─── Typed event helpers ──────────────────────────────────────────────────────

/** User submits JD or selects a preset on /interview/new */
export function trackInterviewSetupSubmitted(mode: 'paste' | 'preset', role?: string) {
  trackEvent('interview_setup_submitted', { mode, role });
}

/** User clicks "Start Interview" on setup review page */
export function trackInterviewStartClicked(interviewType: string) {
  trackEvent('interview_start_clicked', { interview_type: interviewType });
}

/** User completes mic check and proceeds to interview */
export function trackMicCheckCompleted() {
  trackEvent('mic_check_completed');
}

/** Interview session begins (first question received) */
export function trackInterviewStarted(sessionId: string) {
  trackEvent('interview_started', { session_id: sessionId });
}

/** Interview session completes naturally */
export function trackInterviewCompleted(sessionId: string, questionsAsked: number) {
  trackEvent('interview_completed', { session_id: sessionId, questions_asked: questionsAsked });
}

/** User abandons interview early */
export function trackInterviewAbandoned(sessionId: string, questionsAsked: number) {
  trackEvent('interview_abandoned', { session_id: sessionId, questions_asked: questionsAsked });
}

/** User views their feedback report */
export function trackFeedbackViewed(sessionId: string, overallScore?: number) {
  trackEvent('feedback_viewed', { session_id: sessionId, overall_score: overallScore });
}

/** User clicks an upgrade checkout link */
export function trackUpgradeCheckoutClicked(tier: string) {
  trackEvent('upgrade_checkout_clicked', { tier });
}

/** User's plan upgrade is confirmed */
export function trackPlanUpgraded(tier: string) {
  trackEvent('plan_upgraded', { tier });
}

/** User submits beta signup email */
export function trackBetaSignup() {
  trackEvent('beta_signup_submitted');
}
