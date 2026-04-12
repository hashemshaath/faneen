/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "فنين"

const STATUS_MAP: Record<string, string> = {
  pending: 'قيد الانتظار',
  assigned: 'تم التعيين',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

interface MaintenanceStatusUpdateProps {
  clientName?: string
  requestNumber?: string
  title?: string
  oldStatus?: string
  newStatus?: string
}

const MaintenanceStatusUpdateEmail = ({
  clientName,
  requestNumber,
  title,
  oldStatus,
  newStatus,
}: MaintenanceStatusUpdateProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تحديث طلب الصيانة {requestNumber || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>فنين</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>تحديث حالة طلب الصيانة 🔧</Heading>
        <Text style={text}>
          {clientName ? `مرحباً ${clientName}،` : 'مرحباً،'}
        </Text>
        <Text style={text}>
          تم تحديث حالة طلب الصيانة الخاص بك:
        </Text>
        <Section style={detailsBox}>
          {requestNumber && <Text style={detailRow}>رقم الطلب: <strong>{requestNumber}</strong></Text>}
          {title && <Text style={detailRow}>العنوان: <strong>{title}</strong></Text>}
          {oldStatus && <Text style={detailRow}>الحالة السابقة: {STATUS_MAP[oldStatus] || oldStatus}</Text>}
          {newStatus && (
            <Text style={statusRow}>
              الحالة الحالية: <strong style={{ color: newStatus === 'completed' ? 'hsl(142, 71%, 35%)' : 'hsl(42, 70%, 45%)' }}>
                {STATUS_MAP[newStatus] || newStatus}
              </strong>
            </Text>
          )}
        </Section>
        <Text style={text}>
          يمكنك متابعة تفاصيل الطلب من خلال لوحة التحكم الخاصة بك.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>مع تحيات فريق {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MaintenanceStatusUpdateEmail,
  subject: (data: Record<string, any>) =>
    `تحديث طلب صيانة${data.requestNumber ? ' #' + data.requestNumber : ''} - ${SITE_NAME}`,
  displayName: 'تحديث حالة طلب صيانة',
  previewData: {
    clientName: 'محمد',
    requestNumber: 'MR-0000012',
    title: 'صيانة تسريب المياه',
    oldStatus: 'pending',
    newStatus: 'in_progress',
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
const statusRow = { fontSize: '15px', color: 'hsl(220, 30%, 12%)', margin: '10px 0 0', textAlign: 'right' as const }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
