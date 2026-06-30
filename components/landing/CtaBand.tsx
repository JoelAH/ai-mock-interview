import { ArrowIcon, PlayIcon } from './icons';
import { Waveform } from './Waveform';
import styles from './landing.module.scss';

export function CtaBand() {
  return (
    <section className={styles.cta}>
      <div className={styles.ctaPanel}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Do the reps before they count.</h2>
          <p className={styles.ctaSub}>
            Your next interview is going to happen out loud. Practice it that way — start a free
            voice session in under a minute.
          </p>
          <div className={styles.ctaActions}>
            <a href="/sign-up" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              Start practicing free <ArrowIcon />
            </a>
            <a href="#how" className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}>
              <PlayIcon /> See how it works
            </a>
          </div>
          <Waveform bars={9} className={styles.ctaWave} />
        </div>
      </div>
    </section>
  );
}
