import React from 'react';
import { Link } from 'react-router-dom';
import {
  X, Mail, Phone, Calendar, Building2, Activity, Hash, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { pickBi } from '@/components/common/Bilingual';
import { UserStatusBadge, pickUserStatusVariant } from './UserStatusBadge';
import type { AdminUserRow } from './types';

export interface UserDetailsDrawerLinkedEntity {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  ref_id: string | null;
  username: string | null;
  role: string | null;
}

export interface UserDetailsDrawerActivityItem {
  id: string;
  action: string;
  created_at: string;
}

export interface UserDetailsDrawerProps {
  open: boolean;
  isRTL: boolean;
  user: AdminUserRow | null;
  roles: ReadonlyArray<string>;
  linkedEntities: ReadonlyArray<UserDetailsDrawerLinkedEntity>;
  recentActivity?: ReadonlyArray<UserDetailsDrawerActivityItem>;
  /** Email already sanitized of synthetic phone-login identifiers. */
  officialEmail?: string | null;
  onClose: () => void;
}

/**
 * Phase 6A — read-only quick-view drawer for a user row.
 *
 * Rendered inline (not a Radix dialog/sheet) per the project's strict
 * no-popups policy: an overlay-free side panel pinned to the page,
 * easy to dismiss with the close button. Pure presentational — never
 * mutates a profile, never edits roles, never calls Supabase. The
 * parent passes already-derived data slices.
 */
export const UserDetailsDrawer = React.memo(function UserDetailsDrawer({
  open,
  isRTL,
  user,
  roles,
  linkedEntities,
  recentActivity = [],
  officialEmail,
  onClose,
}: UserDetailsDrawerProps) {
  if (!open || !user) return null;

  const displayName = pickBi(
    isRTL,
    user.full_name_ar ?? user.full_name ?? user.username ?? '',
    user.full_name_en ?? user.full_name ?? user.username ?? '',
  );
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const statusVariant = pickUserStatusVariant(user);

  return (
    <aside
      className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3 animate-in slide-in-from-top-2 duration-200"
      aria-label={pickBi(isRTL, 'تفاصيل المستخدم', 'User details')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={undefined} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{displayName || '—'}</p>
            <p className="text-[11px] text-muted-foreground tech-content flex items-center gap-1.5">
              {user.ref_id && (
                <span className="inline-flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{user.ref_id}</span>
                </span>
              )}
              {user.username && <span>· @{user.username}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserStatusBadge variant={statusVariant} isRTL={isRTL} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={onClose}
            aria-label={pickBi(isRTL, 'إغلاق', 'Close')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <section aria-label={pickBi(isRTL, 'بيانات الحساب', 'Account info')}>
        <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
          {pickBi(isRTL, 'بيانات الحساب', 'Account info')}
        </p>
        <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg border border-border/40 p-2">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
              <Mail className="w-3 h-3" /> {pickBi(isRTL, 'البريد الرسمي', 'Official email')}
            </p>
            <p className="font-medium tech-content break-all">{officialEmail || '—'}</p>
          </div>
          <div className="rounded-lg border border-border/40 p-2">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {pickBi(isRTL, 'الهاتف', 'Phone')}
            </p>
            <p className="font-medium tech-content">{user.phone || '—'}</p>
          </div>
          <div className="rounded-lg border border-border/40 p-2">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {pickBi(isRTL, 'تاريخ التسجيل', 'Joined')}
            </p>
            <p className="font-medium tech-content">
              {new Date(user.created_at).toLocaleDateString(
                pickBi(isRTL, 'ar-SA-u-nu-latn', 'en'),
              )}
            </p>
          </div>
        </div>
      </section>

      {roles.length > 0 && (
        <section aria-label={pickBi(isRTL, 'الأدوار', 'Roles')}>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
            {pickBi(isRTL, 'الأدوار', 'Roles')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => {
              const variant =
                r === 'super_admin' ? 'super_admin'
                  : r === 'admin' ? 'admin'
                  : r === 'moderator' ? 'moderator'
                  : 'customer';
              return <UserStatusBadge key={r} variant={variant} isRTL={isRTL} />;
            })}
          </div>
        </section>
      )}

      {linkedEntities.length > 0 && (
        <section aria-label={pickBi(isRTL, 'المنشآت المرتبطة', 'Linked entities')}>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {isRTL
              ? `المنشآت المرتبطة (${linkedEntities.length})`
              : `Linked entities (${linkedEntities.length})`}
          </p>
          <div className="space-y-1 max-h-44 overflow-auto">
            {linkedEntities.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-lg border border-border/30 px-2 py-1.5 text-[11px]"
              >
                <Building2 className="w-3 h-3 text-success shrink-0" />
                <span className="truncate flex-1 font-medium">
                  {pickBi(isRTL, b.name_ar || b.name_en || '—', b.name_en || b.name_ar || '—')}
                </span>
                {b.ref_id && (
                  <span className="font-mono tech-content text-success shrink-0">{b.ref_id}</span>
                )}
                {b.role && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {b.role}
                  </Badge>
                )}
                {b.username && (
                  <Button asChild size="icon" variant="ghost" className="h-6 w-6 rounded-md" aria-label="Open">
                    <Link to={`/${b.username}`} target="_blank" rel="noreferrer">
                      <Link2 className="w-3 h-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {recentActivity.length > 0 && (
        <section aria-label={pickBi(isRTL, 'النشاط الأخير', 'Recent activity')}>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {pickBi(isRTL, 'النشاط الأخير', 'Recent activity')}
          </p>
          <ul className="space-y-1 text-[11px]">
            {recentActivity.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/30 px-2 py-1.5"
              >
                <span className="truncate">{a.action}</span>
                <span className="text-muted-foreground tech-content shrink-0">
                  {new Date(a.created_at).toLocaleDateString(
                    pickBi(isRTL, 'ar-SA-u-nu-latn', 'en'),
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
});