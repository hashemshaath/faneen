/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "قِطاعات"
const SITE_URL = "https://qitaat.com"

interface LeadNotificationProps {
  businessName?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  budgetRange?: string
  contactPreference?: string
  message?: string
  leadId?: string
}

const LeadNotificationEmail = ({
  businessName,
  customerName,
  customerEmail,
  customerPhone,
  budgetRange,
  contactPreference,
  message,
  leadId,
}: LeadNotificationProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
    </Head>
    <Preview>طلب عرض سعر جديد من {customerName ?? 'عميل محتمل'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>قِطاعات</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>طلب عرض سعر جديد</Heading>
        <Text style={text}>
          {businessName ? `مرحباً ${businessName}،` : 'مرحباً،'} وصلك طلب جديد من عميل محتمل عبر منصة {SITE_NAME}.
        </Text>

        <Section style={infoBox}>
          {customerName && <Text style={row}><strong>الاسم:</strong> {customerName}</Text>}
          {customerEmail && <Text style={row}><strong>البريد:</strong> {customerEmail}</Text>}
          {customerPhone && <Text style={row}><strong>الجوال:</strong> {customerPhone}</Text>}
          {budgetRange && <Text style={row}><strong>الميزانية:</strong> {budgetRange}</Text>}
          {contactPreference && <Text style={row}><strong>وسيلة التواصل المفضلة:</strong> {contactPreference}</Text>}
        </Section>

        {message && (
          <Section style={messageBox}>
            <Text style={messageLabel}>الرسالة:</Text>
            <Text style={messageText}>{message}</Text>
          </Section>
        )}

        <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          <Button href={`${SITE_URL}/dashboard/messages${leadId ? `?lead=${leadId}` : ''}`} style={btn}>
            عرض الطلب في لوحة التحكم
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          سرعة الرد ترفع فرص تحويل الطلب إلى عقد. ننصح بالرد خلال ساعة.
        </Text>
        <Text style={footer}>مع تحيات فريق {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadNotificationEmail,
  subject: (data) => `طلب جديد من ${data?.customerName ?? 'عميل محتمل'} - ${SITE_NAME}`,
  displayName: 'إشعار طلب جديد للمنشأة',
  previewData: {
    businessName: 'مصنع الألمنيوم المتقدم',
    customerName: 'سارة أحمد',
    customerEmail: 'sara@example.com',
    customerPhone: '+966500000000',
    budgetRange: '20k-100k',
    contactPreference: 'whatsapp',
    message: 'أرغب في تركيب واجهات ألمنيوم لمشروع تجاري بمساحة 250 متر مربع.',
    leadId: 'demo-lead-id',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const infoBox = { backgroundColor: 'hsl(220, 20%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const row = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '4px 0', textAlign: 'right' as const }
const messageBox = { backgroundColor: 'hsl(42, 85%, 96%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0', borderInlineStart: '4px solid hsl(42, 85%, 55%)' }
const messageLabel = { fontSize: '13px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 6px', textAlign: 'right' as const }
const messageText = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '0', textAlign: 'right' as const, lineHeight: '1.7', whiteSpace: 'pre-wrap' as const }
const btn = { backgroundColor: 'hsl(220, 35%, 15%)', color: 'hsl(42, 100%, 95%)', padding: '12px 24px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '8px 0 0', textAlign: 'center' as const, lineHeight: '1.7' }