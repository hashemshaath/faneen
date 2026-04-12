/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "فنين"

interface ContactConfirmationProps {
  name?: string
  subject?: string
}

const ContactConfirmationEmail = ({
  name,
  subject,
}: ContactConfirmationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>شكراً لتواصلك مع {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>فنين</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>
          {name ? `شكراً لك، ${name}!` : 'شكراً لتواصلك معنا!'}
        </Heading>
        <Text style={text}>
          لقد تلقينا رسالتك{subject ? ` بخصوص "${subject}"` : ''} وسنقوم بالرد عليك في أقرب وقت ممكن.
        </Text>
        <Section style={infoBox}>
          <Text style={infoText}>
            عادةً ما نرد خلال 24-48 ساعة عمل. إذا كان استفسارك عاجلاً، يمكنك التواصل معنا مباشرة عبر الهاتف.
          </Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          مع تحيات فريق {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: `شكراً لتواصلك معنا - ${SITE_NAME}`,
  displayName: 'تأكيد رسالة التواصل',
  previewData: {
    name: 'أحمد',
    subject: 'استفسار عن خدمات الألمنيوم',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const infoBox = { backgroundColor: 'hsl(220, 20%, 97%)', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const infoText = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '0', textAlign: 'right' as const, lineHeight: '1.7' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
