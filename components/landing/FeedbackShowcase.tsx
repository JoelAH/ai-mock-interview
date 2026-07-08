import type { CSSProperties } from 'react';
import { CheckIcon, SparkIcon } from './icons';
import { REPORT } from '@/lib/site';
import styles from './landing.module.scss';

const HIGHLIGHTS = [
  {
    title: 'Silent scoring.',
    body: 'Scores never interrupt the conversation — they are computed quietly and revealed only when you finish.',
  },
  {
    title: 'Per-question breakdown.',
    body: 'Expand any answer to see what landed and what slipped, colour-coded by score.',
  },
  {
    title: 'Practice this gap again.',
    body: 'One tap spins up a fresh session weighted toward the exact thing you fumbled.',
  },
];

export function FeedbackShowcase() {
  return (
    <section className={`${styles.section} ${styles.showcase}`} aria-labelledby="report-title">
      <div className={styles.showcaseGrid}>
        <div>
          <span className={styles.eyebrow}>The feedback</span>
          <h2 id="report-title" className={styles.sectionTitle}>
            See the tape, not just a vibe.
          </h2>
          <p className={styles.sectionLede}>
            Most prep leaves you guessing. DevMockview ends every session with a number, three
            sub-scores, and the single highest-leverage habit to change.
          </p>

          <div className={styles.showcaseList}>
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className={styles.showcaseItem}>
                <CheckIcon />
                <p>
                  <strong>{item.title}</strong> {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className={styles.reportCard}
          role="img"
          aria-label={`Example report: overall ${REPORT.overall} out of 100`}
        >
          <div className={styles.reportTop}>
            <div className={styles.reportRing} style={{ '--pct': REPORT.overall } as CSSProperties}>
              <span className={styles.reportRingNum}>
                {REPORT.overall}
                <small>/ 100</small>
              </span>
            </div>
            <div>
              <p className={styles.reportVerdictLabel}>Overall</p>
              <p className={styles.reportVerdict}>{REPORT.verdict}</p>
            </div>
          </div>

          <div className={styles.scoreRows}>
            {REPORT.rows.map((row) => (
              <div key={row.label} className={styles.scoreRow}>
                <div className={styles.scoreMeta}>
                  <span>{row.label}</span>
                  <span>{row.score}</span>
                </div>
                <div className={styles.scoreBar}>
                  <div
                    className={styles.scoreFill}
                    style={{ '--val': row.score } as CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.insight}>
            <SparkIcon />
            <div>
              <p className={styles.insightLabel}>Fix this next</p>
              <p className={styles.insightText}>{REPORT.insight}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
