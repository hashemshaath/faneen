/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface ContactConfirmationProps {
  name?: string
  subject?: string
}

const ContactConfirmationEmail: React.FC<ContactConfirmationProps> = ({ name, subject }) => (
  <BilingualEmail
    preview={`شكراً لتواصلك مع ${SITE_NAME_AR} · We received your message`}
    badge={{ textAr: 'تم الاستلام', textEn: 'Received', tone: 'success' }}
    titleAr="شكراً لتواصلك معنا"
    titleEn="Thanks for reaching out"
    greetingNameAr={name}
    greetingNameEn={name}
    introAr={
      <>
        وصلتنا رسالتك{subject ? <> بخصوص <strong>«{subject}»</strong></> : ''} بنجاح،
        وفريق الدعم لدينا سيراجعها ويعود إليك في أقرب وقت ممكن.
      </>
    }
    introEn={
      <>
        We've received your message{subject ? <> regarding <strong>"{subject}"</strong></> : ''}.
        Our support team will review it and get back to you shortly.
      </>
    }
    tipAr="غالبية الردود تصل خلال 24–48 ساعة عمل. لو كان الأمر عاجلاً، يمكنك الاتصال بنا مباشرة."
    tipEn="Most replies arrive within 24–48 business hours. For urgent matters, please call us directly."
  />
)

export const template = {
  component: ContactConfirmationEmail,
  subject: () => `شكراً لتواصلك معنا · We received your message — ${SITE_NAME_AR}`,
  displayName: 'تأكيد رسالة التواصل · Contact form confirmation',
  previewData: { name: 'أحمد العتيبي', subject: 'استفسار عن خدمات الألمنيوم' },
} satisfies TemplateEntry
