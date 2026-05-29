/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string; date?: string; timeWindow?: string }

const CustomerInstallationScheduledEmail: React.FC<Props> = ({ actionUrl, refId, date, timeWindow }) => (
  <BilingualEmail
    preview="تم تحديد موعد التركيب · Installation scheduled"
    badge={{ textAr: 'موعد التركيب', textEn: 'Installation', tone: 'info' }}
    titleAr="تم تحديد موعد التركيب"
    titleEn="Installation appointment scheduled"
    introAr="تم تحديد موعد لتركيب مشروعك. يمكنك تأكيد الموعد أو طلب تعديله عبر الرابط الآمن أدناه."
    introEn="An installation appointment has been scheduled for your project. You can confirm it or request a change through the secure link below."
    details={[
      refId ? { labelAr: 'رقم الموعد', labelEn: 'Appointment', value: refId, mono: true } : null,
      date ? { labelAr: 'التاريخ', labelEn: 'Date', value: date, mono: true } : null,
      timeWindow ? { labelAr: 'الفترة', labelEn: 'Time window', value: timeWindow } : null,
    ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>}
    cta={{
      href: actionUrl ?? `${SITE_URL}/`,
      labelAr: 'مراجعة الموعد',
      labelEn: 'Review appointment',
    }}
  />
)

export const template = {
  component: CustomerInstallationScheduledEmail,
  subject: `موعد التركيب · Installation scheduled — ${SITE_NAME_AR}`,
  displayName: 'تحديد موعد التركيب · Installation scheduled',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'APT-1000001', date: '2026-06-15', timeWindow: '10:00–12:00' },
} satisfies TemplateEntry