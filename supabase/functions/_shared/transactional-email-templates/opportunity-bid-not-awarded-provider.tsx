/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; businessName?: string; url?: string }

const Email: React.FC<Props> = ({ ref, businessName, url }) => (
  <BilingualEmail
    preview={`نتيجة الفرصة ${ref ?? ''} · Bid result`}
    badge={{ textAr: 'لم يتم الاختيار', textEn: 'Not selected', tone: 'neutral' }}
    titleAr="نتيجة الفرصة"
    titleEn="Opportunity result"
    greetingNameAr={businessName}
    greetingNameEn={businessName}
    introAr={`لم يقع الاختيار على عرضك في الفرصة ${ref ?? ''}. شكراً لمشاركتك ووقتك.`}
    introEn={`Your bid was not selected for opportunity ${ref ?? ''}. Thank you for your participation and time.`}
    tipAr="استمر في تحديث ملفك ومعارض أعمالك — هذا يرفع فرصة الفوز بالفرص القادمة."
    tipEn="Keep your profile and portfolio updated — it boosts your chance on future opportunities."
    cta={url ? { href: url, labelAr: 'عرض المزيد من الفرص', labelEn: 'Browse more opportunities' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `نتيجة الفرصة ${d?.ref ?? ''} · Opportunity result — ${SITE_NAME_AR}`,
  displayName: 'فرصة: لم يتم اختيار العرض · Bid not selected (provider)',
  previewData: { ref: 'OPP-1000123', businessName: 'مصنع الألمنيوم المتقدم', url: 'https://qitaat.com/dashboard/opportunities' },
} satisfies TemplateEntry