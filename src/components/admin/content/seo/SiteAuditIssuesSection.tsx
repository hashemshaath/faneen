import React, { useMemo } from 'react';
import { Wrench, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Severity = 'high' | 'medium' | 'low';

interface Issue {
  url: string;
  category: string;
  severity: Severity;
  problem_ar: string;
  problem_en: string;
  fix_ar: string;
  fix_en: string;
}

function buildIssues(pages: ReadonlyArray<Record<string, unknown>>): Issue[] {
  const issues: Issue[] = [];
  for (const p of pages) {
    const url = String(p.url ?? '');
    const titleLen = Number(p.title_length) || 0;
    const descLen = Number(p.description_length) || 0;
    const h1Count = Number(p.h1_count) || 0;

    if (!p.has_title || titleLen === 0) {
      issues.push({ url, category: 'meta', severity: 'high',
        problem_ar: 'لا يوجد وسم <title>',
        problem_en: 'Missing <title> tag',
        fix_ar: 'أضف عنواناً وصفياً بين 50-60 حرف يحتوي الكلمة المفتاحية الأساسية.',
        fix_en: 'Add a descriptive 50-60 char title containing the primary keyword.' });
    } else if (titleLen < 10) {
      issues.push({ url, category: 'meta', severity: 'medium',
        problem_ar: `العنوان قصير جداً (${titleLen} حرف)`,
        problem_en: `Title too short (${titleLen} chars)`,
        fix_ar: 'وسّع العنوان ليصبح 50-60 حرفاً ويصف الصفحة بدقة.',
        fix_en: 'Expand the title to 50-60 characters describing the page accurately.' });
    } else if (titleLen > 70) {
      issues.push({ url, category: 'meta', severity: 'low',
        problem_ar: `العنوان طويل جداً (${titleLen} حرف) — سيُقتطع في نتائج البحث`,
        problem_en: `Title too long (${titleLen} chars) — will be truncated in SERPs`,
        fix_ar: 'اختصر العنوان إلى 50-60 حرفاً مع الإبقاء على الكلمات المفتاحية في البداية.',
        fix_en: 'Shorten to 50-60 chars, keeping primary keywords at the start.' });
    }

    if (!p.has_description || descLen === 0) {
      issues.push({ url, category: 'meta', severity: 'high',
        problem_ar: 'لا يوجد وصف ميتا (meta description)',
        problem_en: 'Missing meta description',
        fix_ar: 'أضف <meta name="description"> بين 120-160 حرف يحتوي دعوة لاتخاذ إجراء.',
        fix_en: 'Add a 120-160 char meta description with a call-to-action.' });
    } else if (descLen < 50) {
      issues.push({ url, category: 'meta', severity: 'medium',
        problem_ar: `وصف الميتا قصير (${descLen} حرف)`,
        problem_en: `Meta description too short (${descLen} chars)`,
        fix_ar: 'وسّع الوصف إلى 120-160 حرفاً.',
        fix_en: 'Expand the description to 120-160 characters.' });
    } else if (descLen > 200) {
      issues.push({ url, category: 'meta', severity: 'low',
        problem_ar: `وصف الميتا طويل (${descLen} حرف)`,
        problem_en: `Meta description too long (${descLen} chars)`,
        fix_ar: 'اختصر الوصف ليبقى تحت 160 حرفاً.',
        fix_en: 'Trim the description to under 160 characters.' });
    }

    if (h1Count === 0) {
      issues.push({ url, category: 'headings', severity: 'high',
        problem_ar: 'لا يوجد عنوان رئيسي <h1>',
        problem_en: 'No <h1> heading found',
        fix_ar: 'أضف عنواناً واحداً <h1> يلخص محتوى الصفحة في أعلى المحتوى.',
        fix_en: 'Add exactly one <h1> at the top describing the page content.' });
    } else if (h1Count > 1) {
      issues.push({ url, category: 'headings', severity: 'medium',
        problem_ar: `يوجد ${h1Count} عناوين <h1> — يجب أن يكون واحداً فقط`,
        problem_en: `Found ${h1Count} <h1> tags — should be exactly one`,
        fix_ar: 'حوّل العناوين الإضافية إلى <h2> أو <h3> حسب الترتيب الهرمي.',
        fix_en: 'Convert extra h1s to <h2> / <h3> following heading hierarchy.' });
    }

    if (!p.has_canonical) {
      issues.push({ url, category: 'canonical', severity: 'high',
        problem_ar: 'لا يوجد رابط قانوني (canonical)',
        problem_en: 'Missing canonical link',
        fix_ar: 'أضف <link rel="canonical" href="..."> لتجنب مشاكل المحتوى المكرر.',
        fix_en: 'Add <link rel="canonical" href="..."> to avoid duplicate content issues.' });
    }

    if (!p.has_og_image) {
      issues.push({ url, category: 'social', severity: 'medium',
        problem_ar: 'لا توجد صورة Open Graph للمشاركة الاجتماعية',
        problem_en: 'Missing Open Graph image',
        fix_ar: 'أضف <meta property="og:image" content="..."> بمقاس 1200x630 للمعاينات.',
        fix_en: 'Add <meta property="og:image" content="..."> at 1200x630 for previews.' });
    }
  }
  return issues;
}

/**
 * SiteAuditIssuesSection — presentational issues report. Builds the
 * problem/fix list from supplied page results; never writes Helmet,
 * never alters canonical/OG behavior — the rules below are
 * recommendations displayed to the admin.
 */
export interface SiteAuditIssuesSectionProps {
  pageResults: ReadonlyArray<Record<string, unknown>>;
  isRTL: boolean;
  hasData: boolean;
}

export const SiteAuditIssuesSection: React.FC<SiteAuditIssuesSectionProps> = ({
  pageResults, isRTL, hasData,
}) => {
  const issues = useMemo(() => buildIssues(pageResults), [pageResults]);
  const counts = useMemo(() => ({
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  }), [issues]);

  const sevStyle = (s: Severity) =>
    s === 'high' ? 'border-destructive/40 bg-destructive/5'
      : s === 'medium' ? 'border-warning/40 bg-warning/5'
        : 'border-info/30 bg-info/5';
  const sevBadge = (s: Severity) =>
    s === 'high' ? 'bg-destructive/15 text-destructive dark:text-destructive border-destructive/30'
      : s === 'medium' ? 'bg-warning/15 text-warning dark:text-warning border-warning/30'
        : 'bg-info/15 text-info dark:text-info border-info/30';
  const sevLabel = (s: Severity) =>
    isRTL
      ? (s === 'high' ? 'حرج' : s === 'medium' ? 'متوسط' : 'منخفض')
      : s.toUpperCase();

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Wrench className="w-4 h-4 text-accent" />
          {isRTL ? 'تقرير المشاكل القابلة للإصلاح' : 'Actionable SEO Issues'}
          {hasData && (
            <div className="ms-auto flex gap-1">
              <Badge variant="outline" className={cn('text-[10px]', sevBadge('high'))}>
                {counts.high} {isRTL ? 'حرج' : 'high'}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px]', sevBadge('medium'))}>
                {counts.medium} {isRTL ? 'متوسط' : 'med'}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px]', sevBadge('low'))}>
                {counts.low} {isRTL ? 'منخفض' : 'low'}
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {isRTL ? 'شغّل التدقيق أولاً لرؤية التقرير.' : 'Run the audit first to see the report.'}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-success dark:text-success">
            <CheckCircle2 className="w-5 h-5" />
            {isRTL ? 'ممتاز! لا توجد مشاكل SEO.' : 'Excellent! No SEO issues found.'}
          </div>
        ) : (
          <div className="space-y-2">
            {(['high', 'medium', 'low'] as Severity[]).flatMap((sev) =>
              issues.filter((i) => i.severity === sev).map((issue, i) => (
                <div key={`${sev}-${i}`} className={cn('rounded-lg border p-2.5', sevStyle(issue.severity))}>
                  <div className="flex items-start gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-[9px] h-5 shrink-0', sevBadge(issue.severity))}>
                      {sevLabel(issue.severity)}
                    </Badge>
                    <code className="text-[11px] tech-content text-muted-foreground" dir="ltr">
                      {issue.url.replace('https://qitaat.com', '') || '/'}
                    </code>
                    <Badge variant="outline" className="text-[9px] h-5 shrink-0">
                      {issue.category}
                    </Badge>
                  </div>
                  <div className="mt-1.5 text-xs font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span dir="auto">{isRTL ? issue.problem_ar : issue.problem_en}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
                    <span dir="auto">{isRTL ? issue.fix_ar : issue.fix_en}</span>
                  </div>
                </div>
              )),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SiteAuditIssuesSection;