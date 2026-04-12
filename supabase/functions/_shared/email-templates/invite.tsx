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
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تمت دعوتك للانضمام إلى {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>فنين</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>تمت دعوتك</Heading>
        <Text style={text}>
          تمت دعوتك للانضمام إلى{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . انقر على الزر أدناه لقبول الدعوة وإنشاء حسابك.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            قبول الدعوة
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد بأمان.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const link = { color: 'hsl(42, 85%, 55%)', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: 'hsl(220, 35%, 15%)',
  color: 'hsl(42, 100%, 95%)',
  fontSize: '15px',
  fontWeight: '600',
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
