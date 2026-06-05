import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Building2, UserPlus, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useUnifiedApprovalsCounts } from './useUnifiedApprovalsCounts';

/**
 * UNIFIED-APPROVALS-CENTER-2
 * Shared cross-links bar surfaced on every page that belongs to the
 * unified approvals experience:
 *   - /admin/approvals          (Approvals Center — pending feed)
 *   - /admin/businesses         (Entities & Businesses CRUD)
 *   - /admin/entity-access-requests (Join requests)
 *
 * Visually ties the three pages together so admins always know they're
 * inside one cohesive workflow, and can jump between surfaces in one
 * click without losing context. Pure presentation — no data fetching.
 */

type SurfaceKey = 'approvals' | 'businesses' | 'access';

interface Surface {
  key: SurfaceKey;
  href: string;
  icon: typeof CheckCircle2;
  ar: string;
  en: string;
  hint: { ar: string; en: string };
  tone: string; // gradient classes
}

const SURFACES: Surface[] = [
  {
    key: 'approvals',
    href: '/admin/approvals',
    icon: CheckCircle2,
    ar: 'مركز الموافقات',
    en: 'Approvals Center',
    hint: { ar: 'الطلبات المعلّقة في قائمة واحدة', en: 'All pending requests in one feed' },
    tone: 'from-success/15 to-success/5 text-success',
  },
  {
    key: 'businesses',
    href: '/admin/businesses',
    icon: Building2,
    ar: 'المنشآت والكيانات',
    en: 'Entities & Businesses',
    hint: { ar: 'إدارة كاملة للملفات والفروع', en: 'Full profile & branch management' },
    tone: 'from-primary/15 to-primary/5 text-primary',
  },
  {
    key: 'access',
    href: '/admin/entity-access-requests',
    icon: UserPlus,
    ar: 'طلبات الانضمام',
    en: 'Join Requests',
    hint: { ar: 'مستخدمون يطلبون الانضمام لمنشأة', en: 'Users requesting to join an entity' },
    tone: 'from-warning/15 to-warning/5 text-warning',
  },
];

function detectActive(pathname: string): SurfaceKey {
  if (pathname.startsWith('/admin/businesses')) return 'businesses';
  if (pathname.startsWith('/admin/entity-access-requests')) return 'access';
  return 'approvals';
}

export const UnifiedApprovalsCenterBanner: React.FC = () => {
  const { isRTL } = useLanguage();
  const { pathname } = useLocation();
  const active = detectActive(pathname);
  const { data: counts, isLoading } = useUnifiedApprovalsCounts();
  const countFor = (k: SurfaceKey): number => {
    if (!counts) return 0;
    if (k === 'approvals')  return counts.approvalsPending;
    if (k === 'businesses') return counts.businessesPending;
    return counts.accessPending;
  };
  const totalPending = (counts?.approvalsPending ?? 0)
    + (counts?.businessesPending ?? 0)
    + (counts?.accessPending ?? 0);
  return (
    <nav
      aria-label={isRTL ? 'مركز الموافقات الموحّد' : 'Unified Approvals Center'}
      className="rounded-2xl border border-border/40 bg-gradient-to-br from-card to-muted/20 p-2 sm:p-3 shadow-elev-1"
    >
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
            {isRTL ? 'مركز الموافقات الموحّد' : 'Unified Approvals Center'}
          </span>
        </span>
        {!isLoading && totalPending > 0 && (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-warning font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            <span className="tech-content">{totalPending}</span>
            {isRTL ? 'تحتاج إجراءً' : 'need action'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SURFACES.map((s) => {
          const isActive = s.key === active;
          const Icon = s.icon;
          const cnt = countFor(s.key);
          return (
            <Link
              key={s.key}
              to={s.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative overflow-hidden rounded-xl border p-3 transition-all hover-lift ${
                isActive
                  ? 'border-primary/40 bg-gradient-to-br ' + s.tone + ' shadow-sm'
                  : 'border-border/40 bg-card hover:border-primary/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-card/70' : `bg-gradient-to-br ${s.tone}`
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold truncate ${isActive ? '' : 'text-foreground'}`}>
                      {isRTL ? s.ar : s.en}
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      {cnt > 0 && (
                        <span
                          className={`tech-content text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full inline-flex items-center justify-center ${
                            isActive
                              ? 'bg-card/70 text-foreground'
                              : 'bg-warning/15 text-warning border border-warning/30'
                          }`}
                          title={isRTL ? `${cnt} عنصر بانتظار الإجراء` : `${cnt} items awaiting action`}
                        >
                          {cnt > 99 ? '99+' : cnt}
                        </span>
                      )}
                      {!isActive && (
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl-flip" />
                      )}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
                    {isRTL ? s.hint.ar : s.hint.en}
                  </p>
                </div>
              </div>
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary/60" aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default UnifiedApprovalsCenterBanner;