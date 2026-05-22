import React from 'react';

export interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <span className="text-[10px] text-muted-foreground font-body">{label}</span>
    </div>
    <p className={`font-heading font-bold text-lg sm:text-xl ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground font-body mt-0.5">{sub}</p>}
  </div>
);