import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ChartTooltipStyle } from '../shared';

interface Props {
  data: Array<{ day: string; notifications: number; contracts: number }>;
}

const TrendsWidgetChart: React.FC<Props> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
      <XAxis dataKey="day" hide />
      <Tooltip contentStyle={ChartTooltipStyle} cursor={{ stroke: 'hsl(var(--border))' }} />
      <Line type="monotone" dataKey="notifications" stroke="hsl(var(--accent))" strokeWidth={1.75} dot={false} />
      <Line type="monotone" dataKey="contracts"     stroke="hsl(var(--primary))" strokeWidth={1.75} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export default TrendsWidgetChart;