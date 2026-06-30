import styles from './landing.module.scss';

// Decorative equalizer bars — the recurring "voice" motif. Pure CSS animation
// (disabled under prefers-reduced-motion via globals.scss).
export function Waveform({ bars = 7, className }: { bars?: number; className?: string }) {
  // A fixed, slightly irregular set of delays/heights reads more organic than
  // a perfect sine wave.
  const seeds = [0, 0.45, 0.15, 0.6, 0.3, 0.75, 0.2, 0.5, 0.35];
  return (
    <div className={`${styles.wave}${className ? ` ${className}` : ''}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={styles.waveBar}
          style={{ animationDelay: `${seeds[i % seeds.length]}s` }}
        />
      ))}
    </div>
  );
}
