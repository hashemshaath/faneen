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
  basic: { bg: 'bg-info/5', badge: 'bg-info/15 text-info', border: 'border-info/20', text: 'text-info' },
  premium: { bg: 'bg-accent/5', badge: 'bg-accent/15 text-accent', border: 'border-accent/20', text: 'text-accent' },
  enterprise: { bg: 'bg-secondary/5', badge: 'bg-secondary/15 text-secondary', border: 'border-secondary/20', text: 'text-secondary' },
};

export const statusConfig: Record<string, { badge: string; label_ar: string; label_en: string }> = {
  active: { badge: 'bg-success/10 text-success', label_ar: 'نشط', label_en: 'Active' },
  cancelled: { badge: 'bg-destructive/10 text-destructive', label_ar: 'ملغي', label_en: 'Cancelled' },
  expired: { badge: 'bg-muted text-muted-foreground', label_ar: 'منتهي', label_en: 'Expired' },
  replaced: { badge: 'bg-warning/10 text-warning', label_ar: 'مُحدّث', label_en: 'Replaced' },
};
