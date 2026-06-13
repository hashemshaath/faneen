import {
  Users,
  Crown,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  Building2,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type React from 'react';

/**
 * Phase 6C — page-scoped configs + types shared by the extracted
 * `UserListRow`, `UserDetailPanel`, and the parent `AdminUsers` page.
 * Pure data only: no Supabase imports, no side effects, no mutations.
 */

export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;

export const staffRoleConfig = {
  owner:   { ar: 'مالك',  en: 'Owner',   color: 'bg-success/15 text-success border-success/40 dark:text-success' },
  manager: { ar: 'مدير',  en: 'Manager', color: 'bg-info/15 text-info border-info/40 dark:text-info' },
  editor:  { ar: 'محرر',  en: 'Editor',  color: 'bg-warning/15 text-warning border-warning/40 dark:text-warning' },
  viewer:  { ar: 'مشاهد', en: 'Viewer',  color: 'bg-muted text-muted-foreground border-border' },
} as const;

export const roleConfig = {
  super_admin: { icon: ShieldAlert, badge: 'bg-secondary text-white dark:bg-secondary dark:text-white border-secondary', iconBg: 'bg-secondary/15 text-secondary dark:text-secondary', labelAr: 'مشرف أعلى', labelEn: 'Super Admin', rank: 0 },
  admin:       { icon: Crown,       badge: 'bg-destructive text-white dark:bg-destructive dark:text-white border-destructive', iconBg: 'bg-destructive/15 text-destructive dark:text-destructive', labelAr: 'مشرف', labelEn: 'Admin', rank: 1 },
  moderator:   { icon: ShieldCheck, badge: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning border-warning dark:border-warning', iconBg: 'bg-warning/15 text-warning dark:text-warning', labelAr: 'مشرف محتوى', labelEn: 'Moderator', rank: 2 },
  user:        { icon: Users,       badge: 'bg-info text-info dark:bg-info/30 dark:text-info border-info dark:border-info', iconBg: 'bg-info/15 text-info dark:text-info', labelAr: 'مستخدم', labelEn: 'User', rank: 3 },
} as const;

export const tierConfig = {
  free:       { labelAr: 'مجاني',  labelEn: 'Free',       color: 'bg-muted text-muted-foreground border-border' },
  basic:      { labelAr: 'أساسي',  labelEn: 'Basic',      color: 'bg-info text-info dark:bg-info/20 dark:text-info border-info dark:border-info' },
  premium:    { labelAr: 'مميز',   labelEn: 'Premium',    color: 'bg-accent/10 text-accent border-accent/30' },
  enterprise: { labelAr: 'مؤسسات', labelEn: 'Enterprise', color: 'bg-secondary text-secondary dark:bg-secondary/20 dark:text-secondary border-secondary dark:border-secondary' },
} as const;

export const accountTypeConfig: Record<
  string,
  { labelAr: string; labelEn: string; icon: React.ElementType; color: string }
> = {
  individual: { labelAr: 'فرد',       labelEn: 'Individual', icon: Users,     color: 'text-info bg-info/10 border-info dark:border-info' },
  business:   { labelAr: 'مزود خدمة', labelEn: 'Provider',   icon: Briefcase, color: 'text-success bg-success/10 border-success dark:border-success' },
  company:    { labelAr: 'شركة',      labelEn: 'Company',    icon: Building2, color: 'text-secondary bg-secondary/10 border-secondary dark:border-secondary' },
};