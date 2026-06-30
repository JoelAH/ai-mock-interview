import Image from 'next/image';
import { ArrowIcon, PlayIcon, ShieldIcon } from './icons';
import { Waveform } from './Waveform';
import { REPORT } from '@/lib/site';
import styles from './landing.module.scss';

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.heroGrid} />

      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <span className={styles.recTag}>
            <span className={styles.recDot} />
            Live voice practice
          </span>

          <h1 className={styles.heroTitle}>
            Rehearse the real interview, <span className={styles.heroTitleAccent}>out loud.</span>
          </h1>

          <p className={styles.heroSub}>
            A voice-first AI interviewer that reads your target job description, asks like a real
            panel, pushes back when you hand-wave, and hands you a scored report on exactly what to
            fix.
          </p>

          <div className={styles.heroCtas}>
            <a href="/sign-up" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              Start practicing free <ArrowIcon />
            </a>
            <a href="#how" className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}>
              <PlayIcon /> See how it works
            </a>
          </div>

          <p className={styles.heroNote}>
            <ShieldIcon />
            Practice-only. Your sessions stay private — never shared with employers.
          </p>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.visualFrame}>
            <Image
              src="/sinterview.jpg"
              alt="A candidate practicing a spoken mock interview with Sinterview"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 90vw"
              className={styles.visualImg}
            />
            <div className={styles.visualScrim} />

            <div className={`${styles.floatCard} ${styles.floatThinking}`}>
              <Waveform bars={5} />
              <span>Listening&hellip;</span>
            </div>

            <div className={`${styles.floatCard} ${styles.floatScore}`}>
              <span className={styles.floatScoreNum}>{REPORT.overall}</span>
              <span className={styles.floatScoreLabel}>
                live
                <br />
                score
              </span>
            </div>

            <div className={`${styles.floatCard} ${styles.floatTranscript}`}>
              <span className={styles.floatLabel}>
                <span className={styles.live}>You</span> · live transcript
              </span>
              <p className={styles.transcriptText}>
                &ldquo;The main constraint was write throughput, so I&rsquo;d shard on user ID and
                front it with a queue&hellip;&rdquo;
                <span className={styles.caret} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
