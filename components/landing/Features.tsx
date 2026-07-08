import { FEATURES } from '@/lib/site';
import { featureIcons } from './icons';
import styles from './landing.module.scss';

export function Features() {
  return (
    <section id="features" className={`${styles.section} ${styles.container}`}>
      <div className={styles.sectionHead}>
        <span className={styles.eyebrow}>What you get</span>
        <h2 className={styles.sectionTitle}>Built to feel like the room, not a quiz app.</h2>
        <p className={styles.sectionLede}>
          Every part of DevMockview exists to recreate the pressure, pace, and feedback of a real
          loop — so the actual day feels like one more rep.
        </p>
      </div>

      <div className={styles.featureGrid}>
        {FEATURES.map((feature) => {
          const Icon = featureIcons[feature.icon];
          return (
            <article key={feature.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{Icon ? <Icon /> : null}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureBody}>{feature.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
