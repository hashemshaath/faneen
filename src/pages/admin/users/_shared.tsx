import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

/**
 * Shared helpers and primitives used across the AdminUsers page and its
 * extracted tab/panel components. Keep this file display-only — no data
 * fetching, no mutations, no router or query-client awareness.
 */

export const formatDate = (dateStr: string | null | undefined, lang: string): string => {
  if (!dateStr) return lang === 'ar' ? 'غير محدد' : 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return lang === 'ar' ? 'غير محدد' : 'N/A';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatRelative = (dateStr: string | null | undefined, isRTL: boolean): string => {
  if (!dateStr) return pickBi(isRTL, 'غير محدد', 'N/A');
  const d = new Date(dateStr); if (isNaN(d.getTime())) return pickBi(isRTL, 'غير محدد', 'N/A');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return pickBi(isRTL, 'الآن', 'now');
  if (diff < 3600) return isRTL ? `منذ ${Math.floor(diff/60)} د` : `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return isRTL ? `منذ ${Math.floor(diff/3600)} س` : `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*30) return isRTL ? `منذ ${Math.floor(diff/86400)} يوم` : `${Math.floor(diff/86400)}d ago`;
  return formatDate(dateStr, pickBi(isRTL, 'ar', 'en'));
};

export type KpiCardProps = {
  icon: React.ElementType;
  label: string;
  value: number | string;
  gradient: string;
  iconBg: string;
  trend?: string;
};

export const KpiCard = React.memo(({ icon: Icon, label, value, gradient, iconBg, trend }: KpiCardProps) => (
  <div className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br ${gradient} p-4 transition-all hover:shadow-md hover-lift group`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold font-heading leading-none tech-content">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
      {trend && (
        <span className={`text-[10px] font-bold tech-content shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
          trend.startsWith('-') ? 'text-destructive bg-destructive/10' : 'text-success bg-success/10'
        }`}>
          {trend.startsWith('-') ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
          {trend.replace('-', '')}
        </span>
      )}
    </div>
  </div>
));
KpiCard.displayName = 'KpiCard';

export type AdminUsersStats = {
  totalUsers: number;
  superAdmins: number;
  admins: number;
  moderators: number;
  bannedCount: number;
  tierDist: { free: number; basic: number; premium: number; enterprise: number };
  recentUsers: number;
  prevWeekUsers: number;
  wow: number;
  last24h: number;
  providers: number;
  verified: number;
  onboarded: number;
};

export type SignupSeriesPoint = { date: string; total: number; providers: number; label: string };

export type RecentAdminActivityItem = {
  id: string;
  action: string;
  created_at: string;
};
