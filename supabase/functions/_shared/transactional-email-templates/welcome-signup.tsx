/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'قِطاعات'
const SITE_NAME_EN = 'Qitaat'
const SITE_URL = 'https://qitaat.com'

interface WelcomeSignupProps {
  fullName?: string
  dashboardUrl?: string
}

const WelcomeSignupEmail = ({ fullName, dashboardUrl }: WelcomeSignupProps) => {
  const ctaUrl = dashboardUrl || `${SITE_URL}/dashboard`
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap"
        />
      </Head>
      <Preview>أهلاً بك في {SITE_NAME} — Welcome to {SITE_NAME_EN}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header / Brand */}
          <Section style={brandBar}>
            <Text style={brandMark}>ق</Text>
            <Text style={brandName}>قِطاعات · Qitaat</Text>
          </Section>

          {/* Arabic Section */}
          <Section dir="rtl" style={langSection}>
            <Heading style={h1Ar}>
              {fullName ? `أهلاً بك يا ${fullName} 👋` : 'أهلاً بك في قِطاعات 👋'}
            </Heading>
            <Text style={textAr}>
              يسعدنا انضمامك إلى <strong>قِطاعات</strong> — الدليل الصناعي المتخصص في
              قطاعات الألمنيوم والزجاج والأخشاب والحديد. حسابك جاهز الآن للاستخدام.
            </Text>
            <Text style={textAr}>من خلال حسابك يمكنك:</Text>
            <ul style={listAr}>
              <li style={liAr}>استكشاف المزودين والمصانع المعتمدين.</li>
              <li style={liAr}>طلب عروض أسعار وإدارة العقود إلكترونياً.</li>
              <li style={liAr}>متابعة المشاريع والاتفاقيات في لوحة تحكم واحدة.</li>
            </ul>
            <Section style={ctaWrap}>
              <Button style={button} href={ctaUrl}>الانتقال إلى لوحة التحكم</Button>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* English Section */}
          <Section dir="ltr" style={langSection}>
            <Heading style={h1En}>
              {fullName ? `Welcome, ${fullName} 👋` : 'Welcome to Qitaat 👋'}
            </Heading>
            <Text style={textEn}>
              Thanks for joining <strong>Qitaat</strong> — the specialized industrial
              directory for Aluminum, Glass, Wood, and Steel sectors. Your account is
              ready to use.
            </Text>
            <Text style={textEn}>From your account you can:</Text>
            <ul style={listEn}>
              <li style={liEn}>Discover verified providers and factories.</li>
              <li style={liEn}>Request quotes and manage contracts online.</li>
              <li style={liEn}>Track projects and agreements in one dashboard.</li>
            </ul>
            <Section style={ctaWrap}>
              <Button style={button} href={ctaUrl}>Go to dashboard</Button>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* Signature */}
          <Section style={signature}>
            <Text style={sigName}>فريق قِطاعات · The Qitaat Team</Text>
            <Text style={sigMeta}>
              <Link href={SITE_URL} style={sigLink}>qitaat.com</Link>
              {' · '}
              <Link href={`mailto:support@qitaat.com`} style={sigLink}>support@qitaat.com</Link>
            </Text>
            <Text style={sigDisclaimer}>
              هذه رسالة آلية — لا حاجة للرد عليها. · This is an automated message — no
              reply needed.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeSignupEmail,
  subject: (data: Record<string, any>) =>
    data.fullName
      ? `أهلاً ${data.fullName} في قِطاعات · Welcome to Qitaat`
      : 'أهلاً بك في قِطاعات · Welcome to Qitaat',
  displayName: 'بريد الترحيب بعد التسجيل',
  previewData: { fullName: 'أحمد العتيبي', dashboardUrl: 'https://qitaat.com/dashboard' },
} satisfies TemplateEntry

// Styles — Apple-like industrial, brand HSL(220,35%,15%) primary, gold accent
const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Noto Sans Arabic', 'Inter', 'Segoe UI', Tahoma, Arial, sans-serif",
}
const container = { padding: '24px 30px', maxWidth: '600px', margin: '0 auto' }
const brandBar = {
  textAlign: 'center' as const,
  padding: '8px 0 20px',
}
const brandMark = {
  display: 'inline-block',
  width: '44px',
  height: '44px',
  lineHeight: '44px',
  borderRadius: '12px',
  backgroundColor: 'hsl(220, 35%, 15%)',
  color: 'hsl(42, 100%, 95%)',
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 auto 8px',
  textAlign: 'center' as const,
}
const brandName = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'hsl(220, 30%, 25%)',
  letterSpacing: '0.5px',
  margin: 0,
  textAlign: 'center' as const,
}
const langSection = { padding: '8px 0' }
const h1Ar = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'hsl(220, 35%, 15%)',
  margin: '0 0 14px',
  textAlign: 'right' as const,
}
const h1En = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'hsl(220, 35%, 15%)',
  margin: '0 0 14px',
  textAlign: 'left' as const,
}
const textAr = {
  fontSize: '15px',
  color: 'hsl(220, 10%, 35%)',
  lineHeight: '1.8',
  margin: '0 0 12px',
  textAlign: 'right' as const,
}
const textEn = {
  fontSize: '15px',
  color: 'hsl(220, 10%, 35%)',
  lineHeight: '1.7',
  margin: '0 0 12px',
  textAlign: 'left' as const,
}
const listAr = {
  paddingRight: '20px',
  paddingLeft: '0',
  margin: '0 0 16px',
  color: 'hsl(220, 10%, 35%)',
  fontSize: '15px',
  lineHeight: '1.9',
}
const liAr = { margin: '4px 0', textAlign: 'right' as const }
const listEn = {
  paddingLeft: '20px',
  paddingRight: '0',
  margin: '0 0 16px',
  color: 'hsl(220, 10%, 35%)',
  fontSize: '15px',
  lineHeight: '1.7',
}
const liEn = { margin: '4px 0', textAlign: 'left' as const }
const ctaWrap = { textAlign: 'center' as const, margin: '20px 0 8px' }
const button = {
  backgroundColor: 'hsl(220, 35%, 15%)',
  color: 'hsl(42, 100%, 95%)',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const divider = { borderColor: 'hsl(220, 15%, 90%)', margin: '24px 0' }
const signature = { textAlign: 'center' as const, padding: '4px 0 0' }
const sigName = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'hsl(220, 30%, 25%)',
  margin: '0 0 4px',
}
const sigMeta = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '0 0 8px' }
const sigLink = { color: 'hsl(42, 85%, 45%)', textDecoration: 'none' }
const sigDisclaimer = {
  fontSize: '11px',
  color: 'hsl(220, 10%, 55%)',
  margin: '8px 0 0',
  lineHeight: '1.6',
}