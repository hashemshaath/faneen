/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; businessName?: string; url?: string }

const Email: React.FC<Props> = ({ ref, businessName, url }) => (
  <BilingualEmail
    preview={`تم إلغاء الفرصة ${ref ?? ''} · Opportunity cancelled`}
    badge={{ textAr: 'تم الإلغاء', textEn: 'Cancelled', tone: 'danger' }}
    titleAr="تم إلغاء الفرصة"
    titleEn="Opportunity cancelled"
    greetingNameAr={businessName}
    greetingNameEn={businessName}
    introAr={`تم إلغاء الفرصة ${ref ?? ''} من قِبل العميل. لا حاجة لإجراء إضافي من جهتك.`}
    introEn={`Opportunity ${ref ?? ''} was cancelled by the client. No further action is needed on your side.`}
    cta={url ? { href: url, labelAr: 'فرص أخرى مفتوحة', labelEn: 'Browse other open opportunities' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `تم إلغاء الفرصة ${d?.ref ?? ''} · Opportunity cancelled — ${SITE_NAME_AR}`,
  displayName: 'فرصة: إلغاء للمزود · Opportunity cancelled (provider)',
  previewData: { ref: 'OPP-1000123', businessName: 'مصنع الألمنيوم المتقدم', url: 'https://qitaat.com/dashboard/opportunities' },
} satisfies TemplateEntry