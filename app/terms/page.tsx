/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from 'next';
import { LegalLayout, legalStyles as s } from '@/components/legal/LegalLayout';
import { SITE, LEGAL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms and conditions that govern your use of ${SITE.name}.`,
  alternates: { canonical: '/terms' },
};

const P = ({ children }: { children: React.ReactNode }) => (
  <span className={s.placeholder}>{children}</span>
);

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Terms of Service">
      <section id="agreement">
        <h2>1. Agreement to these Terms</h2>
        <p>
          These Terms of Service (the "Terms") form a binding agreement between you ("you" or
          "User") and {LEGAL.entity} ("we", "us", or "our"), the operator of {SITE.name} and the
          related websites, applications, and features (collectively, the "Service"). By accessing
          or using the Service, creating an account, or clicking to accept these Terms, you
          acknowledge that you have read, understood, and agree to be bound by these Terms and by
          our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the Service.
        </p>
        <p>
          If you use the Service on behalf of an organization, you represent that you have authority
          to bind that organization, and "you" refers to that organization.
        </p>
      </section>

      <section id="eligibility">
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old (or the age of majority in your jurisdiction) and
          legally able to enter into contracts to use the Service. By using the Service you
          represent and warrant that you meet these requirements and that all information you
          provide is accurate.
        </p>
      </section>

      <section id="what-it-is">
        <h2>3. What {SITE.name} Is — and What It Is Not</h2>
        <p>
          {SITE.name} is a <strong>practice tool</strong>. It uses automated and artificial
          intelligence ("AI") systems to simulate mock interviews, generate questions and
          follow-ups, transcribe speech, and produce illustrative scores and feedback. It is for
          self-improvement and entertainment purposes only.
        </p>
        <p>The Service is expressly NOT, and you agree not to treat it as:</p>
        <ul>
          <li>a real job interview, hiring process, or any guarantee of employment or outcomes;</li>
          <li>
            career, recruiting, professional, psychological, financial, or legal advice of any kind;
          </li>
          <li>
            a substitute for your own judgment, professional advisors, or independent verification;
            or
          </li>
          <li>an accurate, complete, or reliable assessment of your skills or employability.</li>
        </ul>
        <p>
          AI output can be inaccurate, incomplete, biased, outdated, or offensive, and may
          "hallucinate" facts. Scores and feedback are illustrative estimates only. You use all
          output at your own risk and are solely responsible for any decisions you make based on it.
        </p>
      </section>

      <section id="account">
        <h2>4. Your Account</h2>
        <p>
          Account creation and authentication may be handled by third-party providers. You are
          responsible for maintaining the confidentiality of your credentials and for all activity
          under your account. Notify us immediately of any unauthorized use. We are not liable for
          any loss arising from your failure to safeguard your account.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>5. Acceptable Use</h2>
        <p>You agree not to, and not to permit anyone else to:</p>
        <ul>
          <li>use the Service for any unlawful, harmful, fraudulent, or infringing purpose;</li>
          <li>
            upload content you do not have the right to share, including confidential job
            descriptions, third-party personal data, or trade secrets;
          </li>
          <li>
            attempt to reverse engineer, scrape, overload, disrupt, or gain unauthorized access to
            the Service or its systems;
          </li>
          <li>
            use the Service to build a competing product, or to train, fine-tune, or benchmark other
            models;
          </li>
          <li>
            misuse AI output to deceive, harass, defame, or harm others, or to misrepresent it as
            human-generated where prohibited; or
          </li>
          <li>circumvent usage limits, security, or access controls.</li>
        </ul>
        <p>
          We may suspend or terminate access for any suspected violation, with or without notice.
        </p>
      </section>

      <section id="your-content">
        <h2>6. Your Content</h2>
        <p>
          "Your Content" means everything you submit to the Service, including job-description text,
          spoken answers, audio recordings, transcripts, and other inputs. As between you and us,
          you retain ownership of Your Content. You grant us a worldwide, non-exclusive,
          royalty-free, sublicensable license to host, store, process, transmit, reproduce, and
          create derivative works from Your Content solely to operate, secure, maintain, and improve
          the Service, including by sending it to the third-party AI providers described below.
        </p>
        <p>
          You represent and warrant that you have all rights necessary to submit Your Content and
          that it does not violate any law or third-party right. You are solely responsible for Your
          Content and the consequences of submitting it.
        </p>
      </section>

      <section id="third-parties">
        <h2>7. Third-Party Services</h2>
        <p>
          The Service relies on third-party providers for functions such as authentication, AI
          language processing, speech-to-text, text-to-speech, payments, hosting, and data storage.
          Your use of those features may be subject to the providers' own terms and policies. We do
          not control and are not responsible or liable for third-party services, their
          availability, or their handling of data. See our <a href="/privacy">Privacy Policy</a> for
          details about data sharing.
        </p>
      </section>

      <section id="billing">
        <h2>8. Plans, Billing, and No Refunds</h2>
        <p>
          The Service may offer free and paid subscription plans. Paid plans are billed in advance
          on a recurring basis through our third-party payment processor / merchant of record, who
          handles your payment information (we do not store full card details). By purchasing a paid
          plan you authorize recurring charges until you cancel.
        </p>
        <p>
          <strong>
            All fees and charges are non-refundable to the fullest extent permitted by law.
          </strong>{' '}
          We do not provide refunds or credits for partial periods, unused features, or
          dissatisfaction, except where a refund is required by applicable law. You may cancel at
          any time; cancellation stops future renewals but does not refund amounts already paid.
          Prices and plan features may change with reasonable notice.
        </p>
      </section>

      <section id="ip">
        <h2>9. Our Intellectual Property</h2>
        <p>
          The Service, including its software, design, text, graphics, logos, and the {SITE.name}{' '}
          name, is owned by us or our licensors and is protected by intellectual-property laws.
          Subject to these Terms, we grant you a limited, revocable, non-exclusive, non-transferable
          license to use the Service for your personal, non-commercial practice. All rights not
          expressly granted are reserved.
        </p>
      </section>

      <section id="feedback">
        <h2>10. Feedback</h2>
        <p>
          If you send us suggestions or feedback, you grant us a perpetual, irrevocable, worldwide,
          royalty-free license to use it for any purpose without obligation or compensation to you.
        </p>
      </section>

      <section id="disclaimer">
        <h2>11. Disclaimers — Use at Your Own Risk</h2>
        <span className={s.loud}>
          The service and all content and output are provided "as is" and "as available", with all
          faults and without warranties of any kind, whether express, implied, or statutory. To the
          fullest extent permitted by law, we disclaim all warranties, including merchantability,
          fitness for a particular purpose, title, non-infringement, accuracy, and any warranty
          arising from course of dealing or usage. We do not warrant that the service will be
          uninterrupted, secure, error-free, or that any output will be accurate or reliable. You
          assume all risk arising from your use of the service.
        </span>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties, so some of the above
          may not apply to you.
        </p>
      </section>

      <section id="liability">
        <h2>12. Limitation of Liability</h2>
        <span className={s.loud}>
          To the fullest extent permitted by law, in no event will {LEGAL.entity}, its owners,
          officers, employees, contractors, or suppliers be liable for any indirect, incidental,
          special, consequential, exemplary, or punitive damages, or for any loss of profits,
          revenue, data, goodwill, employment or job opportunities, or other intangible losses,
          arising out of or relating to the service or these terms, even if advised of the
          possibility of such damages and regardless of the legal theory.
        </span>
        <span className={s.loud}>
          Our total aggregate liability for all claims relating to the service will not exceed the
          greater of (a) the total amounts you actually paid us for the service in the six (6)
          months before the event giving rise to the claim, or (b) one hundred U.S. dollars (US
          $100).
        </span>
        <p>
          Some jurisdictions do not allow certain limitations of liability, so some of the above may
          not apply to you. Nothing in these Terms limits liability that cannot be limited by law
          (such as, in some places, liability for gross negligence, willful misconduct, fraud, or
          death or personal injury caused by negligence).
        </p>
      </section>

      <section id="indemnity">
        <h2>13. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless {LEGAL.entity} and its owners, officers,
          employees, and contractors from and against any claims, liabilities, damages, losses, and
          expenses (including reasonable legal fees) arising out of or related to: (a) Your Content;
          (b) your use or misuse of the Service; (c) your violation of these Terms or any law; or
          (d) your violation of any third-party right.
        </p>
      </section>

      <section id="termination">
        <h2>14. Suspension and Termination</h2>
        <p>
          We may suspend, restrict, or terminate your access to the Service at any time, for any or
          no reason, with or without notice. You may stop using the Service at any time. Sections
          that by their nature should survive termination (including Sections 6, 9–13, and 15) will
          survive.
        </p>
      </section>

      <section id="disputes">
        <h2>15. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of <P>{LEGAL.governingLaw}</P>, without regard to its
          conflict-of-laws rules.
        </p>
        <h3>Informal resolution</h3>
        <p>
          Before filing any claim, you agree to first contact us at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> and attempt to resolve
          the dispute informally for at least 30 days.
        </p>
        <h3>Binding arbitration and class-action waiver</h3>
        <p>
          To the extent permitted by law, any dispute that is not resolved informally will be
          settled by final and binding individual arbitration administered in{' '}
          <P>{LEGAL.jurisdiction}</P>, rather than in court, except that either party may bring
          claims in small-claims court.{' '}
          <strong>
            You and we waive any right to a jury trial and to participate in any class, collective,
            or representative action.
          </strong>{' '}
          If this class-action waiver is found unenforceable, the arbitration provision will be
          void, and disputes will be heard exclusively in the courts located in{' '}
          <P>{LEGAL.jurisdiction}</P>. Arbitration and class-action rules vary by country; this
          clause applies only where permitted.
        </p>
      </section>

      <section id="changes">
        <h2>16. Changes to the Service and Terms</h2>
        <p>
          We may modify or discontinue the Service (in whole or in part) at any time. We may also
          update these Terms; if we make material changes, we will update the effective date and may
          provide additional notice. Your continued use after changes take effect constitutes
          acceptance of the revised Terms.
        </p>
      </section>

      <section id="misc">
        <h2>17. Miscellaneous</h2>
        <p>
          These Terms and the Privacy Policy are the entire agreement between you and us regarding
          the Service. If any provision is held unenforceable, the remaining provisions remain in
          effect, and the unenforceable provision will be enforced to the maximum extent permitted.
          Our failure to enforce a provision is not a waiver. You may not assign these Terms without
          our consent; we may assign them freely. We are not liable for delays or failures caused by
          events beyond our reasonable control. Notices may be provided through the Service or by
          email.
        </p>
      </section>

      <section id="contact">
        <h2>18. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
