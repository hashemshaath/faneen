/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { actionUrl?: string; refId?: string }

const CustomerWorkOrderCreatedEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="تم إنشاء أمر العمل · Your work order has been created"
    badge={{ textAr: 'تم الإنشاء', textEn: 'Created', tone: 'info' }}
    titleAr="تم إنشاء أمر العمل الخاص بك"
    titleEn="Your work order has been created"
    introAr="تم تسجيل مشروعك وبدء التحضير له. سنقوم بإبلاغك في كل مرحلة رئيسية."
    introEn="Your project has been registered and preparation has started. We will notify you at each major milestone."
    details={refId ? [{ labelAr: 'رقم المرجع', labelEn: 'Reference', value: refId, mono: true }] : undefined}
    cta={actionUrl ? { href: actionUrl, labelAr: 'فتح المشروع', labelEn: 'Open project' } : undefined}
  />
)

export const template = {
  component: CustomerWorkOrderCreatedEmail,
  subject: `تم إنشاء أمر العمل · Work order created — ${SITE_NAME_AR}`,
  displayName: 'أمر عمل جديد · Customer work order created',
  previewData: { actionUrl: `${SITE_URL}/dashboard`, refId: 'WO-1000123' },
} satisfies TemplateEntry