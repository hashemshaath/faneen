/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string; startDate?: string; endDate?: string }

const CustomerWarrantyStartedEmail: React.FC<Props> = ({ actionUrl, refId, startDate, endDate }) => (
  <BilingualEmail
    preview="بدأ سريان الضمان · Warranty started"
    badge={{ textAr: 'الضمان', textEn: 'Warranty', tone: 'info' }}
    titleAr="بدأ سريان الضمان"
    titleEn="Your warranty is active"
    introAr="تم تفعيل ضمان مشروعك. احتفظ بهذه الرسالة كمرجع للتواريخ."
    introEn="Your project warranty is now active. Keep this email as a reference for the warranty dates."
    details={[
      refId ? { labelAr: 'رقم الضمان', labelEn: 'Warranty', value: refId, mono: true } : null,
      startDate ? { labelAr: 'تاريخ البدء', labelEn: 'Start date', value: startDate, mono: true } : null,
      endDate ? { labelAr: 'تاريخ الانتهاء', labelEn: 'End date', value: endDate, mono: true } : null,
    ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerWarrantyStartedEmail,
  subject: `بدأ سريان الضمان · Warranty started — ${SITE_NAME_AR}`,
  displayName: 'بدء الضمان · Warranty started',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'WAR-1000001', startDate: '2026-06-20', endDate: '2027-06-20' },
} satisfies TemplateEntry