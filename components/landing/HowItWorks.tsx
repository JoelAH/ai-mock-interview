import { STEPS } from '@/lib/site';
import styles from './landing.module.scss';

export function HowItWorks() {
  return (
    <section id="how" className={`${styles.section} ${styles.container}`}>
      <div className={styles.sectionHead}>
        <span className={styles.eyebrow}>How it works</span>
        <h2 className={styles.sectionTitle}>From job post to a scored rep in four steps.</h2>
        <p className={styles.sectionLede}>
          No setup, no question banks to wrangle. Paste, talk, and get pushed the way a real
          interviewer would push you.
        </p>
      </div>

      <ol className={styles.steps}>
        {STEPS.map((step) => (
          <li key={step.n} className={styles.step}>
            <span className={styles.stepN}>{step.n}</span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepBody}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
