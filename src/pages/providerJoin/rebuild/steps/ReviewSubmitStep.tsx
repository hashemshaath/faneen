import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Info } from 'lucide-react';
import type { ProviderLeadFormState, ProviderLeadBranchInput } from '../types';

export interface ReviewSubmitStepProps {
  form: ProviderLeadFormState;
  branches: ProviderLeadBranchInput[];
  crFile: File | null;
  isRTL: boolean;
}

const Row: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-dashed last:border-0">
      <span className="text-[12px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[13px] text-end break-words" dir="auto">{value}</span>
    </div>
  );
};

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="rounded-xl">
    <CardContent className="p-3 space-y-0.5">
      <div className="text-[13px] font-semibold mb-1">{title}</div>
      {children}
    </CardContent>
  </Card>
);

export const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({ form, branches, crFile, isRTL }) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[12px] leading-[18px] text-foreground">
          {t(
            'هذا طلب انضمام للمراجعة فقط — لا يتم إنشاء حساب ولا نشر المنشأة تلقائياً.',
            'This is a review-only request — no account is created and no listing is published automatically.',
          )}
        </p>
      </div>

      <Group title={t('بيانات المنشأة والخدمات', 'Business & Services')}>
        <Row label={t('الاسم بالعربي', 'Name (AR)')} value={form.name_ar} />
        <Row label={t('الاسم بالإنجليزي', 'Name (EN)')} value={form.name_en} />
        <Row label={t('النشاط', 'Activity')} value={form.main_activity} />
        <Row label={t('التخصصات', 'Specialties')} value={form.specialties.join(' · ')} />
        <Row label={t('العلامات', 'Brands')} value={form.brands.join(' · ')} />
        <Row label={t('نبذة', 'Brief')} value={form.brief} />
      </Group>

      <Group title={t('التواصل والموقع', 'Contact & Location')}>
        <Row label={t('المسؤول', 'Contact')} value={form.contact_name} />
        <Row label={t('البريد', 'Email')} value={form.email} />
        <Row label={t('الجوال', 'Phone')} value={form.phone} />
        <Row label={t('قناة التواصل', 'Channel')} value={form.preferred_channel} />
        <Row label={t('الموقع', 'Website')} value={form.website} />
        <Row label={t('المدينة', 'City')} value={form.city} />
        <Row label={t('العنوان الوطني', 'National address')} value={form.national_address} />
        <Row label={t('رابط الخريطة', 'Map link')} value={form.map_link} />
      </Group>

      <Group title={t('البيانات الرسمية والفروع', 'Official & Branches')}>
        <Row label={t('السجل التجاري', 'CR')} value={form.cr_number} />
        <Row label={t('الرقم الموحد', 'Unified')} value={form.unified_number} />
        <Row label={t('الرقم الضريبي', 'VAT')} value={form.vat_number} />
        <Row
          label={t('ملف السجل', 'CR file')}
          value={crFile ? `${crFile.name} · ${(crFile.size / 1024).toFixed(0)} KB` : t('لم يُرفق', 'Not attached')}
        />
        <Row label={t('عدد الفروع', 'Branches')} value={form.branches_count} />
        {branches.length > 0 && (
          <div className="pt-1.5 space-y-1.5">
            {branches.map((b, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-2">
                <div className="text-[12px] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span dir="auto">{b.branch_name || t(`فرع ${i + 2}`, `Branch ${i + 2}`)}</span>
                </div>
                {(b.city || b.address) && (
                  <div className="text-[11px] text-muted-foreground mt-0.5" dir="auto">
                    {[b.city, b.address].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Group>
    </div>
  );
};