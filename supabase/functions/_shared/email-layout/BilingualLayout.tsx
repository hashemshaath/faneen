/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr, Button, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import { EMAIL_BRAND as B, EMAIL_TINTS as T } from '../brandTheme.ts'

export const SITE_NAME_AR = 'قِطاعات'
export const SITE_NAME_EN = 'Qitaat'
export const SITE_URL = 'https://qitaat.com'
export const SUPPORT_EMAIL = 'support@qitaat.com'
export const LOGO_URL = 'https://qitaat.com/logo.png'

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

/* Status tones — soft tinted backgrounds + readable foregrounds, all sourced
   from the shared brand status palette (no hardcoded random hues). */
const TONE_BG: Record<BadgeTone, string> = { ...T }
const TONE_FG: Record<BadgeTone, string> = {
  neutral: B.text,
  success: B.success,
  warning: B.warning,
  info:    B.info,
  danger:  B.error,
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
                <Link href={SITE_URL} style={brandLink}>
                  <Img
                    src={LOGO_URL}
                    alt="قِطاعات · Qitaat"
                    width="56"
                    height="56"
                    style={brandLogo}
                  />
                </Link>
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
              <Img
                src={LOGO_URL}
                alt="قِطاعات · Qitaat"
                width="36"
                height="36"
                style={sigLogo}
              />
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
  backgroundColor: B.bodyBg,
  margin: 0,
  padding: '24px 12px',
  fontFamily: "'Noto Sans Arabic', 'Inter', 'Segoe UI', Tahoma, Arial, sans-serif",
}
const outer = { maxWidth: '600px', margin: '0 auto', padding: 0 }
const brandBar = { textAlign: 'center' as const, padding: '4px 0 18px' }
const brandLink = {
  display: 'inline-block',
  textDecoration: 'none',
  margin: '0 auto 10px',
}
const brandLogo = {
  display: 'block',
  width: '56px',
  height: '56px',
  borderRadius: '14px',
  margin: '0 auto',
  objectFit: 'contain' as const,
  backgroundColor: B.headerBg,
  padding: '6px',
}
const brandName = {
  fontSize: '15px',
  fontWeight: 700,
  color: B.headerBg,
  letterSpacing: '0.3px',
  margin: '0 0 2px',
  textAlign: 'center' as const,
}
const brandTag = {
  fontSize: '11px',
  fontWeight: 500,
  color: B.muted,
  margin: 0,
  textAlign: 'center' as const,
  letterSpacing: '0.2px',
}
const card = {
  backgroundColor: B.cardBg,
  borderRadius: '16px',
  border: `1px solid ${B.border}`,
  overflow: 'hidden' as const,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
}
const accentBar = {
  height: '4px',
  backgroundColor: B.primaryButton,
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
  color: B.text,
  lineHeight: '1.4',
  margin: '8px 0 12px',
  textAlign: 'right' as const,
}
const h1En = {
  fontSize: '22px',
  fontWeight: 700,
  color: B.text,
  lineHeight: '1.4',
  margin: '8px 0 12px',
  textAlign: 'left' as const,
}
const greetAr = {
  fontSize: '15px',
  fontWeight: 600,
  color: B.text,
  margin: '0 0 8px',
  textAlign: 'right' as const,
}
const greetEn = {
  fontSize: '15px',
  fontWeight: 600,
  color: B.text,
  margin: '0 0 8px',
  textAlign: 'left' as const,
}
const textAr = {
  fontSize: '15px',
  color: B.text,
  lineHeight: '1.85',
  margin: '0 0 12px',
  textAlign: 'right' as const,
}
const textEn = {
  fontSize: '15px',
  color: B.text,
  lineHeight: '1.7',
  margin: '0 0 12px',
  textAlign: 'left' as const,
}
const detailsBox = {
  backgroundColor: B.bodyBg,
  border: `1px solid ${B.border}`,
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
  color: B.muted,
  margin: 0,
  textAlign: 'right' as const,
  fontWeight: 500,
}
const detailValueAr = {
  fontSize: '14px',
  color: B.text,
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
  color: B.muted,
  margin: 0,
  textAlign: 'left' as const,
  fontWeight: 500,
}
const detailValueEn = {
  fontSize: '14px',
  color: B.text,
  margin: 0,
  textAlign: 'left' as const,
  fontWeight: 600,
}
const detailValueMonoEn = {
  ...detailValueEn,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
}
const highlightBoxRtl = {
  backgroundColor: T.success,
  borderRadius: '12px',
  padding: '14px 18px',
  margin: '12px 0',
  borderRight: `4px solid ${B.primaryButton}`,
}
const highlightBoxLtr = {
  backgroundColor: T.success,
  borderRadius: '12px',
  padding: '14px 18px',
  margin: '12px 0',
  borderLeft: `4px solid ${B.primaryButton}`,
}
const highlightLabelAr = {
  fontSize: '12px',
  fontWeight: 700,
  color: B.success,
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
  color: B.text,
  margin: 0,
  lineHeight: '1.8',
  textAlign: 'right' as const,
  whiteSpace: 'pre-wrap' as const,
}
const highlightTextEn = {
  fontSize: '14px',
  color: B.text,
  margin: 0,
  lineHeight: '1.7',
  textAlign: 'left' as const,
  whiteSpace: 'pre-wrap' as const,
}
const tipBoxAr = {
  backgroundColor: T.info,
  borderRadius: '10px',
  padding: '12px 16px',
  margin: '8px 0 16px',
}
const tipBoxEn = { ...tipBoxAr }
const tipTextAr = {
  fontSize: '13px',
  color: B.info,
  margin: 0,
  textAlign: 'right' as const,
  lineHeight: '1.7',
}
const tipTextEn = {
  fontSize: '13px',
  color: B.info,
  margin: 0,
  textAlign: 'left' as const,
  lineHeight: '1.6',
}
const ctaWrap = { textAlign: 'center' as const, margin: '20px 0 8px' }
const button = {
  backgroundColor: B.primaryButton,
  color: B.primaryButtonText,
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
  borderTop: `1px dashed ${B.border}`,
}
const langDividerText = {
  display: 'inline-block',
  marginTop: '-8px',
  padding: '0 10px',
  backgroundColor: B.cardBg,
  fontSize: '10px',
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const,
  color: B.muted,
  fontWeight: 600,
}
const signature = { textAlign: 'center' as const, padding: '20px 16px 0' }
const sigName = { fontSize: '13px', fontWeight: 600, color: B.text, margin: '0 0 4px' }
const sigLogo = {
  display: 'block',
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  margin: '0 auto 8px',
  objectFit: 'contain' as const,
  backgroundColor: B.headerBg,
  padding: '4px',
  opacity: 0.95,
}
const sigMeta = { fontSize: '12px', color: B.muted, margin: '0 0 10px' }
const sigLink = { color: B.primaryButton, textDecoration: 'none', fontWeight: 600 }
const sigDisclaimer = { fontSize: '11px', color: B.muted, margin: '6px 0 0', lineHeight: '1.6' }
const sigDisclaimerEn = { fontSize: '11px', color: B.muted, margin: '2px 0 0', lineHeight: '1.5' }

/* Auth-style code/OTP block reused by some templates */
export const otpStyle = {
  display: 'block' as const,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '8px',
  color: B.text,
  textAlign: 'center' as const,
  backgroundColor: B.bodyBg,
  border: `1px solid ${B.border}`,
  borderRadius: '12px',
  padding: '18px 12px',
  margin: '12px 0',
}
