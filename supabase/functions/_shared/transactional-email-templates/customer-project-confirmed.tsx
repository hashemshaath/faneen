/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string }

const CustomerProjectConfirmedEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="تم تأكيد اكتمال المشروع · Project completion confirmed"
    badge={{ textAr: 'مؤكد', textEn: 'Confirmed', tone: 'success' }}
    titleAr="تم تأكيد اكتمال المشروع"
    titleEn="Project completion confirmed"
    introAr="شكراً لتأكيد اكتمال المشروع. تم تفعيل الضمان وبدء سريانه."
    introEn="Thank you for confirming completion. Your warranty has been activated."
    details={[
      refId ? { labelAr: 'رقم الإنهاء', labelEn: 'Closure', value: refId, mono: true } : null,
    ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerProjectConfirmedEmail,
  subject: `تم تأكيد اكتمال المشروع · Project confirmed — ${SITE_NAME_AR}`,
  displayName: 'تأكيد إكمال المشروع · Project confirmed',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'CLS-1000001' },
} satisfies TemplateEntry