/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'قِطاعات'
const SITE_NAME_EN = 'Qitaat'
const SITE_URL = 'https://qitaat.com'

interface ContractSignedProps {
  recipientName?: string
  contractRefId?: string
  contractTitle?: string
  counterpartyName?: string
  totalAmount?: string
  currency?: string
  contractUrl?: string
}

const ContractSignedEmail = ({
  recipientName,
  contractRefId,
  contractTitle,
  counterpartyName,
  totalAmount,
  currency,
  contractUrl,
}: ContractSignedProps) => {
  const ctaUrl = contractUrl || `${SITE_URL}/dashboard/contracts`
  const amountStr = totalAmount ? `${totalAmount} ${currency || 'SAR'}` : null
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap"
        />
      </Head>
      <Preview>تم توقيع العقد · Contract signed{contractRefId ? ` #${contractRefId}` : ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandMark}>ق</Text>
            <Text style={brandName}>قِطاعات · Qitaat</Text>
          </Section>

          {/* Arabic */}
          <Section dir="rtl" style={langSection}>
            <Heading style={h1Ar}>تم توقيع العقد بنجاح ✓</Heading>
            <Text style={textAr}>
              {recipientName ? `مرحباً ${recipientName}،` : 'مرحباً،'}
            </Text>
            <Text style={textAr}>
              نؤكد لك أنه تم <strong>التوقيع الإلكتروني</strong> على العقد من قبل الطرفين
              وأصبح ساري المفعول وفقاً لشروطه.
            </Text>
            <Section style={detailsBox} dir="rtl">
              {contractRefId && <Text style={detailRow}>رقم العقد: <strong className="tech-content">{contractRefId}</strong></Text>}
              {contractTitle && <Text style={detailRow}>العنوان: <strong>{contractTitle}</strong></Text>}
              {counterpartyName && <Text style={detailRow}>الطرف الآخر: <strong>{counterpartyName}</strong></Text>}
              {amountStr && <Text style={detailRow}>القيمة الإجمالية: <strong>{amountStr}</strong></Text>}
            </Section>
            <Text style={textAr}>
              حُرر هذا العقد إلكترونياً بنفس الحجية القانونية، ويمكنك تحميل نسخة PDF
              ومتابعة المراحل والدفعات من لوحة التحكم.
            </Text>
            <Section style={ctaWrap}>
              <Button style={button} href={ctaUrl}>عرض العقد</Button>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* English */}
          <Section dir="ltr" style={langSection}>
            <Heading style={h1En}>Contract signed ✓</Heading>
            <Text style={textEn}>
              {recipientName ? `Hi ${recipientName},` : 'Hello,'}
            </Text>
            <Text style={textEn}>
              We confirm the contract has been <strong>electronically signed</strong> by
              both parties and is now in effect under its agreed terms.
            </Text>
            <Section style={detailsBox} dir="ltr">
              {contractRefId && <Text style={detailRowEn}>Contract ID: <strong>{contractRefId}</strong></Text>}
              {contractTitle && <Text style={detailRowEn}>Title: <strong>{contractTitle}</strong></Text>}
              {counterpartyName && <Text style={detailRowEn}>Counterparty: <strong>{counterpartyName}</strong></Text>}
              {amountStr && <Text style={detailRowEn}>Total amount: <strong>{amountStr}</strong></Text>}
            </Section>
            <Text style={textEn}>
              The electronic signature carries full legal validity. You can download the
              PDF and track milestones and payments from your dashboard.
            </Text>
            <Section style={ctaWrap}>
              <Button style={button} href={ctaUrl}>View contract</Button>
            </Section>
          </Section>

          <Hr style={divider} />

          <Section style={signature}>
            <Text style={sigName}>فريق قِطاعات · The Qitaat Team</Text>
            <Text style={sigMeta}>
              <Link href={SITE_URL} style={sigLink}>qitaat.com</Link>
              {' · '}
              <Link href="mailto:support@qitaat.com" style={sigLink}>support@qitaat.com</Link>
            </Text>
            <Text style={sigDisclaimer}>
              هذه رسالة آلية — لا حاجة للرد عليها. · This is an automated message — no reply needed.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContractSignedEmail,
  subject: (data: Record<string, any>) =>
    `تم توقيع العقد${data.contractRefId ? ' #' + data.contractRefId : ''} · Contract signed`,
  displayName: 'تأكيد توقيع عقد',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    contractTitle: 'توريد وتركيب واجهات ألمنيوم',
    counterpartyName: 'شركة الإنجاز للمقاولات',
    totalAmount: '125,000.00',
    currency: 'SAR',
    contractUrl: 'https://qitaat.com/dashboard/contracts',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Noto Sans Arabic', 'Inter', 'Segoe UI', Tahoma, Arial, sans-serif",
}
const container = { padding: '24px 30px', maxWidth: '600px', margin: '0 auto' }
const brandBar = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brandMark = {
  display: 'inline-block', width: '44px', height: '44px', lineHeight: '44px',
  borderRadius: '12px', backgroundColor: 'hsl(220, 35%, 15%)',
  color: 'hsl(42, 100%, 95%)', fontSize: '24px', fontWeight: 700,
  margin: '0 auto 8px', textAlign: 'center' as const,
}
const brandName = {
  fontSize: '14px', fontWeight: 600, color: 'hsl(220, 30%, 25%)',
  letterSpacing: '0.5px', margin: 0, textAlign: 'center' as const,
}
const langSection = { padding: '8px 0' }
const h1Ar = { fontSize: '22px', fontWeight: 700, color: 'hsl(220, 35%, 15%)', margin: '0 0 14px', textAlign: 'right' as const }
const h1En = { fontSize: '22px', fontWeight: 700, color: 'hsl(220, 35%, 15%)', margin: '0 0 14px', textAlign: 'left' as const }
const textAr = { fontSize: '15px', color: 'hsl(220, 10%, 35%)', lineHeight: '1.8', margin: '0 0 12px', textAlign: 'right' as const }
const textEn = { fontSize: '15px', color: 'hsl(220, 10%, 35%)', lineHeight: '1.7', margin: '0 0 12px', textAlign: 'left' as const }
const detailsBox = { backgroundColor: 'hsl(220, 20%, 97%)', borderRadius: '12px', padding: '14px 18px', margin: '14px 0' }
const detailRow = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '6px 0', textAlign: 'right' as const }
const detailRowEn = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '6px 0', textAlign: 'left' as const }
const ctaWrap = { textAlign: 'center' as const, margin: '20px 0 8px' }
const button = {
  backgroundColor: 'hsl(220, 35%, 15%)', color: 'hsl(42, 100%, 95%)',
  fontSize: '15px', fontWeight: 600, borderRadius: '12px',
  padding: '14px 28px', textDecoration: 'none', display: 'inline-block',
}
const divider = { borderColor: 'hsl(220, 15%, 90%)', margin: '24px 0' }
const signature = { textAlign: 'center' as const, padding: '4px 0 0' }
const sigName = { fontSize: '13px', fontWeight: 600, color: 'hsl(220, 30%, 25%)', margin: '0 0 4px' }
const sigMeta = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '0 0 8px' }
const sigLink = { color: 'hsl(42, 85%, 45%)', textDecoration: 'none' }
const sigDisclaimer = { fontSize: '11px', color: 'hsl(220, 10%, 55%)', margin: '8px 0 0', lineHeight: '1.6' }