/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>أكّد بريدك الإلكتروني للانضمام إلى قِطاعات</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandMark}>ق</Text>
          <Text style={brandName}>قِطاعات</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>مرحباً بك في قِطاعات</Heading>
          <Text style={text}>
            شكراً لتسجيلك في{' '}
            <Link href={siteUrl} style={link}>
              <strong>قِطاعات</strong>
            </Link>
            {' '}— الدليل الصناعي للألمنيوم والزجاج والخشب والحديد.
          </Text>
          <Text style={text}>
            لتفعيل حسابك ({recipient})، يُرجى تأكيد بريدك الإلكتروني عبر الزر أدناه:
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>
              تأكيد البريد الإلكتروني
            </Button>
          </Section>
          <Text style={footer}>
            إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان.
          </Text>
        </Section>
        <Text style={brandFooter}>
          فريق قِطاعات · <Link href={siteUrl} style={brandFooterLink}>qitaat.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
}
const container = { padding: '24px 16px', maxWidth: '560px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '8px 0 24px' }
const brandMark = {
  display: 'inline-block',
  width: '56px',
  height: '56px',
  lineHeight: '56px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, hsl(42, 85%, 55%), hsl(42, 90%, 70%))',
  color: 'hsl(220, 35%, 10%)',
  fontSize: '30px',
  fontWeight: 'bold' as const,
  margin: '0 auto 8px',
}
const brandName = {
  fontSize: '14px',
  color: 'hsl(220, 35%, 15%)',
  fontWeight: 'bold' as const,
  margin: 0,
  letterSpacing: '0.5px',
}
const card = {
  background: '#ffffff',
  border: '1px solid hsl(220, 15%, 88%)',
  borderRadius: '12px',
  padding: '32px 28px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 35%, 15%)',
  margin: '0 0 20px',
  textAlign: 'right' as const,
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 10%, 30%)',
  lineHeight: '1.7',
  margin: '0 0 16px',
  textAlign: 'right' as const,
}
const link = { color: 'hsl(42, 80%, 40%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(220, 35%, 15%)',
  color: 'hsl(42, 100%, 95%)',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '13px',
  color: 'hsl(220, 10%, 45%)',
  margin: '24px 0 0',
  textAlign: 'right' as const,
  borderTop: '1px solid hsl(220, 15%, 92%)',
  paddingTop: '16px',
}
const brandFooter = {
  fontSize: '12px',
  color: 'hsl(220, 10%, 55%)',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
const brandFooterLink = { color: 'hsl(220, 35%, 15%)', textDecoration: 'none' }
