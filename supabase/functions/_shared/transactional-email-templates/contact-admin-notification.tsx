/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "فنين"

interface ContactAdminNotificationProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const ContactAdminNotificationEmail = ({
  name,
  email,
  subject,
  message,
}: ContactAdminNotificationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رسالة تواصل جديدة من {name || 'زائر'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>فنين</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>📩 رسالة تواصل جديدة</Heading>
        <Text style={text}>تم استلام رسالة جديدة عبر نموذج التواصل في الموقع:</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}>الاسم: <strong>{name || '—'}</strong></Text>
          <Text style={detailRow}>البريد الإلكتروني: <strong>{email || '—'}</strong></Text>
          {subject && <Text style={detailRow}>الموضوع: <strong>{subject}</strong></Text>}
        </Section>
        <Section style={messageBox}>
          <Text style={messageLabel}>نص الرسالة:</Text>
          <Text style={messageText}>{message || '—'}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          هذا البريد مرسل تلقائياً من نظام {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactAdminNotificationEmail,
  subject: (data: Record<string, any>) =>
    `رسالة تواصل جديدة${data.subject ? ': ' + data.subject : ''} - ${SITE_NAME}`,
  to: Deno.env.get('ADMIN_CONTACT_EMAIL') || 'info@faneen.com',
  displayName: 'إشعار رسالة تواصل للإدارة',
  previewData: {
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    subject: 'استفسار عن خدمات الألمنيوم',
    message: 'مرحباً، أرغب في الاستفسار عن خدمات تركيب الألمنيوم للمنازل. هل يمكنكم تزويدي بمزيد من المعلومات؟',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const detailsBox = { backgroundColor: 'hsl(220, 20%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const detailRow = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '6px 0', textAlign: 'right' as const }
const messageBox = { backgroundColor: 'hsl(42, 70%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0', borderRight: '4px solid hsl(42, 70%, 55%)' as any }
const messageLabel = { fontSize: '13px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 8px', textAlign: 'right' as const }
const messageText = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '0', textAlign: 'right' as const, lineHeight: '1.8', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
