/**
 * Structured membership plan limits configuration.
 * Used by admin plan editor and enforcement logic.
 */

export interface LimitField {
  key: string;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
  type: 'number' | 'boolean';
  /** Default value when not set */
  defaultValue: number | boolean;
  /** Icon name from lucide-react (for display) */
  icon: string;
  /** Category grouping */
  category: 'visibility' | 'content' | 'operations' | 'support';
}

export const LIMIT_FIELDS: LimitField[] = [
  // ── Visibility & Promotion ──
  {
    key: 'max_featured_ads',
    label: { ar: 'الإعلانات المميزة', en: 'Featured Ads' },
    description: { ar: 'عدد الإعلانات المميزة المسموح بها شهرياً', en: 'Number of featured ads allowed per month' },
    type: 'number', defaultValue: 0, icon: 'Megaphone', category: 'visibility',
  },
  {
    key: 'homepage_visibility',
    label: { ar: 'الظهور في الصفحة الرئيسية', en: 'Homepage Visibility' },
    description: { ar: 'إظهار النشاط التجاري في قسم "مزودي الخدمات" بالصفحة الرئيسية', en: 'Show business in "Top Providers" section on homepage' },
    type: 'boolean', defaultValue: false, icon: 'Home', category: 'visibility',
  },
  {
    key: 'search_priority',
    label: { ar: 'أولوية الظهور في البحث', en: 'Search Priority Boost' },
    description: { ar: 'مستوى أولوية الظهور في نتائج البحث (0=عادي، 1-10=مرتفع)', en: 'Search result ranking boost (0=normal, 1-10=high)' },
    type: 'number', defaultValue: 0, icon: 'TrendingUp', category: 'visibility',
  },
  {
    key: 'suggested_services',
    label: { ar: 'خدمات مقترحة', en: 'Suggested Services' },
    description: { ar: 'إظهار الخدمات في قسم "الخدمات المقترحة" للعملاء', en: 'Show services in "Suggested Services" section for clients' },
    type: 'boolean', defaultValue: false, icon: 'Sparkles', category: 'visibility',
  },
  {
    key: 'profile_badge',
    label: { ar: 'شارة العضوية المميزة', en: 'Premium Profile Badge' },
    description: { ar: 'إظهار شارة مميزة على الملف الشخصي', en: 'Display premium badge on business profile' },
    type: 'boolean', defaultValue: false, icon: 'Award', category: 'visibility',
  },

  // ── Content & Portfolio ──
  {
    key: 'max_projects',
    label: { ar: 'المشاريع في المعرض', en: 'Portfolio Projects' },
    description: { ar: 'الحد الأقصى لعدد مشاريع معرض الأعمال', en: 'Maximum portfolio projects allowed' },
    type: 'number', defaultValue: 5, icon: 'FolderOpen', category: 'content',
  },
  {
    key: 'max_services',
    label: { ar: 'الخدمات المعروضة', en: 'Listed Services' },
    description: { ar: 'عدد الخدمات المسموح بعرضها', en: 'Number of services that can be listed' },
    type: 'number', defaultValue: 5, icon: 'Wrench', category: 'content',
  },
  {
    key: 'max_promotions',
    label: { ar: 'العروض الترويجية', en: 'Promotions' },
    description: { ar: 'عدد العروض الترويجية النشطة في نفس الوقت', en: 'Number of active promotions at the same time' },
    type: 'number', defaultValue: 0, icon: 'Tag', category: 'content',
  },
  {
    key: 'max_blog_posts',
    label: { ar: 'مقالات المدونة', en: 'Blog Posts' },
    description: { ar: 'عدد المقالات المسموح بنشرها شهرياً', en: 'Number of blog posts allowed per month' },
    type: 'number', defaultValue: 0, icon: 'Newspaper', category: 'content',
  },

  // ── Operations ──
  {
    key: 'max_contracts',
    label: { ar: 'العقود الشهرية', en: 'Monthly Contracts' },
    description: { ar: 'الحد الأقصى للعقود الجديدة شهرياً (0=غير محدود)', en: 'Max new contracts per month (0=unlimited)' },
    type: 'number', defaultValue: 3, icon: 'FileText', category: 'operations',
  },
  {
    key: 'max_branches',
    label: { ar: 'الفروع', en: 'Branches' },
    description: { ar: 'عدد الفروع المسموح بإضافتها', en: 'Number of branches allowed' },
    type: 'number', defaultValue: 1, icon: 'MapPin', category: 'operations',
  },
  {
    key: 'max_staff',
    label: { ar: 'أعضاء الفريق', en: 'Team Members' },
    description: { ar: 'عدد أعضاء الفريق المسموح بإضافتهم للحساب', en: 'Number of team members that can be added' },
    type: 'number', defaultValue: 1, icon: 'Users', category: 'operations',
  },
  {
    key: 'max_bookings_daily',
    label: { ar: 'الحجوزات اليومية', en: 'Daily Bookings' },
    description: { ar: 'الحد الأقصى للحجوزات اليومية (0=غير محدود)', en: 'Max daily bookings (0=unlimited)' },
    type: 'number', defaultValue: 10, icon: 'CalendarDays', category: 'operations',
  },
  {
    key: 'bnpl_enabled',
    label: { ar: 'التقسيط (BNPL)', en: 'BNPL (Buy Now Pay Later)' },
    description: { ar: 'تفعيل خيارات التقسيط للعملاء', en: 'Enable installment payment options for clients' },
    type: 'boolean', defaultValue: false, icon: 'CreditCard', category: 'operations',
  },
  {
    key: 'analytics_enabled',
    label: { ar: 'التحليلات المتقدمة', en: 'Advanced Analytics' },
    description: { ar: 'الوصول للوحة التحليلات والتقارير المتقدمة', en: 'Access to advanced analytics and reporting dashboard' },
    type: 'boolean', defaultValue: false, icon: 'BarChart3', category: 'operations',
  },

  // ── Support ──
  {
    key: 'priority_support',
    label: { ar: 'دعم ذو أولوية', en: 'Priority Support' },
    description: { ar: 'الحصول على دعم فني بأولوية مرتفعة', en: 'Get priority technical support' },
    type: 'boolean', defaultValue: false, icon: 'Headphones', category: 'support',
  },
  {
    key: 'dedicated_manager',
    label: { ar: 'مدير حساب مخصص', en: 'Dedicated Account Manager' },
    description: { ar: 'تعيين مدير حساب مخصص للمتابعة', en: 'Assign a dedicated account manager' },
    type: 'boolean', defaultValue: false, icon: 'UserCheck', category: 'support',
  },
  {
    key: 'performance_reports',
    label: { ar: 'تقارير الأداء الدورية', en: 'Performance Reports' },
    description: { ar: 'استلام تقارير أداء دورية شهرية', en: 'Receive monthly performance reports' },
    type: 'boolean', defaultValue: false, icon: 'TrendingUp', category: 'support',
  },
];

export const LIMIT_CATEGORIES = [
  { key: 'visibility' as const, label: { ar: 'الظهور والترويج', en: 'Visibility & Promotion' } },
  { key: 'content' as const, label: { ar: 'المحتوى والمعرض', en: 'Content & Portfolio' } },
  { key: 'operations' as const, label: { ar: 'العمليات والإدارة', en: 'Operations & Management' } },
  { key: 'support' as const, label: { ar: 'الدعم والمتابعة', en: 'Support & Follow-up' } },
];

/** Extract limits from a plan's JSON limits field, applying defaults */
export function parseLimits(limits: Record<string, any> | null | undefined): Record<string, number | boolean> {
  const result: Record<string, number | boolean> = {};
  for (const field of LIMIT_FIELDS) {
    const val = limits?.[field.key];
    if (val !== undefined && val !== null) {
      result[field.key] = field.type === 'boolean' ? Boolean(val) : Number(val);
    } else {
      result[field.key] = field.defaultValue;
    }
  }
  return result;
}

/** Convert structured limits back to a plain object for DB storage */
export function limitsToJson(limits: Record<string, number | boolean>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of LIMIT_FIELDS) {
    const val = limits[field.key];
    if (val !== undefined && val !== field.defaultValue) {
      result[field.key] = val;
    }
  }
  return result;
}
