/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "فنين"

interface BookingConfirmationProps {
  clientName?: string
  businessName?: string
  bookingDate?: string
  startTime?: string
  refId?: string
}

const BookingConfirmationEmail = ({
  clientName,
  businessName,
  bookingDate,
  startTime,
  refId,
}: BookingConfirmationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تأكيد حجز موعدك لدى {businessName || 'مزود الخدمة'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>فنين</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>
          تم تأكيد حجزك بنجاح ✓
        </Heading>
        <Text style={text}>
          {clientName ? `مرحباً ${clientName}،` : 'مرحباً،'}
        </Text>
        <Text style={text}>
          تم تسجيل حجز موعدك بنجاح. إليك تفاصيل الحجز:
        </Text>
        <Section style={detailsBox}>
          {refId && <Text style={detailRow}>رقم الحجز: <strong>{refId}</strong></Text>}
          {businessName && <Text style={detailRow}>مزود الخدمة: <strong>{businessName}</strong></Text>}
          {bookingDate && <Text style={detailRow}>التاريخ: <strong>{bookingDate}</strong></Text>}
          {startTime && <Text style={detailRow}>الوقت: <strong>{startTime}</strong></Text>}
        </Section>
        <Text style={text}>
          يمكنك متابعة حالة الحجز من خلال لوحة التحكم الخاصة بك.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          مع تحيات فريق {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `تأكيد حجز${data.refId ? ' #' + data.refId : ''} - ${SITE_NAME}`,
  displayName: 'تأكيد حجز موعد',
  previewData: {
    clientName: 'أحمد',
    businessName: 'شركة الإنجاز للمقاولات',
    bookingDate: '2026-04-20',
    startTime: '10:00',
    refId: 'BK-0001234',
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
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
