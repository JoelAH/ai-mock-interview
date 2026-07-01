/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from 'next';
import { LegalLayout, legalStyles as s } from '@/components/legal/LegalLayout';
import { SITE, LEGAL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses, and shares your information.`,
  alternates: { canonical: '/privacy' },
};

const P = ({ children }: { children: React.ReactNode }) => (
  <span className={s.placeholder}>{children}</span>
);

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy Policy">
      <section id="overview">
        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains how {LEGAL.entity} ("we", "us") collects, uses, and shares
          information when you use {SITE.name} (the "Service"). By using the Service, you agree to
          the practices described here and in our <a href="/terms">Terms of Service</a>. If you do
          not agree, do not use the Service.
        </p>
      </section>

      <section id="collect">
        <h2>2. Information We Collect</h2>
        <h3>Information you provide</h3>
        <ul>
          <li>
            <strong>Account details</strong> — such as your name and email address, collected
            through our authentication provider when you sign up.
          </li>
          <li>
            <strong>Practice inputs</strong> — job-description text you paste in and any other
            content you submit to configure a session.
          </li>
          <li>
            <strong>Voice and audio</strong> — when you grant microphone access, the audio of your
            spoken answers during a session.
          </li>
          <li>
            <strong>Transcripts, scores, and feedback</strong> — the text transcription of your
            answers and the generated questions, scores, and reports.
          </li>
          <li>
            <strong>Communications</strong> — messages you send us (e.g., support requests).
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Usage and device data</strong> — such as pages viewed, actions taken, browser
            type, device, approximate location derived from IP, and timestamps.
          </li>
          <li>
            <strong>Cookies and similar technologies</strong> — used for authentication,
            preferences, security, and basic analytics.
          </li>
        </ul>
        <h3>Payment information</h3>
        <p>
          If you purchase a paid plan, payment is processed by our third-party payment processor /
          merchant of record. We do not collect or store full payment-card numbers; we receive
          limited details such as plan, status, and partial identifiers.
        </p>
      </section>

      <section id="use">
        <h2>3. How We Use Information</h2>
        <ul>
          <li>provide, operate, and maintain the Service and run your mock-interview sessions;</li>
          <li>generate questions, transcriptions, scores, feedback, and progress trends;</li>
          <li>authenticate you, process payments, and manage subscriptions;</li>
          <li>secure the Service, prevent abuse, and debug and improve features;</li>
          <li>communicate with you about your account, updates, and support; and</li>
          <li>comply with legal obligations and enforce our Terms.</li>
        </ul>
      </section>

      <section id="ai">
        <h2>4. AI Processing and Service Providers</h2>
        <p>
          To deliver core features, your inputs (including job-description text, audio, and
          transcripts) are sent to third-party "sub-processors" that perform specific functions on
          our behalf. These typically include providers for:
        </p>
        <ul>
          <li>authentication and account management;</li>
          <li>AI language processing (generating questions, follow-ups, and feedback);</li>
          <li>speech-to-text transcription and text-to-speech voice;</li>
          <li>payment processing;</li>
          <li>cloud hosting, storage, and databases.</li>
        </ul>
        <p>
          These providers process data under their own terms and privacy policies. We aim to use
          providers that do not use your content to train their general models, but we do not
          control their practices and are not responsible for them. We may also share information to
          comply with law, enforce our Terms, protect rights and safety, or in connection with a
          merger, acquisition, or sale of assets.{' '}
          <strong>We do not sell your personal information.</strong>
        </p>
      </section>

      <section id="audio">
        <h2>5. Voice and Audio Data</h2>
        <p>
          {SITE.name} is a practice-only tool. Your sessions are private to your account and are{' '}
          <strong>never shared with employers or recruiters</strong>. Audio is processed to produce
          a transcript; retention of raw audio is opt-in and not the default. You can delete your
          sessions and request deletion of associated data as described below.
        </p>
      </section>

      <section id="legal-bases">
        <h2>6. Legal Bases (EEA/UK)</h2>
        <p>
          If you are in the European Economic Area or the United Kingdom, we process personal data
          on these legal bases: performance of a contract (to provide the Service), our legitimate
          interests (to secure and improve the Service), your consent (e.g., microphone access and
          optional audio retention), and compliance with legal obligations. You may withdraw consent
          at any time.
        </p>
      </section>

      <section id="retention">
        <h2>7. Data Retention</h2>
        <p>
          We retain information for as long as your account is active or as needed to provide the
          Service, and thereafter as required to comply with legal obligations, resolve disputes,
          and enforce our agreements. When no longer needed, we delete or anonymize it.
        </p>
      </section>

      <section id="rights">
        <h2>8. Your Privacy Rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or export
          your personal information, to object to or restrict certain processing, and to opt out of
          certain uses. California residents (under the CCPA/CPRA) and EEA/UK residents (under the
          GDPR) have additional rights, including the right not to receive discriminatory treatment
          for exercising them. We do not sell or "share" personal information for cross-context
          behavioral advertising.
        </p>
        <p>
          To exercise any right, email{' '}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. We will verify and
          respond as required by applicable law. You may also have the right to lodge a complaint
          with your local data-protection authority.
        </p>
      </section>

      <section id="security">
        <h2>9. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect information. However,
          no method of transmission or storage is completely secure, and we cannot guarantee
          absolute security. You use the Service and provide information at your own risk.
        </p>
      </section>

      <section id="transfers">
        <h2>10. International Data Transfers</h2>
        <p>
          We and our providers may process and store information in countries other than yours,
          including the United States, which may have different data-protection laws. Where
          required, we rely on appropriate safeguards for such transfers.
        </p>
      </section>

      <section id="children">
        <h2>11. Children's Privacy</h2>
        <p>
          The Service is not directed to children under 16, and we do not knowingly collect personal
          information from them. If you believe a child has provided us information, contact us and
          we will delete it.
        </p>
      </section>

      <section id="links">
        <h2>12. Third-Party Links</h2>
        <p>
          The Service may link to third-party sites or services we do not control. This Policy does
          not apply to them, and we are not responsible for their practices.
        </p>
      </section>

      <section id="changes">
        <h2>13. Changes to this Policy</h2>
        <p>
          We may update this Policy from time to time. If we make material changes, we will update
          the effective date above and may provide additional notice. Your continued use of the
          Service after changes take effect constitutes acceptance.
        </p>
      </section>

      <section id="contact">
        <h2>14. Contact</h2>
        <p>
          Questions about your privacy? Contact us at{' '}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. Our operating entity is{' '}
          <P>{LEGAL.entity}</P>, located in <P>{LEGAL.governingLaw}</P>.
        </p>
      </section>
    </LegalLayout>
  );
}
