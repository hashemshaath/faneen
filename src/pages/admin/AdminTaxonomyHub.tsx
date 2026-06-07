import { FolderTree, Tags, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TabbedShell } from '@/components/dashboard/TabbedShell';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Phase 8 — Legacy taxonomy hub. Kept for reference only; the official
 * source of truth is now `/admin/taxonomy`. Banner makes the demotion
 * explicit and links admins to the central center.
 */
const LegacyBanner: React.FC = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 mb-3 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-bold text-amber-900 dark:text-amber-200">
          {isRTL ? 'صفحة قديمة — للقراءة والمراجعة فقط' : 'Legacy page — read-only review'}
        </div>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-1">
          {isRTL
            ? 'هذه الصفحة تستخدم نظام التصنيفات القديم. المصدر الرسمي الجديد هو مركز التصنيفات. استخدم هذه الصفحة فقط للمراجعة المؤقتة حتى اكتمال الهجرة.'
            : 'This page uses the legacy taxonomy system. The new official source is the Taxonomy Center. Use this page only for temporary review until migration completes.'}
        </p>
      </div>
      <Link
        to="/admin/taxonomy"
        className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shrink-0"
      >
        {isRTL ? 'فتح مركز التصنيفات' : 'Open Taxonomy Center'}
        <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
      </Link>
    </div>
  );
};

/** NAVIGATION-CONSOLIDATION-1 group 15 — Legacy categories & tags (deprecated). */
const AdminTaxonomyHub = () => (
  <div>
    <LegacyBanner />
    <TabbedShell
      icon={FolderTree}
      title={{ ar: 'التصنيفات القديمة (Legacy)', en: 'Legacy Categories' }}
      description={{
        ar: 'النظام القديم — للقراءة والمراجعة فقط. الإدارة الرسمية في مركز التصنيفات.',
        en: 'Legacy system — read-only review. Official management lives in the Taxonomy Center.',
      }}
      noIndex
      tabs={[
        { key: 'categories', label: { ar: 'التصنيفات', en: 'Categories' }, icon: FolderTree, loader: () => import('./AdminCategories') },
        { key: 'tags', label: { ar: 'الوسوم', en: 'Tags' }, icon: Tags, loader: () => import('./AdminTags') },
      ]}
    />
  </div>
);

export default AdminTaxonomyHub;