/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string; date?: string }

const CustomerInstallationConfirmedEmail: React.FC<Props> = ({ actionUrl, refId, date }) => (
  <BilingualEmail
    preview="تم تأكيد موعد التركيب · Installation confirmed"
    badge={{ textAr: 'مؤكد', textEn: 'Confirmed', tone: 'success' }}
    titleAr="تم تأكيد موعد التركيب"
    titleEn="Installation appointment confirmed"
    introAr="شكراً لتأكيد موعد التركيب. سنتواصل معك قبل الموعد."
    introEn="Thank you for confirming your installation appointment. We will contact you before the visit."
    details={[
      refId ? { labelAr: 'رقم الموعد', labelEn: 'Appointment', value: refId, mono: true } : null,
      date ? { labelAr: 'التاريخ', labelEn: 'Date', value: date, mono: true } : null,
    ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerInstallationConfirmedEmail,
  subject: `تم تأكيد موعد التركيب · Installation confirmed — ${SITE_NAME_AR}`,
  displayName: 'تأكيد موعد التركيب · Installation confirmed',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'APT-1000001', date: '2026-06-15' },
} satisfies TemplateEntry