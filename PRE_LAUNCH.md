# Pre-Launch Checklist

Everything below must be resolved before going to production. Items are grouped
by urgency — **blockers** will break user trust or expose legal risk on day one;
**important** should land before you market the product publicly; **nice to
have** can follow in the first few weeks.

---

## Blockers (must fix before deploy)

### Legal placeholders in `lib/site.ts → LEGAL`

| Constant | Current value | What to replace it with |
|----------|---------------|-------------------------|
| `entity` | `Sinterview` | Your registered legal entity name (e.g. "Sinterview LLC") |
| `governingLaw` | `[Your State/Country, e.g. the State of Delaware, USA]` | The actual jurisdiction whose laws govern your terms |
| `jurisdiction` | `[Your county/court venue, e.g. New Castle County, Delaware]` | The venue for disputes / arbitration seat |
| `contactEmail` | `legal@sinterview.app` | A monitored legal-contact address |
| `privacyEmail` | `privacy@sinterview.app` | A monitored privacy-request address |
| `effectiveDate` | `February 1, 2025` | The date you actually publish the final versions |
| `consentVersion` | `2025-02-01` | Update whenever the voice-consent wording changes |

### Domain / URLs in `lib/site.ts → SITE`

| Constant | Current value | Action |
|----------|---------------|--------|
| `SITE.url` | `https://sinterview.app` | Confirm this is the production domain — it drives `metadataBase`, canonical URLs, `sitemap.xml`, `robots.txt`, JSON-LD, and the OG image |
| `SITE.twitter` | `@sinterview` | Replace with the actual Twitter/X handle, or remove |

### Attorney review of legal documents

- [ ] Have Terms of Service (`app/terms/page.tsx`) reviewed by a qualified attorney in your jurisdiction
- [ ] Have Privacy Policy (`app/privacy/page.tsx`) reviewed by a qualified attorney in your jurisdiction
- [ ] Confirm arbitration + class-action waiver is enforceable where your primary users are located
- [ ] Confirm the BIPA/wiretap consent wording in `VoiceConsent.tsx` satisfies the "informed, written consent" requirement in Illinois (BIPA), California (CalECPA), and any other state where you have users
- [ ] Add a cookie/tracking consent banner if marketing analytics are added later (GDPR/ePrivacy)

### Voice-recording consent — server persistence

- [ ] When the live session loop is built, persist the `ConsentResult` (`{ retainAudio, version, at }`) server-side against the user record as durable proof of consent
- [ ] Implement a "withdraw consent" mechanism (e.g. end-session deletes audio immediately)

### Environment variables

All keys listed in `.env.example` must be populated in your hosting environment:

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SECRET`
- [ ] `MONGODB_URI`
- [ ] `OPENAI_API_KEY` / `LLM_PROVIDER`
- [ ] `DEEPGRAM_API_KEY`
- [ ] `ELEVENLABS_API_KEY`
- [ ] `LEMONSQUEEZY_API_KEY` / `LEMONSQUEEZY_WEBHOOK_SECRET` / `LEMONSQUEEZY_STORE_ID`
- [ ] `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `S3_AUDIO_BUCKET`

---

## Important (before public launch / marketing)

### Footer placeholder links

These footer links currently point to `#` (non-functional):

| Link | Location | Action |
|------|----------|--------|
| About | footer "Company" column | Create `/about` or link to an external page |
| Blog | footer "Company" column | Create `/blog` or remove |
| Contact | footer "Company" column | Create a contact page or replace with `mailto:` |

### Auth routes

- [ ] Header / pricing CTAs link to `/sign-in` and `/sign-up` — these will 404 until Clerk integration (Task 3 in PLAN.md) is complete

### Payment processor

- [ ] Pricing "Go Pro" and "Start free" buttons link to `/sign-up` — need to wire Lemon Squeezy checkout overlay / link once Task 19 is complete
- [ ] Confirm the no-refunds language aligns with Lemon Squeezy's merchant-of-record terms (they handle disputes)

### OG image verification

- [ ] Deploy and test the generated OG image at `/opengraph-image` using a social-card validator (Twitter Card Validator, Facebook Sharing Debugger, LinkedIn Post Inspector)
- [ ] If the default sans-serif rendering looks too generic, consider bundling a `.woff2` font for `next/og`

### Hero image alt text

- [ ] Verify the `alt` attribute on the hero image (`/sinterview.jpg`) accurately describes the photo's content — current text assumes it shows a candidate

### Accessibility audit

- [ ] Run axe / Lighthouse on the deployed site and fix any issues beyond the baseline already handled (skip-link, focus-visible, reduced-motion, semantic landmarks, contrast)

---

## Nice to have (first few weeks)

### Analytics

- [ ] Add privacy-respecting analytics (e.g. Vercel Analytics, Plausible) — if anything sets cookies, add a consent banner
- [ ] Hook up conversion tracking on CTA clicks

### Performance

- [ ] Generate a `blurDataURL` placeholder for the hero image for smoother loading
- [ ] Consider adding an explicit `sizes` hint on the OG image route

### Legal hardening

- [ ] Add a "last updated" auto-display on Terms/Privacy (currently uses `LEGAL.effectiveDate` manually)
- [ ] Build a consent-log dashboard so you can query who consented, when, and to which version
- [ ] If you expand to the EU market, consider appointing a GDPR representative and adding their details to the Privacy Policy (Section 14)

### Content

- [ ] Replace the landing "About" / "Blog" / "Contact" placeholders with real content
- [ ] Write a data-processing agreement (DPA) addendum for enterprise / team customers if planned

---

## File reference

| File | Contains |
|------|----------|
| `lib/site.ts` | `SITE` (domain, name, twitter) and `LEGAL` (entity, jurisdiction, emails, dates) constants |
| `app/layout.tsx` | Root metadata (title, OG, robots, keywords) |
| `app/terms/page.tsx` | Terms of Service content |
| `app/privacy/page.tsx` | Privacy Policy content |
| `app/opengraph-image.tsx` | Dynamic social card |
| `app/sitemap.ts` | Sitemap (add routes as pages are created) |
| `app/robots.ts` | Robots (currently allows all) |
| `components/interview/VoiceConsent.tsx` | Voice-recording consent gate |
| `components/landing/SiteFooter.tsx` | Footer links (About/Blog/Contact point to `#`) |
| `.env.example` | All required environment variables |
