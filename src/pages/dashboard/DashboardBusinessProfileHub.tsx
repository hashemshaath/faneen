import { Building2, Eye, MapPinned, ShieldCheck } from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/** NAVIGATION-CONSOLIDATION-1 group 1 — Business Profile hub. */
const DashboardBusinessProfileHub = () => (
  <TabbedShell
    icon={Building2}
    title={{ ar: 'بيانات المنشأة', en: 'Business Profile' }}
    description={{
      ar: 'بيانات المنشأة الأساسية وحسابات الكيانات المرتبطة بها.',
      en: 'Core business profile and linked entity accounts.',
    }}
    tabs={[
      {
        key: 'business',
        label: { ar: 'بيانات المنشأة', en: 'Business Profile' },
        icon: Building2,
        hint: {
          ar: 'البيانات الأساسية للمنشأة والكيانات المرتبطة بها.',
          en: 'Core business profile and linked entity accounts.',
        },
        loader: () => import('./DashboardBusinessProfileMerged'),
      },
      {
        key: 'branches',
        label: { ar: 'الفروع', en: 'Branches' },
        icon: MapPinned,
        hint: {
          ar: 'أنشئ وأدر الفروع، اختر الفرع الرئيسي، واربط الخدمات والعروض بكل فرع.',
          en: 'Create branches, pick the main one, and link services and offers per branch.',
        },
        loader: () => import('./DashboardBranches'),
      },
      {
        key: 'credentials',
        label: { ar: 'الشهادات والجوائز', en: 'Credentials & Awards' },
        icon: ShieldCheck,
        hint: {
          ar: 'أضف الشهادات والاعتمادات والجوائز لتعزيز مصداقية منشأتك.',
          en: 'Add certifications and awards to boost credibility.',
        },
        loader: () => import('./DashboardCredentials'),
      },
      {
        key: 'visibility',
        label: { ar: 'ظهور الأقسام', en: 'Section visibility' },
        icon: Eye,
        hint: {
          ar: 'تحكّم في الأقسام الظاهرة للزوار في صفحة منشأتك العامة.',
          en: 'Control which sections appear on your public business page.',
        },
        loader: () => import('./DashboardBusinessVisibility'),
      },
    ]}
  />
);

export default DashboardBusinessProfileHub;