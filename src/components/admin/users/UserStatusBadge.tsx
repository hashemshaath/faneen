import React from 'react';
import { Badge } from '@/components/ui/badge';
import { pickBi } from '@/components/common/Bilingual';
import {
  ShieldAlert, Crown, ShieldCheck, Users, Briefcase, UserCheck, UserX, Clock,
} from 'lucide-react';

export type UserStatusBadgeVariant =
  | 'active'
  | 'suspended'
  | 'pending'
  | 'admin'
  | 'super_admin'
  | 'moderator'
  | 'provider'
  | 'customer';

interface BadgeVariantConfig {
  icon: React.ElementType;
  classes: string;
  ar: string;
  en: string;
}

const VARIANT_CONFIG: Record<UserStatusBadgeVariant, BadgeVariantConfig> = {
  active: {
    icon: UserCheck,
    classes: 'bg-success/15 text-success border-success/40',
    ar: 'نشط',
    en: 'Active',
  },
  suspended: {
    icon: UserX,
    classes: 'bg-destructive/15 text-destructive border-destructive/40',
    ar: 'موقوف',
    en: 'Suspended',
  },
  pending: {
    icon: Clock,
    classes: 'bg-warning/15 text-warning border-warning/40',
    ar: 'غير مكتمل',
    en: 'Pending',
  },
  super_admin: {
    icon: ShieldAlert,
    classes: 'bg-secondary/15 text-secondary border-secondary/40',
    ar: 'مشرف أعلى',
    en: 'Super Admin',
  },
  admin: {
    icon: Crown,
    classes: 'bg-accent/15 text-accent border-accent/40',
    ar: 'مشرف',
    en: 'Admin',
  },
  moderator: {
    icon: ShieldCheck,
    classes: 'bg-warning/15 text-warning border-warning/40',
    ar: 'مشرف محتوى',
    en: 'Moderator',
  },
  provider: {
    icon: Briefcase,
    classes: 'bg-info/15 text-info border-info/40',
    ar: 'مزود خدمة',
    en: 'Provider',
  },
  customer: {
    icon: Users,
    classes: 'bg-muted text-muted-foreground border-border',
    ar: 'عميل',
    en: 'Customer',
  },
};

export interface UserStatusBadgeProps {
  variant: UserStatusBadgeVariant;
  isRTL: boolean;
  className?: string;
  withIcon?: boolean;
}

/**
 * Phase 6A — unified status badge for the AdminUsers surface.
 *
 * Replaces the ad-hoc colored badges that were sprinkled across the
 * page (role tags, banned dots, account-type chips) with a single
 * presentational component that uses semantic design tokens only —
 * never raw hex — and ships with bilingual labels.
 */
export const UserStatusBadge = React.memo(function UserStatusBadge({
  variant,
  isRTL,
  className,
  withIcon = true,
}: UserStatusBadgeProps) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={`${cfg.classes} text-[10px] gap-1 px-1.5 py-0 inline-flex items-center ${className ?? ''}`}
    >
      {withIcon && <Icon className="w-3 h-3" aria-hidden="true" />}
      <span>{pickBi(isRTL, cfg.ar, cfg.en)}</span>
    </Badge>
  );
});

/**
 * Phase 6A — derive the canonical badge variant for a profile row
 * given its `is_banned` / `is_onboarded` / `account_type` flags.
 * Status (active/suspended/pending) takes precedence; role/type
 * badges are picked separately by the caller.
 */
export function pickUserStatusVariant(profile: {
  is_banned?: boolean | null;
  is_onboarded?: boolean | null;
}): UserStatusBadgeVariant {
  if (profile.is_banned) return 'suspended';
  if (!profile.is_onboarded) return 'pending';
  return 'active';
}