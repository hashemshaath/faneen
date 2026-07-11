import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  data: Array<{ day: string; users: number; businesses: number; label: string }>;
  isRTL: boolean;
}

const IdentitySignupsChartInner: React.FC<Props> = ({ data, isRTL }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.4} />
          <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="bizGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
      <XAxis
        dataKey="label"
        stroke="hsl(var(--muted-foreground))"
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        interval="preserveStartEnd"
        reversed={isRTL}
      />
      <YAxis
        stroke="hsl(var(--muted-foreground))"
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        allowDecimals={false}
        orientation={isRTL ? 'right' : 'left'}
      />
      <Tooltip
        contentStyle={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          fontSize: 12,
        }}
        labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}
      />
      <Area type="monotone" dataKey="users" name={isRTL ? 'مستخدمون' : 'Users'}
        stroke="hsl(var(--info))" strokeWidth={2} fill="url(#usersGrad)" />
      <Area type="monotone" dataKey="businesses" name={isRTL ? 'منشآت' : 'Businesses'}
        stroke="hsl(var(--success))" strokeWidth={2} fill="url(#bizGrad)" />
    </AreaChart>
  </ResponsiveContainer>
);

export default IdentitySignupsChartInner;