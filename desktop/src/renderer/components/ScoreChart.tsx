import React from 'react';
import './ScoreChart.css';

interface ScorePoint {
  date: string;
  score: number;
}

interface Props {
  data: ScorePoint[];
  height?: number;
}

/**
 * Lightweight SVG line chart showing score trends over time.
 * No external charting library needed.
 */
export default function ScoreChart({ data, height = 140 }: Props) {
  if (data.length === 0) {
    return (
      <div className="score-chart-empty" style={{ height }}>
        <p>Complete interviews to see your score trend</p>
      </div>
    );
  }

  const width = 100; // SVG viewBox percentage-based
  const padding = { top: 10, right: 5, bottom: 20, left: 5 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minScore = Math.min(...data.map((d) => d.score));
  const maxScore = Math.max(...data.map((d) => d.score));
  const scoreRange = maxScore - minScore || 1;

  const points = data.map((point, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y =
      padding.top + chartHeight - ((point.score - minScore) / scoreRange) * chartHeight;
    return { x, y, ...point };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Gradient area below the line
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className="score-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="score-chart-svg"
        style={{ height }}
      >
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.3)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + chartHeight * (1 - frac)}
            y2={padding.top + chartHeight * (1 - frac)}
            className="score-chart-grid"
          />
        ))}

        {/* Gradient fill */}
        <path d={areaPath} fill="url(#scoreGradient)" />

        {/* Line */}
        <path d={linePath} className="score-chart-line" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.2}
            className="score-chart-dot"
          />
        ))}
      </svg>

      {/* Score labels */}
      <div className="score-chart-labels">
        <span>{maxScore}</span>
        <span>{minScore}</span>
      </div>
    </div>
  );
}
