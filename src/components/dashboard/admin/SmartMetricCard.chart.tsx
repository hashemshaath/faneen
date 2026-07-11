import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Bar, BarChart } from 'recharts';

interface Props {
  data: Array<{ i: number; v: number }>;
  chart: 'area' | 'bars';
  stroke: string;
  gradId: string;
}

const SmartMetricCardChart: React.FC<Props> = ({ data, chart, stroke, gradId }) => (
  <ResponsiveContainer width="100%" height="100%">
    {chart === 'bars' ? (
      <BarChart data={data}>
        <Bar dataKey="v" fill={stroke} radius={[3, 3, 0, 0]} />
      </BarChart>
    ) : (
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.75}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    )}
  </ResponsiveContainer>
);

export default SmartMetricCardChart;