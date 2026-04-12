import { Zap, Star, Crown, Building2 } from 'lucide-react';
import type React from 'react';

export const TIERS = ['free', 'basic', 'premium', 'enterprise'] as const;
export type TierKey = (typeof TIERS)[number];

export const tierIcons: Record<string, React.ElementType> = {
  free: Zap, basic: Star, premium: Crown, enterprise: Building2,
};

/** Gradient classes used by the public membership page cards */
export const tierGradients: Record<string, string> = {
  free: 'from-muted-foreground/60 to-muted-foreground/40',
  basic: 'from-primary to-primary/70',
  premium: 'from-accent to-accent/80',
  enterprise: 'from-secondary-foreground/80 to-secondary-foreground/50',
};

/** Rich color tokens used by admin dashboards */
export const tierColors: Record<string, { bg: string; badge: string; border: string; text: string }> = {
  free: { bg: 'bg-muted/40', badge: 'bg-muted text-muted-foreground', border: 'border-border/40', text: 'text-muted-foreground' },
  basic: { bg: 'bg-blue-500/5', badge: 'bg-blue-500/15 text-blue-600', border: 'border-blue-500/20', text: 'text-blue-600' },
  premium: { bg: 'bg-accent/5', badge: 'bg-accent/15 text-accent', border: 'border-accent/20', text: 'text-accent' },
  enterprise: { bg: 'bg-purple-500/5', badge: 'bg-purple-500/15 text-purple-600', border: 'border-purple-500/20', text: 'text-purple-600' },
};

export const statusConfig: Record<string, { badge: string; label_ar: string; label_en: string }> = {
  active: { badge: 'bg-emerald-500/10 text-emerald-600', label_ar: 'نشط', label_en: 'Active' },
  cancelled: { badge: 'bg-destructive/10 text-destructive', label_ar: 'ملغي', label_en: 'Cancelled' },
  expired: { badge: 'bg-muted text-muted-foreground', label_ar: 'منتهي', label_en: 'Expired' },
  replaced: { badge: 'bg-amber-500/10 text-amber-600', label_ar: 'مُحدّث', label_en: 'Replaced' },
};
