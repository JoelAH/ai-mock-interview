'use client';

import styles from './dashboard.module.scss';

interface ScoreTrendChartProps {
  /** Array of scores (0–100) in chronological order */
  scores: (number | null)[];
}

/**
 * Lightweight inline SVG sparkline showing the score trend over sessions.
 * No external chart library — just a polyline on a fixed viewBox.
 */
export function ScoreTrendChart({ scores }: ScoreTrendChartProps) {
  const validScores = scores.filter((s): s is number => s !== null);

  if (validScores.length < 2) {
    return (
      <div className={styles.chartEmpty}>
        <p>Complete more sessions to see your score trend.</p>
      </div>
    );
  }

  const width = 300;
  const height = 80;
  const padding = 8;

  const xStep = (width - padding * 2) / (validScores.length - 1);
  const minScore = Math.min(...validScores);
  const maxScore = Math.max(...validScores);
  const range = maxScore - minScore || 1;

  const points = validScores.map((score, i) => {
    const x = padding + i * xStep;
    const y = height - padding - ((score - minScore) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Gradient fill area
  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${padding + (validScores.length - 1) * xStep},${height - padding}`,
  ].join(' ');

  return (
    <div className={styles.chartContainer} aria-label="Score trend chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Score trend: ${validScores.join(', ')}`}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#trendFill)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--teal)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {validScores.map((_, i) => {
          const x = padding + i * xStep;
          const y = height - padding - ((validScores[i] - minScore) / range) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--teal)" />;
        })}
      </svg>
    </div>
  );
}
