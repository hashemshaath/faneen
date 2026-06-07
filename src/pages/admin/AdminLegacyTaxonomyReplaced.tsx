import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Database } from 'lucide-react';

/**
 * Replacement notice for the legacy /admin/categories and /admin/tags routes.
 * The legacy CRUD UIs (AdminCategories, AdminTags, AdminTaxonomyHub) are no
 * longer reachable from the admin UI — taxonomy management has moved to
 * /admin/taxonomy. Routes are kept alive so older bookmarks/links don't 404.
 */
export default function AdminLegacyTaxonomyReplaced() {
  const { isRTL } = useLanguage();
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="border-amber-200 dark:border-amber-900/40">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">
              {isRTL ? 'تم استبدال هذه الصفحة' : 'This page has been replaced'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {isRTL
              ? 'أصبح مركز التصنيفات هو المصدر الرسمي لإدارة التصنيفات والقوائم المرجعية في قطاعات. يرجى استخدام مركز التصنيفات الجديد لإدارة التصنيفات والوسوم.'
              : 'The Taxonomy Center is now the official source for managing classifications and reference lists in Qitaat. Please use the new Taxonomy Center to manage categories and tags.'}
          </p>
          <Button asChild size="lg" className="h-12 rounded-xl">
            <Link to="/admin/taxonomy">
              <Database className="h-5 w-5 me-2" />
              {isRTL ? 'فتح مركز التصنيفات' : 'Open Taxonomy Center'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}