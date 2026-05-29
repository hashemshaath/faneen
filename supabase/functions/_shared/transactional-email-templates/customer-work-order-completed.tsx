/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string }

const CustomerWorkOrderCompletedEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="تم اكتمال المشروع · Your project has been completed"
    badge={{ textAr: 'تم الاكتمال', textEn: 'Completed', tone: 'success' }}
    titleAr="تم اكتمال المشروع"
    titleEn="Your project has been completed"
    introAr="تم إنجاز مشروعك بنجاح. شكراً لثقتك بنا — يسعدنا تلقي ملاحظاتك."
    introEn="Your project has been completed successfully. Thank you for trusting us — we welcome your feedback."
    details={refId ? [{ labelAr: 'رقم المرجع', labelEn: 'Reference', value: refId, mono: true }] : undefined}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerWorkOrderCompletedEmail,
  subject: `تم اكتمال المشروع · Project completed — ${SITE_NAME_AR}`,
  displayName: 'اكتمال المشروع · Customer work order completed',
  previewData: { actionUrl: `${SITE_URL}/dashboard`, refId: 'WO-1000123' },
} satisfies TemplateEntry