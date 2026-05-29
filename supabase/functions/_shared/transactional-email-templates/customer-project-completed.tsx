/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string; completionDate?: string }

const CustomerProjectCompletedEmail: React.FC<Props> = ({ actionUrl, refId, completionDate }) => (
  <BilingualEmail
    preview="تم اكتمال مشروعك · Your project is complete"
    badge={{ textAr: 'مكتمل', textEn: 'Completed', tone: 'success' }}
    titleAr="تم اكتمال مشروعك"
    titleEn="Your project is complete"
    introAr="نشكرك على ثقتك. يرجى تأكيد الاستلام من خلال الرابط الآمن أدناه، أو الإبلاغ عن أي ملاحظة."
    introEn="Thank you for your trust. Please confirm delivery through the secure link below, or report any concern."
    details={[
      refId ? { labelAr: 'رقم الإنهاء', labelEn: 'Closure', value: refId, mono: true } : null,
      completionDate ? { labelAr: 'تاريخ الاكتمال', labelEn: 'Completion date', value: completionDate, mono: true } : null,
    ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>}
    cta={{
      href: actionUrl ?? `${SITE_URL}/`,
      labelAr: 'تأكيد الاستلام',
      labelEn: 'Confirm delivery',
    }}
  />
)

export const template = {
  component: CustomerProjectCompletedEmail,
  subject: `تم اكتمال مشروعك · Project complete — ${SITE_NAME_AR}`,
  displayName: 'اكتمال المشروع · Project completed',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'CLS-1000001', completionDate: '2026-06-20' },
} satisfies TemplateEntry