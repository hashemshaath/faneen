/**
 * PROVIDER INTAKE UX PROFESSIONALIZATION — Wizard guidance + duplicate legend.
 *
 * Shown atop `/admin/data-enrichment` to make the four operational steps
 * explicit (upload / map / review-clean / apply) and to document the
 * duplicate badges used inside the review step. Pure presentation — no
 * network calls.
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  ListChecks,
  Sparkles,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';

const STEPS: Array<{
  id: string;
  ar: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'upload', ar: 'رفع الملف أو اختيار مصدر', en: 'Upload file or pick source', icon: Upload },
  { id: 'map', ar: 'مطابقة الأعمدة', en: 'Map columns', icon: ListChecks },
  { id: 'review', ar: 'مراجعة وتنظيف البيانات', en: 'Review & clean data', icon: Sparkles },
  { id: 'apply', ar: 'تطبيق وحفظ Lead', en: 'Apply & save as lead', icon: CheckCircle2 },
];

const DUPLICATE_BADGES: Array<{
  id: string;
  ar: string;
  en: string;
  cls: string;
}> = [
  { id: 'new', ar: 'جديد', en: 'New', cls: 'bg-success/10 text-success border-success/30' },
  { id: 'strong-duplicate', ar: 'مكرر قوي', en: 'Strong duplicate', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  { id: 'possible-similar', ar: 'مشابه محتمل', en: 'Possible match', cls: 'bg-warning/10 text-warning border-warning/30' },
  { id: 'needs-review', ar: 'يحتاج مراجعة', en: 'Needs review', cls: 'bg-info/10 text-info border-info/30' },
  { id: 'missing-data', ar: 'ناقص بيانات', en: 'Missing data', cls: 'bg-muted text-muted-foreground border-border' },
];

const TEMPLATES: Array<{ id: string; ar: string; en: string; href: string }> = [
  {
    id: 'providers',
    ar: 'قالب المزودين الرئيسي',
    en: 'Main providers template',
    href: '/templates/qitaat-provider-intake-template.xlsx',
  },
  {
    id: 'branches',
    ar: 'قالب الفروع',
    en: 'Branches template',
    href: '/templates/qitaat-provider-branches-template.xlsx',
  },
];

export interface IntakeWizardGuideProps {
  className?: string;
  testId?: string;
}

export const IntakeWizardGuide: React.FC<IntakeWizardGuideProps> = ({
  className,
  testId = 'intake-wizard-guide',
}) => {
  return (
    <Card data-testid={testId} className={`p-4 mb-5 ${className ?? ''}`}>
      <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
        <Bi ar="خطوات إدخال المزود" en="Provider intake steps" />
      </div>
      <ol
        data-testid={`${testId}-steps`}
        className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4"
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li
              key={s.id}
              data-testid={`${testId}-step-${s.id}`}
              className="flex items-start gap-2 rounded-xl border bg-muted/30 p-3"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold tech-content">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <Bi ar={s.ar} en={s.en} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div data-testid={`${testId}-templates`} className="mb-4 rounded-xl border bg-muted/20 p-3">
        <div className="text-[11px] font-semibold mb-2 text-muted-foreground">
          <Bi ar="قوالب الإدخال (Excel)" en="Intake templates (Excel)" />
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <a
              key={t.id}
              href={t.href}
              download
              data-testid={`intake-template-${t.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-primary" aria-hidden />
              <Bi ar={t.ar} en={t.en} />
            </a>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Bi
            ar="يشمل: الإحداثيات، العنوان الوطني المختصر، الدولة/المنطقة، سنة التأسيس، مدير الحساب، وملف مستقل للفروع."
            en="Includes coordinates, short national address, country/region, establishment year, account manager, and a separate branches file."
          />
        </p>
      </div>
      <div>
        <div className="text-[11px] font-semibold mb-2 text-muted-foreground">
          <Bi ar="دلالات تكرار البيانات" en="Duplicate detection badges" />
        </div>
        <div
          data-testid={`${testId}-duplicate-legend`}
          className="flex flex-wrap gap-1.5"
        >
          {DUPLICATE_BADGES.map((b) => (
            <Badge
              key={b.id}
              variant="outline"
              data-testid={`duplicate-badge-${b.id}`}
              className={`text-[10px] ${b.cls}`}
            >
              <Bi ar={b.ar} en={b.en} />
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Bi
            ar="لا يتم إدخال أي صف مباشرة إلى جدول المنشآت — التحويل دائمًا يدوي عبر مراجعة المسؤول."
            en="No row is written directly to the businesses table — every conversion is manual after admin review."
          />
        </p>
      </div>
    </Card>
  );
};

export default IntakeWizardGuide;