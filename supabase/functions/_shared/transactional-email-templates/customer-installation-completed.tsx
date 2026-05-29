/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string }

const CustomerInstallationCompletedEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="تم اكتمال التركيب · Installation completed"
    badge={{ textAr: 'مكتمل', textEn: 'Completed', tone: 'success' }}
    titleAr="تم اكتمال التركيب"
    titleEn="Installation completed"
    introAr="تم تنفيذ التركيب بنجاح. شكراً لثقتك."
    introEn="Your installation has been completed successfully. Thank you for trusting us."
    details={refId ? [{ labelAr: 'رقم الموعد', labelEn: 'Appointment', value: refId, mono: true }] : undefined}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerInstallationCompletedEmail,
  subject: `تم اكتمال التركيب · Installation completed — ${SITE_NAME_AR}`,
  displayName: 'اكتمال التركيب · Installation completed',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'APT-1000001' },
} satisfies TemplateEntry