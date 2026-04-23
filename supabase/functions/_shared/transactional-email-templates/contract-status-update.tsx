/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "قِطاعات"

interface ContractStatusProps {
  recipientName?: string
  contractNumber?: string
  contractTitle?: string
  newStatus?: string
  contractId?: string
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending: 'بانتظار الموافقة',
  active: 'نشط',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  disputed: 'متنازع عليه',
}

const ContractStatusEmail = ({
  recipientName,
  contractNumber,
  contractTitle,
  newStatus,
  contractId,
}: ContractStatusProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
        </Head>
    <Preview>تحديث حالة العقد {contractNumber || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>قِطاعات</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>تحديث حالة العقد</Heading>
        <Text style={text}>
          {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
        </Text>
        <Text style={text}>
          تم تغيير حالة العقد الخاص بك:
        </Text>
        <Section style={detailsBox}>
          {contractNumber && <Text style={detailRow}>رقم العقد: <strong>{contractNumber}</strong></Text>}
          {contractTitle && <Text style={detailRow}>عنوان العقد: <strong>{contractTitle}</strong></Text>}
          {newStatus && (
            <Text style={detailRow}>
              الحالة الجديدة: <strong style={{ color: 'hsl(42, 85%, 40%)' }}>{statusLabels[newStatus] || newStatus}</strong>
            </Text>
          )}
        </Section>
        {contractId && (
          <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
            <Button style={button} href={`https://qitaat.lovable.app/contracts/${contractId}`}>
              عرض تفاصيل العقد
            </Button>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>مع تحيات فريق {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContractStatusEmail,
  subject: (data: Record<string, any>) =>
    `تحديث عقد ${data.contractNumber || ''} - ${SITE_NAME}`,
  displayName: 'تحديث حالة العقد',
  previewData: {
    recipientName: 'أحمد',
    contractNumber: 'CTR-0001234',
    contractTitle: 'عقد تجديد مطبخ',
    newStatus: 'active',
    contractId: '123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const detailsBox = { backgroundColor: 'hsl(220, 20%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const detailRow = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '6px 0', textAlign: 'right' as const }
const button = { backgroundColor: 'hsl(220, 35%, 15%)', color: 'hsl(42, 100%, 95%)', padding: '12px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', textDecoration: 'none' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
