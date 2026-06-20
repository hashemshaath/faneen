/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; customerName?: string; url?: string }

const Email: React.FC<Props> = ({ ref, customerName, url }) => (
  <BilingualEmail
    preview={`انتهت صلاحية الفرصة ${ref ?? ''} · Opportunity expired`}
    badge={{ textAr: 'انتهت الصلاحية', textEn: 'Expired', tone: 'warning' }}
    titleAr="انتهت صلاحية الفرصة"
    titleEn="Your opportunity has expired"
    greetingNameAr={customerName}
    greetingNameEn={customerName}
    introAr={`انتهت صلاحية الفرصة ${ref ?? ''} دون تعميد. يمكنك إعادة فتحها أو إنشاء فرصة جديدة بمواصفات مُحدّثة.`}
    introEn={`Opportunity ${ref ?? ''} expired without an award. You can reopen it or create a new one with updated specs.`}
    cta={url ? { href: url, labelAr: 'إنشاء فرصة جديدة', labelEn: 'Create a new opportunity' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `انتهت صلاحية الفرصة ${d?.ref ?? ''} · Opportunity expired — ${SITE_NAME_AR}`,
  displayName: 'فرصة: انتهاء صلاحية للعميل · Opportunity expired (client)',
  previewData: { ref: 'OPP-1000123', customerName: 'سارة أحمد', url: 'https://qitaat.com/quote' },
} satisfies TemplateEntry