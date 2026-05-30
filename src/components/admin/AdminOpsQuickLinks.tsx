import { Link, useLocation } from 'react-router-dom';
import {
  Activity, Terminal, Send, FileClock, History, ScrollText, Stethoscope,
  ArrowRight, ArrowLeft, GitBranch,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface QuickLink {
  to: string;
  ar: string;
  en: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const LINKS: QuickLink[] = [
  { to: '/admin/operations',         ar: 'لوحة العمليات',         en: 'Operations',         Icon: Activity },
  { to: '/admin/operations/console', ar: 'مركز العمليات',         en: 'Console',            Icon: Terminal },
  { to: '/admin/quote-operations',   ar: 'تشغيل عروض الأسعار',     en: 'Quote Ops',          Icon: Send },
  { to: '/admin/cron-runs',          ar: 'تشغيل المهام',           en: 'Cron Runs',          Icon: FileClock },
  { to: '/admin/activity-log',       ar: 'سجل النشاط',             en: 'Activity Log',       Icon: History },
  { to: '/admin/audit-log',          ar: 'سجل التدقيق',            en: 'Audit Log',          Icon: ScrollText },
  { to: '/admin/ref/triage',         ar: 'فحص المراجع',            en: 'Reference Triage',   Icon: GitBranch },
  { to: '/admin/diagnostics',        ar: 'التشخيص',                en: 'Diagnostics',        Icon: Stethoscope },
];

/**
 * Compact, horizontally-scrollable strip of related admin-ops modules.
 * Highlights the active link based on `location.pathname`. RTL-aware.
 */
export function AdminOpsQuickLinks() {
  const { isRTL } = useLanguage();
  const { pathname } = useLocation();
  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;

  return (
    <nav
      aria-label={isRTL ? 'الانتقال بين أقسام العمليات' : 'Operations modules'}
      className="no-scrollbar -mx-1 overflow-x-auto print:hidden"
      data-testid="admin-ops-quick-links"
    >
      <ul className="flex items-center gap-2 px-1 py-0.5 min-w-max">
        {LINKS.map(({ to, ar, en, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + '/');
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs whitespace-nowrap transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-foreground/80 border-border/60 hover:bg-muted/60 hover:border-primary/40',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isRTL ? ar : en}</span>
                {!active && (
                  <ArrowFwd className="w-3 h-3 opacity-0 -ms-1 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default AdminOpsQuickLinks;