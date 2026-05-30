/**
 * APP-SHELL-REARCHITECTURE-1 — Global command palette.
 *
 * Cmd/Ctrl+K opens a fuzzy-searchable command list backed by:
 *  - visible routes (useVisibleRoutes)
 *  - permission-filtered quick actions
 *  - recently visited workspace context
 *
 * No network. No realtime. No DB.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibleRoutes, usePermissionMatrix } from '@/hooks/useVisibilityEngine';
import { QUICK_ACTIONS, filterQuickActions, type QuickActionAudience } from '@/modules/workspace/shell/quickActions';
import { readRecentContext } from '@/modules/workspace/shell/recentContextStore';
import { resolveRefRoute, parseRef } from '@/modules/workspace/shell/refRouteMap';
import { useCommandPalette } from '@/hooks/useCommandPalette';

const ROUTE_LABELS: Record<string, { ar: string; en: string }> = {
  '/dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  '/dashboard/work-orders': { ar: 'أوامر العمل', en: 'Work Orders' },
  '/dashboard/work-orders/overview': { ar: 'نظرة عامة - أوامر العمل', en: 'Work Orders Overview' },
  '/dashboard/operations/feed': { ar: 'تدفق العمليات', en: 'Operations Feed' },
  '/dashboard/contracts': { ar: 'العقود', en: 'Contracts' },
  '/dashboard/leads': { ar: 'العملاء المحتملون', en: 'Leads' },
  '/dashboard/bookings': { ar: 'الحجوزات', en: 'Bookings' },
  '/dashboard/messages': { ar: 'الرسائل', en: 'Messages' },
  '/dashboard/notifications': { ar: 'الإشعارات', en: 'Notifications' },
  '/dashboard/settings': { ar: 'الإعدادات', en: 'Settings' },
  '/dashboard/settings/staff': { ar: 'مركز الموظفين', en: 'Staff Center' },
  '/admin/reports': { ar: 'مركز التقارير', en: 'Reports Center' },
  '/admin/contracts': { ar: 'إدارة العقود', en: 'Manage Contracts' },
  '/admin/contracts/create': { ar: 'إنشاء عقد جديد', en: 'Create Contract' },
  '/dashboard/rfq': { ar: 'طلبات عروض الأسعار', en: 'Requests for Quotes' },
  '/dashboard/rfq/inbox': { ar: 'صندوق طلبات الأسعار', en: 'RFQ Inbox' },
  '/dashboard/loyalty': { ar: 'نقاط الولاء', en: 'Loyalty Points' },
};

function labelFor(path: string, isRTL: boolean): string {
  const l = ROUTE_LABELS[path];
  if (l) return isRTL ? l.ar : l.en;
  return path;
}

export const CommandPalette: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isProvider } = useAuth();
  const visibleRoutes = useVisibleRoutes();
  const matrix = usePermissionMatrix();
  const { open, setOpen } = useCommandPalette();

  const audience: QuickActionAudience = (isAdmin || isSuperAdmin) ? 'admin' : isProvider ? 'provider' : 'user';

  const actions = useMemo(
    () => filterQuickActions(QUICK_ACTIONS, {
      audience,
      hasPermission: (p) => matrix.can(p),
    }),
    [audience, matrix],
  );

  const recent = useMemo(() => (open ? readRecentContext().slice(0, 8) : []), [open]);

  const go = (to: string) => { setOpen(false); navigate(to); };

  const handleValueChange = (raw: string) => {
    const dest = resolveRefRoute(raw);
    if (dest && parseRef(raw)) {
      // Allow Enter to fire ref-navigation through the empty state below; no auto-nav while typing.
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={isRTL ? 'ابحث عن صفحة، إجراء، أو مرجع…' : 'Search a page, action, or ref…'}
        onValueChange={handleValueChange}
        data-testid="command-palette-input"
      />
      <CommandList>
        <CommandEmpty>{isRTL ? 'لا نتائج' : 'No results'}</CommandEmpty>

        {actions.length > 0 && (
          <CommandGroup heading={isRTL ? 'إجراءات سريعة' : 'Quick Actions'}>
            {actions.map((a) => (
              <CommandItem
                key={`action-${a.id}`}
                value={`${a.id} ${a.label.en} ${a.label.ar}`}
                onSelect={() => go(a.to)}
              >
                {isRTL ? a.label.ar : a.label.en}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {visibleRoutes.length > 0 && (
          <CommandGroup heading={isRTL ? 'انتقال سريع' : 'Navigate'}>
            {visibleRoutes.slice(0, 40).map((r) => (
              <CommandItem
                key={`route-${r.path}`}
                value={`${r.path} ${labelFor(r.path, isRTL)}`}
                onSelect={() => go(r.path)}
              >
                <span className="truncate">{labelFor(r.path, isRTL)}</span>
                <span className="ms-auto text-[10px] font-mono text-muted-foreground tech-content">{r.path}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {recent.length > 0 && (
          <CommandGroup heading={isRTL ? 'الأخيرة' : 'Recent'}>
            {recent.map((e, i) => (
              <CommandItem
                key={`recent-${i}-${e.path}`}
                value={`${e.ref ?? ''} ${e.label} ${e.path}`}
                onSelect={() => go(e.path)}
              >
                {e.ref && <span className="font-mono text-muted-foreground tech-content me-2">{e.ref}</span>}
                <span className="truncate">{e.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;