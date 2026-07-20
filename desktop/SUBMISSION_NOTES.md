# Mac App Store Submission Notes

## App Store Listing

**App Name:** DevMockView  
**Subtitle:** AI Mock Interview Practice  
**Category:** Education  
**Price:** Free (with in-app subscriptions)

**Description:**
Practice technical and behavioral interviews with an AI interviewer that adapts to your job description. Get real-time voice-based practice with detailed feedback reports.

Key features:
- Paste any job description and get a tailored interview
- Voice-based conversation with real-time speech recognition
- AI-generated follow-up questions that probe deeper
- Detailed feedback with scores and actionable insights
- Track your progress over time

**Keywords:** mock interview, interview practice, AI interview, software engineer, behavioral interview, system design, interview prep, coding interview, technical interview, career

## Screenshots Required

- At least one screenshot at 1280×800 (or 1440×900 for Retina)
- Suggested screenshots:
  1. Dashboard view showing score trend
  2. New Interview — JD paste screen
  3. Interview session — listening state with transcript
  4. Feedback report with score rings
  5. Settings/subscription screen

## Privacy Nutrition Labels

**Data Linked to You:**
- Name (from sign-in)
- Email (from sign-in)
- User ID (Clerk identifier)

**Data Used to Track You:** None

**Data Collection:**
- Audio: Captured temporarily for real-time transcription, NOT stored
- Usage Data: Session counts, scores, interview types
- Identifiers: Clerk user ID, subscription ID

## App Review Notes

**Authentication Flow:**
This app uses Clerk for authentication via the system browser. When the user taps "Sign in," their default browser opens to our Clerk-hosted login page (supporting email/password, Google, and GitHub OAuth). After authentication, the browser redirects back to the app using the custom URL scheme `devmockview://auth/callback`. The app then exchanges the auth code for a session token using PKCE.

**Microphone Usage:**
The app requires microphone access to conduct voice-based mock interviews. Audio is streamed in real-time to Deepgram (a speech-to-text service) via WebSocket. Only text transcripts are stored — raw audio is never persisted. Users must explicitly consent to voice recording before their first interview.

**Network Requests:**
The app communicates with our backend API at devmockview.com for:
- Interview session management
- Text-to-speech audio generation
- Feedback report generation
- Subscription status checks

All API calls require authentication via bearer token.

**In-App Purchases:**
Three auto-renewable subscription tiers (Starter, Pro, Premium) with monthly billing. Subscriptions are managed through RevenueCat. A "Restore Purchases" button is available in Settings.

**Demo Account (for review):**
Please contact us for a demo account or use the following test credentials:
- Email: [provide to Apple during submission]
- Password: [provide to Apple during submission]

## Entitlements Justification

| Entitlement | Reason |
|---|---|
| `com.apple.security.app-sandbox` | Required for MAS |
| `com.apple.security.device.audio-input` | Microphone for voice interviews |
| `com.apple.security.network.client` | API calls to backend + Deepgram WebSocket |
| `com.apple.security.keychain-access-groups` | Secure token storage via safeStorage |

## Build & Submit Checklist

- [ ] Set `APPLE_TEAM_ID` env var
- [ ] Install signing certificates (3rd Party Mac Developer Application + Installer)
- [ ] Download and place provisioning profile at `build/embedded.provisionprofile`
- [ ] Replace placeholder icon with final design (`build/icon-source.png` → `npm run icons`)
- [ ] Configure RevenueCat API key in `src/main/iap.ts`
- [ ] Configure RevenueCat webhook auth key in production env
- [ ] Set production API base URL in Vite config or env
- [ ] Create App Store Connect listing with metadata above
- [ ] Test full flow with sandbox Apple ID
- [ ] Run `npm run package:mas` to produce the `.pkg`
- [ ] Upload via Transporter or `xcrun altool --upload-app`
- [ ] Submit for review
