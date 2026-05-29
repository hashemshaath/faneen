/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { refId?: string }

const CustomerThankYouFeedbackEmail: React.FC<Props> = ({ refId }) => (
  <BilingualEmail
    preview="شكراً لملاحظاتك · Thank you for your feedback"
    badge={{ textAr: 'شكراً', textEn: 'Thank you', tone: 'success' }}
    titleAr="شكراً لملاحظاتك"
    titleEn="Thank you for your feedback"
    introAr="استلمنا تقييمك. شكراً لمساعدتنا على تحسين خدمتنا."
    introEn="We received your feedback. Thank you for helping us improve our service."
    details={[
      refId ? { labelAr: 'مرجع التقييم', labelEn: 'Feedback ref', value: refId, mono: true } : null,
    ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>}
  />
)

export const template = {
  component: CustomerThankYouFeedbackEmail,
  subject: `شكراً لملاحظاتك · Thank you for your feedback — ${SITE_NAME_AR}`,
  displayName: 'شكراً للتقييم · Thank you for feedback',
  previewData: { refId: 'FDB-1000001' },
} satisfies TemplateEntry