// =============================================================================
// Beta-mode flag.
// When NEXT_PUBLIC_BETA_MODE is "true", the app hides auth flows and shows a
// "Coming Soon" landing experience with an email notify form.
// =============================================================================

export const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
