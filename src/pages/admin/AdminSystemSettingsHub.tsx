import { Cog, BarChart3, Palette, Key } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 17 — System Settings & Integrations. */
const AdminSystemSettingsHub = () => (
  <TabbedShell
    icon={Cog}
    title={{ ar: 'إعدادات النظام والتكاملات', en: 'System Settings & Integrations' }}
    description={{
      ar: 'إعدادات النظام، التحليلات والموافقة، العلامة التجارية، وإعدادات API.',
      en: 'System settings, analytics & consent, branding, and API settings.',
    }}
    noIndex
    tabs={[
      { key: 'system', label: { ar: 'النظام', en: 'System' }, icon: Cog, loader: () => import('./AdminSystemSettings') },
      { key: 'analytics', label: { ar: 'التحليلات والموافقة', en: 'Analytics & Consent' }, icon: BarChart3, loader: () => import('./AdminAnalyticsSettings') },
      { key: 'branding', label: { ar: 'العلامة التجارية', en: 'Branding' }, icon: Palette, loader: () => import('./AdminBranding') },
      { key: 'api', label: { ar: 'إعدادات API', en: 'API Settings' }, icon: Key, loader: () => import('./AdminApiSettings') },
    ]}
  />
);

export default AdminSystemSettingsHub;