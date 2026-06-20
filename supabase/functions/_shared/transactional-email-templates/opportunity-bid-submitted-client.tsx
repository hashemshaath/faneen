/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; customerName?: string; providerName?: string; price?: string; url?: string }

const Email: React.FC<Props> = ({ ref, customerName, providerName, price, url }) => (
  <BilingualEmail
    preview={`عرض جديد على الفرصة ${ref ?? ''} · New bid received`}
    badge={{ textAr: 'عرض جديد', textEn: 'New bid', tone: 'info' }}
    titleAr="وصلك عرض جديد"
    titleEn="A new bid was submitted"
    greetingNameAr={customerName}
    greetingNameEn={customerName}
    introAr={`تم تقديم عرض جديد على الفرصة ${ref ?? ''}. راجع التفاصيل واتخذ قرارك.`}
    introEn={`A new bid was submitted on opportunity ${ref ?? ''}. Review the details and decide.`}
    details={[
      ...(providerName ? [{ labelAr: 'المزود', labelEn: 'Provider', value: providerName }] : []),
      ...(price ? [{ labelAr: 'السعر', labelEn: 'Price', value: price, mono: true }] : []),
    ]}
    cta={url ? { href: url, labelAr: 'مراجعة العرض', labelEn: 'Review the bid' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `عرض جديد على ${d?.ref ?? 'فرصتك'} · New bid — ${SITE_NAME_AR}`,
  displayName: 'فرصة: عرض جديد للعميل · Bid submitted (client)',
  previewData: { ref: 'OPP-1000123', customerName: 'سارة أحمد', providerName: 'مصنع الألمنيوم المتقدم', price: '85,000 SAR', url: 'https://qitaat.com/opportunities/OPP-1000123' },
} satisfies TemplateEntry