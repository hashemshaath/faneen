import { Cog, LayoutGrid, Palette, Fingerprint, Plug, Bell, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 10 — Settings Center.
 *
 * Unified entry for system settings. Tabs either embed existing settings
 * pages (which already enforce their own auth gates) or render a small
 * landing of links to legacy routes. No queries / mutations / service
 * calls are added here.
 */
const AdminSettingsCenter = () => (
  <TabbedShell
    icon={Cog}
    title={{ ar: 'الإعدادات', en: 'Settings' }}
    description={{
      ar: 'مركز موحد لإعدادات النظام والعلامة والهوية والتكاملات والتنبيهات والأمان.',
      en: 'Unified center for system, branding, identity, integrations, notifications, and security settings.',
    }}
    noIndex
    tabs={[
      { key: 'overview', label: { ar: 'نظرة عامة', en: 'Overview' }, icon: LayoutGrid, loader: () => import('@/components/admin/centers/settings/SettingsOverviewLanding') },
      { key: 'general', label: { ar: 'عام', en: 'General' }, icon: Cog, loader: () => import('./AdminSystemSettings') },
      { key: 'branding', label: { ar: 'العلامة', en: 'Branding' }, icon: Palette, loader: () => import('./AdminBranding') },
      { key: 'identity', label: { ar: 'الهوية', en: 'Identity' }, icon: Fingerprint, loader: () => import('@/components/admin/centers/settings/IdentityLanding') },
      { key: 'integrations', label: { ar: 'التكاملات', en: 'Integrations' }, icon: Plug, loader: () => import('./AdminIntegrations') },
      { key: 'notifications', label: { ar: 'التنبيهات', en: 'Notifications' }, icon: Bell, loader: () => import('@/components/admin/centers/settings/NotificationsLanding') },
      { key: 'security', label: { ar: 'الأمان', en: 'Security' }, icon: ShieldCheck, loader: () => import('@/components/admin/centers/settings/SecurityLanding') },
      { key: 'advanced', label: { ar: 'متقدم', en: 'Advanced' }, icon: SlidersHorizontal, loader: () => import('@/components/admin/centers/settings/AdvancedLanding') },
    ]}
  />
);

export default AdminSettingsCenter;