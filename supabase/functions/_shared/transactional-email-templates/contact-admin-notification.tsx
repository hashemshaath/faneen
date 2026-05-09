/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface ContactAdminNotificationProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const ContactAdminNotificationEmail: React.FC<ContactAdminNotificationProps> = ({
  name, email, subject, message,
}) => (
  <BilingualEmail
    preview={`رسالة تواصل جديدة من ${name || 'زائر'} · New contact message`}
    badge={{ textAr: 'إشعار إداري', textEn: 'Admin alert', tone: 'info' }}
    titleAr="رسالة تواصل جديدة"
    titleEn="New contact message"
    introAr="تم استلام رسالة جديدة عبر نموذج التواصل في الموقع. التفاصيل أدناه."
    introEn="A new message was submitted through the contact form. Details below."
    details={[
      { labelAr: 'الاسم', labelEn: 'Name', value: name || '—' },
      { labelAr: 'البريد الإلكتروني', labelEn: 'Email', value: email || '—', mono: true },
      ...(subject ? [{ labelAr: 'الموضوع', labelEn: 'Subject', value: subject }] : []),
    ]}
    highlight={message ? {
      labelAr: 'نص الرسالة',
      labelEn: 'Message body',
      content: message,
    } : undefined}
    cta={{
      href: 'https://qitaat.com/admin/contact-messages',
      labelAr: 'فتح في لوحة الإدارة',
      labelEn: 'Open in admin dashboard',
    }}
  />
)

export const template = {
  component: ContactAdminNotificationEmail,
  subject: (data: Record<string, any>) =>
    `رسالة تواصل جديدة${data?.subject ? `: ${data.subject}` : ''} · New contact — ${SITE_NAME_AR}`,
  to: Deno.env.get('ADMIN_CONTACT_EMAIL') || 'info@qitaat.com',
  displayName: 'إشعار رسالة تواصل للإدارة · Admin contact notification',
  previewData: {
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    subject: 'استفسار عن خدمات الألمنيوم',
    message: 'مرحباً، أرغب في الاستفسار عن خدمات تركيب الألمنيوم للمنازل. هل يمكنكم تزويدي بمزيد من المعلومات؟',
  },
} satisfies TemplateEntry
