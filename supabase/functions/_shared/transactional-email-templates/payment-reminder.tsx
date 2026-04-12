/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "فنين"

interface PaymentReminderProps {
  clientName?: string
  contractNumber?: string
  installmentNumber?: number
  amount?: number
  currency?: string
  dueDate?: string
}

const PaymentReminderEmail = ({
  clientName,
  contractNumber,
  installmentNumber,
  amount,
  currency = 'ر.س',
  dueDate,
}: PaymentReminderProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تذكير بموعد سداد القسط {installmentNumber ? `رقم ${installmentNumber}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>فنين</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>تذكير بموعد سداد قسط 💳</Heading>
        <Text style={text}>
          {clientName ? `مرحباً ${clientName}،` : 'مرحباً،'}
        </Text>
        <Text style={text}>
          نود تذكيرك بموعد سداد القسط المستحق:
        </Text>
        <Section style={detailsBox}>
          {contractNumber && <Text style={detailRow}>رقم العقد: <strong>{contractNumber}</strong></Text>}
          {installmentNumber && <Text style={detailRow}>رقم القسط: <strong>{installmentNumber}</strong></Text>}
          {amount != null && <Text style={detailRow}>المبلغ: <strong>{amount.toLocaleString('ar-SA')} {currency}</strong></Text>}
          {dueDate && <Text style={detailRow}>تاريخ الاستحقاق: <strong>{dueDate}</strong></Text>}
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          <Button style={button} href="https://faneen.com/dashboard/installments">
            عرض الأقساط
          </Button>
        </Section>
        <Section style={warningBox}>
          <Text style={warningText}>
            يرجى سداد المبلغ المستحق قبل تاريخ الاستحقاق لتجنب أي رسوم تأخير.
          </Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>مع تحيات فريق {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReminderEmail,
  subject: (data: Record<string, any>) =>
    `تذكير بسداد قسط${data.contractNumber ? ' - عقد ' + data.contractNumber : ''} - ${SITE_NAME}`,
  displayName: 'تذكير بموعد سداد قسط',
  previewData: {
    clientName: 'خالد',
    contractNumber: 'CNT-0001234',
    installmentNumber: 3,
    amount: 5000,
    currency: 'ر.س',
    dueDate: '2026-05-01',
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
const button = { backgroundColor: 'hsl(220, 35%, 15%)', color: 'hsl(42, 100%, 95%)', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', textDecoration: 'none' }
const warningBox = { backgroundColor: 'hsl(42, 70%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0', borderRight: '4px solid hsl(42, 70%, 55%)' as any }
const warningText = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '0', textAlign: 'right' as const, lineHeight: '1.7' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
