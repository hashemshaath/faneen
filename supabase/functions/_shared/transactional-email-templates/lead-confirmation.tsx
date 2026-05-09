/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "قِطاعات"

interface LeadConfirmationProps {
  name?: string
  businessName?: string
}

const LeadConfirmationEmail = ({ name, businessName }: LeadConfirmationProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
    </Head>
    <Preview>تم إرسال طلبك إلى {businessName ?? 'المنشأة'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>قِطاعات</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>
          {name ? `وصلنا طلبك يا ${name}` : 'وصلنا طلبك'}
        </Heading>
        <Text style={text}>
          تم إرسال طلب عرض السعر بنجاح إلى <strong>{businessName ?? 'المنشأة'}</strong>.
          سيتواصل معك ممثل المنشأة عبر وسيلة التواصل التي اخترتها في أقرب وقت ممكن.
        </Text>
        <Section style={infoBox}>
          <Text style={infoText}>
            نصيحة: تأكد من فحص بريدك الإلكتروني والمكالمات الواردة. غالبية المنشآت ترد خلال 24 ساعة عمل.
          </Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>مع تحيات فريق {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadConfirmationEmail,
  subject: (data) => `تم إرسال طلبك إلى ${data?.businessName ?? 'المنشأة'} - ${SITE_NAME}`,
  displayName: 'تأكيد إرسال طلب عرض سعر',
  previewData: { name: 'سارة', businessName: 'مصنع الألمنيوم المتقدم' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const infoBox = { backgroundColor: 'hsl(220, 20%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const infoText = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '0', textAlign: 'right' as const, lineHeight: '1.7' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }