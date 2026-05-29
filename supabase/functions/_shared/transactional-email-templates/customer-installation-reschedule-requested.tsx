/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string }

const CustomerInstallationRescheduleRequestedEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="تم استلام طلب إعادة الجدولة · Reschedule request received"
    badge={{ textAr: 'قيد المراجعة', textEn: 'Under review', tone: 'warning' }}
    titleAr="تم استلام طلب إعادة جدولة موعد التركيب"
    titleEn="Reschedule request received"
    introAr="استلمنا طلبك بإعادة جدولة موعد التركيب. سنعود إليك قريباً باقتراح موعد جديد."
    introEn="We received your request to reschedule the installation. We will get back to you with a new proposed time."
    details={refId ? [{ labelAr: 'رقم الموعد', labelEn: 'Appointment', value: refId, mono: true }] : undefined}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerInstallationRescheduleRequestedEmail,
  subject: `طلب إعادة الجدولة · Reschedule request received — ${SITE_NAME_AR}`,
  displayName: 'استلام طلب إعادة الجدولة · Reschedule request received',
  previewData: { actionUrl: `${SITE_URL}/client/CTL-1000123`, refId: 'APT-1000001' },
} satisfies TemplateEntry