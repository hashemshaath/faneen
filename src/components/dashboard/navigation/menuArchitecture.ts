/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1
 *
 * Single source of truth for sidebar-adjacent navigation surfaces
 * (Quick Create, labels glossary, route classification). The actual
 * sidebar groups still live in `DashboardSidebar.tsx` so we don't
 * regress route safety while we migrate; this module is what new
 * features (favorites, recent, command palette, tests) consume.
 *
 * Hard rules enforced by `navigationArchitectureRebuild1.test.ts`:
 *  - every `url` here MUST resolve to a registered route in App.tsx
 *  - no duplicate `id`s across quickCreateActions
 *  - icon is always a Lucide component (no inline JSX)
 */
import type { ComponentType } from 'react';
import {
  FileText,
  ClipboardList,
  Inbox,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

export type Bilingual = { ar: string; en: string };

export interface QuickCreateAction {
  id: string;
  label: Bilingual;
  url: string;
  icon: ComponentType<{ className?: string }>;
  /** Audience hint — used to filter when role-based filtering lands. */
  audience: ReadonlyArray<'provider' | 'admin' | 'user'>;
}

/**
 * Quick Create — five always-visible shortcuts at the top of the sidebar.
 * Each URL is an existing registered route (verified by tests).
 */
export const quickCreateActions: ReadonlyArray<QuickCreateAction> = [
  {
    id: 'qc-contract',
    label: { ar: 'عقد جديد', en: 'New contract' },
    url: '/dashboard/contracts',
    icon: FileText,
    audience: ['provider', 'admin'],
  },
  {
    id: 'qc-quote',
    label: { ar: 'عرض سعر', en: 'New quote' },
    url: '/dashboard/rfq',
    icon: Receipt,
    audience: ['provider', 'admin'],
  },
  {
    id: 'qc-work-order',
    label: { ar: 'أمر عمل', en: 'New work order' },
    url: '/dashboard/work-orders',
    icon: ClipboardList,
    audience: ['provider', 'admin'],
  },
  {
    id: 'qc-rfq',
    label: { ar: 'طلب RFQ', en: 'New RFQ' },
    url: '/dashboard/rfq/inbox',
    icon: Inbox,
    audience: ['provider', 'admin'],
  },
  {
    id: 'qc-report',
    label: { ar: 'بلاغ', en: 'Report issue' },
    url: '/help/report-issue',
    icon: AlertTriangle,
    audience: ['provider', 'admin', 'user'],
  },
];

/**
 * Recommended group order — used by docs and tests as the canonical IA.
 * The sidebar must surface these groups in this order, but routes that
 * fall outside this list stay where they are (legacy compatibility).
 */
export const recommendedGroupOrder: ReadonlyArray<string> = [
  'Overview',
  'Sales & Customers',
  'Contracts & Execution',
  'Production & Operations',
  'Procurement',
  'Quality & Customer',
  'Growth & Marketing',
  'Memberships & Payments',
  'Communications',
  'Content & SEO',
  'Operations & Insights',
  'Users & Businesses',
  'Help',
  'Settings & Integrations',
  'Account',
];

/**
 * Filter quick-create actions by audience. Admins see everything providers
 * see — same surface, same shortcuts.
 */
export function quickCreateFor(
  audience: 'provider' | 'admin' | 'user',
): ReadonlyArray<QuickCreateAction> {
  if (audience === 'admin') {
    return quickCreateActions.filter((a) => a.audience.includes('admin') || a.audience.includes('provider'));
  }
  return quickCreateActions.filter((a) => a.audience.includes(audience));
}