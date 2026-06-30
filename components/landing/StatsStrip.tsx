import { STATS } from '@/lib/site';
import styles from './landing.module.scss';

export function StatsStrip() {
  return (
    <section className={styles.stats} aria-label="Sinterview at a glance">
      <div className={styles.statsInner}>
        {STATS.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <div className={styles.statValue}>
              <span>{stat.value}</span>
            </div>
            <p className={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
