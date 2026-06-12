import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { UsernameCheckReason } from '@/components/common/UsernamePicker';

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

/* `KpiCard` (local PR-2 primitive) removed in PR-7 — every tab now uses the
 * canonical `<AdminKpiCard>` from `@/components/admin/AdminKpiCard`. */

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

export type AccountTypePiePoint = { name: string; value: number; color: string };
export type TierBarPoint = { name: string; count: number };

export type SortKey = 'created_at' | 'full_name' | 'membership_tier' | 'account_type';
export type SortDir = 'asc' | 'desc';
export type Density = 'comfortable' | 'compact';
export type FilterScope = 'all' | 'staff' | 'disabled';
export type FilterBusinessLink = 'all' | 'multi' | 'none' | 'single';

/** Controlled form state for the inline "Create User" panel. */
export type CreateUserForm = {
  email: string;
  password: string;
  full_name: string;
  full_name_ar: string;
  full_name_en: string;
  username: string;
  phone: string;
  phone_country_code: string;
  phone_national: string;
  account_type: string;
  membership_tier: string;
  role: string;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Business link types — used by the UserEditPanel and the per-row detail view.
 * Kept pure (no runtime deps) so they can be imported by both the parent page
 * and extracted child components without creating an import cycle.
 * ─────────────────────────────────────────────────────────────────────────── */
export type StaffRole = 'owner' | 'manager' | 'editor' | 'viewer';

export type BusinessInfo = {
  id: string;
  user_id: string;
  name_ar: string;
  name_en: string | null;
  ref_id: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
  membership_tier: string;
  business_number: number;
};

export type BusinessLink = {
  business: BusinessInfo;
  role: StaffRole;
  staffId: string | null;
  isOwnerByEntity: boolean;
  isActive: boolean;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Edit-panel form state — shared between AdminUsers (state owner) and
 * UserEditPanel (controlled child). PR-6 keeps state + mutations in the parent
 * so the `?focus=` URL effect and `updateProfileMutation.onError` handler
 * continue to work without re-wiring.
 * ─────────────────────────────────────────────────────────────────────────── */
export type EditUserForm = {
  full_name: string;
  full_name_ar: string;
  full_name_en: string;
  username: string;
  account_type: string;
  membership_tier: string;
  phone: string;
  phone_country_code: string;
  phone_national: string;
  email: string;
};

export type EditFieldErrors = {
  full_name_ar?: string;
  full_name_en?: string;
  username?: string;
  email?: string;
  phone?: string;
};

export type EditFieldRawCodes = {
  username?: string;
  email?: string;
  phone?: string;
};

export type UsernameServerError = {
  forValue: string;
  reason: UsernameCheckReason;
  rawCode?: string | null;
};

export type SuspendForm = {
  mode: 'temporary' | 'permanent';
  until: string;
  reason: string;
};

export type LinkForm = {
  businessId: string;
  role: StaffRole;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * EmailLiveHint — shared debounced (450ms) live format validation for email.
 * Rendered ABOVE the email input so the user sees the status instantly after
 * they stop typing. Uses the unified `useDebouncedValue` hook so every field
 * (username, email, phone) shares the same 450ms timing.
 * ─────────────────────────────────────────────────────────────────────────── */
export const EmailLiveHint: React.FC<{ value: string; isRTL: boolean }> = ({ value, isRTL }) => {
  const debounced = useDebouncedValue(value);
  if (!debounced) return <div data-testid="email-live-hint" className="min-h-[1rem]" />;
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(debounced.trim());
  return (
    <div data-testid="email-live-hint" className="min-h-[1rem] text-[11px] flex items-center gap-1.5">
      {ok ? (
        <span className="text-success">{pickBi(isRTL, '✓ تنسيق صالح', '✓ Valid format')}</span>
      ) : (
        <span className="text-destructive flex items-center gap-1.5">
          <span>{pickBi(isRTL, 'تنسيق غير صحيح', 'Invalid format')}</span>
          <code className="tech-content text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/20">
            invalid_format
          </code>
        </span>
      )}
    </div>
  );
};
