/**
 * Tiny inline SVG sparkline — no dependencies. Used in KPI tiles
 * to give a trend signal at a glance. Width/height fixed to keep
 * tiles compact and CWV-friendly.
 */
import React from 'react';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeClass?: string; // stroke color (semantic via currentColor)
  fillClass?: string;
}

export const SparklineMini: React.FC<Props> = ({
  data,
  width = 64,
  height = 18,
  className,
  strokeClass = 'text-current',
  fillClass,
}) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(' L')}`;
  const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      {fillClass && <path d={area} className={fillClass} fill="currentColor" opacity={0.18} />}
      <path d={line} className={strokeClass} stroke="currentColor" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default SparklineMini;