/**
 * SERVICE-ACTIVATION-GOVERNANCE-1 — Shared display helpers for
 * effective service status. Used by every UI surface that renders a
 * service status badge so the wording, color, and meaning stay
 * identical across provider page, admin page, search, and profile.
 */
import type { EffectiveServiceStatus } from './resolveServiceEntitlement';

export function effectiveStatusLabel(
  status: EffectiveServiceStatus,
  isRTL: boolean,
): string {
  const ar: Record<EffectiveServiceStatus, string> = {
    active: 'مفعّلة',
    paused: 'متوقفة',
    hidden: 'مخفية',
    disabled: 'موقوفة من الإدارة',
    upgrade_required: 'تتطلب ترقية',
    quota_exceeded: 'تجاوزت حد الباقة',
    pending_review: 'قيد المراجعة',
  };
  const en: Record<EffectiveServiceStatus, string> = {
    active: 'Active',
    paused: 'Paused',
    hidden: 'Hidden',
    disabled: 'Suspended by admin',
    upgrade_required: 'Upgrade required',
    quota_exceeded: 'Plan limit reached',
    pending_review: 'Pending review',
  };
  return (isRTL ? ar : en)[status];
}

export function effectiveStatusBadgeClass(status: EffectiveServiceStatus): string {
  switch (status) {
    case 'active':
      return 'bg-success/10 text-success border-success/30';
    case 'paused':
      return 'bg-muted text-muted-foreground border-border/40';
    case 'pending_review':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'upgrade_required':
    case 'quota_exceeded':
      return 'bg-accent/10 text-accent border-accent/30';
    case 'disabled':
    case 'hidden':
      return 'bg-destructive/10 text-destructive border-destructive/30';
  }
}