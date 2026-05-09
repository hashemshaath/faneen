/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr, Button, Row, Column,
} from 'npm:@react-email/components@0.0.22'

export const SITE_NAME_AR = 'قِطاعات'
export const SITE_NAME_EN = 'Qitaat'
export const SITE_URL = 'https://qitaat.com'
export const SUPPORT_EMAIL = 'support@qitaat.com'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger'

export interface DetailRow {
  labelAr: string
  labelEn: string
  value?: React.ReactNode
  mono?: boolean
}

export interface BilingualEmailProps {
  preview: string
  /** Optional badge above titles, e.g. "تم التأكيد · Confirmed" */
  badge?: { textAr: string; textEn: string; tone?: BadgeTone }
  titleAr: string
  titleEn: string
  /** Optional short greeting (recipient name). */
  greetingNameAr?: string
  greetingNameEn?: string
  introAr: React.ReactNode
  introEn: React.ReactNode
  details?: DetailRow[]
  /** Highlighted message block (e.g. user-submitted text). */
  highlight?: { labelAr: string; labelEn: string; content: React.ReactNode }
  bodyAr?: React.ReactNode
  bodyEn?: React.ReactNode
  cta?: { href: string; labelAr: string; labelEn: string }
  /** Optional secondary "tip" callout. */
  tipAr?: React.ReactNode
  tipEn?: React.ReactNode
  /** Hide the standard signature block. */
  hideSignature?: boolean
}

const TONE_BG: Record<BadgeTone, string> = {
  neutral: 'hsl(220, 20%, 95%)',
  success: 'hsl(142, 60%, 94%)',
  warning: 'hsl(42, 90%, 92%)',
  info: 'hsl(210, 90%, 95%)',
  danger: 'hsl(0, 80%, 95%)',
}
const TONE_FG: Record<BadgeTone, string> = {
  neutral: 'hsl(220, 30%, 25%)',
  success: 'hsl(142, 71%, 25%)',
  warning: 'hsl(28, 80%, 30%)',
  info: 'hsl(210, 80%, 30%)',
  danger: 'hsl(0, 75%, 35%)',
}

export const BilingualEmail: React.FC<BilingualEmailProps> = ({
  preview,
  badge,
  titleAr,
  titleEn,
  greetingNameAr,
  greetingNameEn,
  introAr,
  introEn,
  details,
  highlight,
  bodyAr,
  bodyEn,
  cta,
  tipAr,
  tipEn,
  hideSignature,
}) => {
  const tone = badge?.tone ?? 'neutral'
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={outer}>
          {/* Brand bar */}
          <Section style={brandBar}>
            <Row>
              <Column align="center">
                <Text style={brandMark}>ق</Text>
                <Text style={brandName}>قِطاعات · Qitaat</Text>
                <Text style={brandTag}>الدليل الصناعي · Industrial Directory</Text>
              </Column>
            </Row>
          </Section>

          {/* Card */}
          <Section style={card}>
            {/* Accent bar */}
            <Section style={accentBar} />

            {/* Optional badge */}
            {badge && (
              <Section style={{ textAlign: 'center' as const, padding: '20px 24px 0' }}>
                <Text
                  style={{
                    ...badgeStyle,
                    backgroundColor: TONE_BG[tone],
                    color: TONE_FG[tone],
                  }}
                >
                  {badge.textAr} · {badge.textEn}
                </Text>
              </Section>
            )}

            {/* Arabic block */}
            <Section dir="rtl" style={langBlock}>
              <Heading style={h1Ar}>
                {greetingNameAr ? `${titleAr} — ${greetingNameAr}` : titleAr}
              </Heading>
              {greetingNameAr && (
                <Text style={greetAr}>مرحباً {greetingNameAr}،</Text>
              )}
              <Text style={textAr}>{introAr}</Text>
              {bodyAr && <Text style={textAr}>{bodyAr}</Text>}

              {details && details.length > 0 && (
                <Section style={detailsBox} dir="rtl">
                  {details.map((d, i) => (
                    <Row key={`ar-${i}`} style={{ margin: '6px 0' }}>
                      <Column style={detailLabelCellAr}>
                        <Text style={detailLabelAr}>{d.labelAr}</Text>
                      </Column>
                      <Column style={detailValueCellAr}>
                        <Text style={d.mono ? detailValueMonoAr : detailValueAr}>
                          {d.value ?? '—'}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </Section>
              )}

              {highlight && (
                <Section style={highlightBoxRtl}>
                  <Text style={highlightLabelAr}>{highlight.labelAr}</Text>
                  <Text style={highlightTextAr}>{highlight.content}</Text>
                </Section>
              )}

              {tipAr && (
                <Section style={tipBoxAr}>
                  <Text style={tipTextAr}>💡 {tipAr}</Text>
                </Section>
              )}

              {cta && (
                <Section style={ctaWrap}>
                  <Button style={button} href={cta.href}>{cta.labelAr}</Button>
                </Section>
              )}
            </Section>

            {/* Divider with bilingual marker */}
            <Section style={langDivider}>
              <Text style={langDividerText}>عربي · English</Text>
            </Section>

            {/* English block */}
            <Section dir="ltr" style={langBlock}>
              <Heading style={h1En}>
                {greetingNameEn ? `${titleEn} — ${greetingNameEn}` : titleEn}
              </Heading>
              {greetingNameEn && (
                <Text style={greetEn}>Hi {greetingNameEn},</Text>
              )}
              <Text style={textEn}>{introEn}</Text>
              {bodyEn && <Text style={textEn}>{bodyEn}</Text>}

              {details && details.length > 0 && (
                <Section style={detailsBox} dir="ltr">
                  {details.map((d, i) => (
                    <Row key={`en-${i}`} style={{ margin: '6px 0' }}>
                      <Column style={detailLabelCellEn}>
                        <Text style={detailLabelEn}>{d.labelEn}</Text>
                      </Column>
                      <Column style={detailValueCellEn}>
                        <Text style={d.mono ? detailValueMonoEn : detailValueEn}>
                          {d.value ?? '—'}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </Section>
              )}

              {highlight && (
                <Section style={highlightBoxLtr}>
                  <Text style={highlightLabelEn}>{highlight.labelEn}</Text>
                  <Text style={highlightTextEn}>{highlight.content}</Text>
                </Section>
              )}

              {tipEn && (
                <Section style={tipBoxEn}>
                  <Text style={tipTextEn}>💡 {tipEn}</Text>
                </Section>
              )}

              {cta && (
                <Section style={ctaWrap}>
                  <Button style={button} href={cta.href}>{cta.labelEn}</Button>
                </Section>
              )}
            </Section>
          </Section>

          {/* Signature */}
          {!hideSignature && (
            <Section style={signature}>
              <Text style={sigName}>فريق قِطاعات · The Qitaat Team</Text>
              <Text style={sigMeta}>
                <Link href={SITE_URL} style={sigLink}>qitaat.com</Link>
                {' · '}
                <Link href={`mailto:${SUPPORT_EMAIL}`} style={sigLink}>{SUPPORT_EMAIL}</Link>
              </Text>
              <Text style={sigDisclaimer}>
                هذه رسالة آلية — لا حاجة للرد عليها.
              </Text>
              <Text style={sigDisclaimerEn}>
                This is an automated message — no reply needed.
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  )
}

/* ─────────── Styles ─────────── */

const main = {
  backgroundColor: 'hsl(220, 20%, 97%)',
  margin: 0,
  padding: '24px 12px',
  fontFamily: "'Noto Sans Arabic', 'Inter', 'Segoe UI', Tahoma, Arial, sans-serif",
}
const outer = { maxWidth: '600px', margin: '0 auto', padding: 0 }
const brandBar = { textAlign: 'center' as const, padding: '4px 0 18px' }
const brandMark = {
  display: 'inline-block',
  width: '52px',
  height: '52px',
  lineHeight: '52px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, hsl(220, 35%, 15%), hsl(220, 35%, 22%))',
  color: 'hsl(42, 100%, 95%)',
  fontSize: '28px',
  fontWeight: 700,
  margin: '0 auto 8px',
  textAlign: 'center' as const,
}
const brandName = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'hsl(220, 35%, 15%)',
  letterSpacing: '0.3px',
  margin: '0 0 2px',
  textAlign: 'center' as const,
}
const brandTag = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'hsl(220, 10%, 50%)',
  margin: 0,
  textAlign: 'center' as const,
  letterSpacing: '0.2px',
}
const card = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid hsl(220, 15%, 90%)',
  overflow: 'hidden' as const,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
}
const accentBar = {
  height: '4px',
  background: 'linear-gradient(90deg, hsl(42, 85%, 55%), hsl(220, 35%, 15%))',
  padding: 0,
  margin: 0,
}
const badgeStyle = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.4px',
  textTransform: 'uppercase' as const,
  padding: '6px 12px',
  borderRadius: '999px',
  margin: 0,
}
const langBlock = { padding: '20px 28px 8px' }
const h1Ar = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'hsl(220, 35%, 15%)',
  lineHeight: '1.4',
  margin: '8px 0 12px',
  textAlign: 'right' as const,
}
const h1En = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'hsl(220, 35%, 15%)',
  lineHeight: '1.4',
  margin: '8px 0 12px',
  textAlign: 'left' as const,
}
const greetAr = {
  fontSize: '15px',
  fontWeight: 600,
  color: 'hsl(220, 30%, 20%)',
  margin: '0 0 8px',
  textAlign: 'right' as const,
}
const greetEn = {
  fontSize: '15px',
  fontWeight: 600,
  color: 'hsl(220, 30%, 20%)',
  margin: '0 0 8px',
  textAlign: 'left' as const,
}
const textAr = {
  fontSize: '15px',
  color: 'hsl(220, 12%, 32%)',
  lineHeight: '1.85',
  margin: '0 0 12px',
  textAlign: 'right' as const,
}
const textEn = {
  fontSize: '15px',
  color: 'hsl(220, 12%, 32%)',
  lineHeight: '1.7',
  margin: '0 0 12px',
  textAlign: 'left' as const,
}
const detailsBox = {
  backgroundColor: 'hsl(220, 25%, 98%)',
  border: '1px solid hsl(220, 15%, 92%)',
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '12px 0 16px',
}
const detailLabelCellAr = { width: '40%', verticalAlign: 'top' as const, paddingLeft: '8px' }
const detailValueCellAr = { width: '60%', verticalAlign: 'top' as const }
const detailLabelCellEn = { width: '40%', verticalAlign: 'top' as const, paddingRight: '8px' }
const detailValueCellEn = { width: '60%', verticalAlign: 'top' as const }
const detailLabelAr = {
  fontSize: '13px',
  color: 'hsl(220, 10%, 45%)',
  margin: 0,
  textAlign: 'right' as const,
  fontWeight: 500,
}
const detailValueAr = {
  fontSize: '14px',
  color: 'hsl(220, 30%, 15%)',
  margin: 0,
  textAlign: 'right' as const,
  fontWeight: 600,
}
const detailValueMonoAr = {
  ...detailValueAr,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  direction: 'ltr' as const,
  unicodeBidi: 'embed' as const,
}
const detailLabelEn = {
  fontSize: '13px',
  color: 'hsl(220, 10%, 45%)',
  margin: 0,
  textAlign: 'left' as const,
  fontWeight: 500,
}
const detailValueEn = {
  fontSize: '14px',
  color: 'hsl(220, 30%, 15%)',
  margin: 0,
  textAlign: 'left' as const,
  fontWeight: 600,
}
const detailValueMonoEn = {
  ...detailValueEn,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
}
const highlightBoxRtl = {
  backgroundColor: 'hsl(42, 90%, 97%)',
  borderRadius: '12px',
  padding: '14px 18px',
  margin: '12px 0',
  borderRight: '4px solid hsl(42, 85%, 55%)',
}
const highlightBoxLtr = {
  backgroundColor: 'hsl(42, 90%, 97%)',
  borderRadius: '12px',
  padding: '14px 18px',
  margin: '12px 0',
  borderLeft: '4px solid hsl(42, 85%, 55%)',
}
const highlightLabelAr = {
  fontSize: '12px',
  fontWeight: 700,
  color: 'hsl(28, 80%, 30%)',
  margin: '0 0 6px',
  textAlign: 'right' as const,
  letterSpacing: '0.3px',
  textTransform: 'uppercase' as const,
}
const highlightLabelEn = {
  ...highlightLabelAr,
  textAlign: 'left' as const,
}
const highlightTextAr = {
  fontSize: '14px',
  color: 'hsl(220, 30%, 15%)',
  margin: 0,
  lineHeight: '1.8',
  textAlign: 'right' as const,
  whiteSpace: 'pre-wrap' as const,
}
const highlightTextEn = {
  fontSize: '14px',
  color: 'hsl(220, 30%, 15%)',
  margin: 0,
  lineHeight: '1.7',
  textAlign: 'left' as const,
  whiteSpace: 'pre-wrap' as const,
}
const tipBoxAr = {
  backgroundColor: 'hsl(210, 80%, 97%)',
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '8px 0 16px',
}
const tipBoxEn = { ...tipBoxAr }
const tipTextAr = {
  fontSize: '13px',
  color: 'hsl(210, 60%, 25%)',
  margin: 0,
  textAlign: 'right' as const,
  lineHeight: '1.7',
}
const tipTextEn = {
  fontSize: '13px',
  color: 'hsl(210, 60%, 25%)',
  margin: 0,
  textAlign: 'left' as const,
  lineHeight: '1.6',
}
const ctaWrap = { textAlign: 'center' as const, margin: '20px 0 8px' }
const button = {
  backgroundColor: 'hsl(220, 35%, 15%)',
  color: 'hsl(42, 100%, 95%)',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
}
const langDivider = {
  textAlign: 'center' as const,
  padding: '4px 0 8px',
  margin: '4px 28px',
  borderTop: '1px dashed hsl(220, 15%, 90%)',
}
const langDividerText = {
  display: 'inline-block',
  marginTop: '-8px',
  padding: '0 10px',
  backgroundColor: '#ffffff',
  fontSize: '10px',
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const,
  color: 'hsl(220, 10%, 55%)',
  fontWeight: 600,
}
const signature = { textAlign: 'center' as const, padding: '20px 16px 0' }
const sigName = { fontSize: '13px', fontWeight: 600, color: 'hsl(220, 30%, 25%)', margin: '0 0 4px' }
const sigMeta = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '0 0 10px' }
const sigLink = { color: 'hsl(42, 85%, 38%)', textDecoration: 'none', fontWeight: 600 }
const sigDisclaimer = { fontSize: '11px', color: 'hsl(220, 10%, 55%)', margin: '6px 0 0', lineHeight: '1.6' }
const sigDisclaimerEn = { fontSize: '11px', color: 'hsl(220, 10%, 55%)', margin: '2px 0 0', lineHeight: '1.5' }

/* Auth-style code/OTP block reused by some templates */
export const otpStyle = {
  display: 'block' as const,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '8px',
  color: 'hsl(220, 35%, 15%)',
  textAlign: 'center' as const,
  backgroundColor: 'hsl(220, 25%, 97%)',
  border: '1px solid hsl(220, 15%, 90%)',
  borderRadius: '12px',
  padding: '18px 12px',
  margin: '12px 0',
}
