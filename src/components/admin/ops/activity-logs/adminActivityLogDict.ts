import {
  Activity, FileText, User, Settings as SettingsIcon, ShieldAlert, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

export interface BilingualLabel { ar: string; en: string }
export interface ActionEntry extends BilingualLabel { icon: LucideIcon }

export const actionConfig: Record<string, ActionEntry> = {
  create: { ar: 'إنشاء', en: 'Create', icon: CheckCircle2 },
  update: { ar: 'تحديث', en: 'Update', icon: SettingsIcon },
  delete: { ar: 'حذف', en: 'Delete', icon: ShieldAlert },
  view: { ar: 'عرض', en: 'View', icon: FileText },
  login: { ar: 'دخول', en: 'Login', icon: User },
};

export const entityLabels: Record<string, BilingualLabel> = {
  user: { ar: 'مستخدم', en: 'User' },
  business: { ar: 'منشأة', en: 'Business' },
  contract: { ar: 'عقد', en: 'Contract' },
  membership: { ar: 'عضوية', en: 'Membership' },
  setting: { ar: 'إعداد', en: 'Setting' },
};

export const tx = {
  title: { ar: 'سجل النشاط', en: 'Activity Log' },
  subtitle: { ar: 'كل ما يحدث في النظام.', en: 'Everything happening across the system.' },
  system: { ar: 'النظام', en: 'System' },
  user: { ar: 'مستخدم', en: 'User' },
  totalOps: { ar: 'إجمالي العمليات', en: 'Total Operations' },
  todayOps: { ar: 'اليوم', en: 'Today' },
  activeAdmins: { ar: 'المشرفون النشطون', en: 'Active Admins' },
  topAction: { ar: 'الإجراء الأبرز', en: 'Top Action' },
  rangeAll: { ar: 'كل الفترات', en: 'All time' },
  range24h: { ar: '24 ساعة', en: 'Last 24h' },
  range7d: { ar: '7 أيام', en: 'Last 7 days' },
  range30d: { ar: '30 يومًا', en: 'Last 30 days' },
  range: { ar: 'الفترة', en: 'Range' },
  searchPh: { ar: 'ابحث…', en: 'Search…' },
  allOps: { ar: 'كل العمليات', en: 'All operations' },
  allEntities: { ar: 'كل الكيانات', en: 'All entities' },
  allAdmins: { ar: 'كل المشرفين', en: 'All admins' },
  results: { ar: 'النتائج', en: 'Results' },
  clearAll: { ar: 'مسح الكل', en: 'Clear all' },
  empty: { ar: 'لا توجد سجلات', en: 'No records' },
  emptySub: { ar: 'حاول تعديل الفلاتر.', en: 'Try adjusting your filters.' },
  loadMore: { ar: 'تحميل المزيد', en: 'Load more' },
  refresh: { ar: 'تحديث', en: 'Refresh' },
  print: { ar: 'طباعة', en: 'Print' },
  exportCsv: { ar: 'تصدير CSV', en: 'Export CSV' },
  liveOn: { ar: 'مباشر', en: 'Live' },
  liveOff: { ar: 'متوقف', en: 'Paused' },
  chartTitle: { ar: 'آخر 24 ساعة', en: 'Last 24 hours' },
  chartEmpty: { ar: 'لا توجد عمليات في آخر 24 ساعة.', en: 'No operations in the last 24 hours.' },
  csvDate: { ar: 'التاريخ', en: 'Date' },
  csvAdmin: { ar: 'المسؤول', en: 'Admin' },
  csvDesc: { ar: 'الوصف', en: 'Description' },
  csvDetails: { ar: 'التفاصيل', en: 'Details' },
  csvFile: { ar: 'سجل-النشاط', en: 'activity-log' },
} as const;

export function pick<T extends BilingualLabel | undefined>(
  entry: T,
  isRTL: boolean,
  fallback: string,
): string {
  if (!entry) return fallback;
  return isRTL ? entry.ar : entry.en;
}

export const activityIcon: LucideIcon = Activity;