/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "قِطاعات"

interface MigrationFailureAlertProps {
  failureRate?: number
  threshold?: number
  totalEvents?: number
  failedEvents?: number
  windowHours?: number
  reportUrl?: string
}

const MigrationFailureAlertEmail = ({
  failureRate = 0,
  threshold = 0,
  totalEvents = 0,
  failedEvents = 0,
  windowHours = 24,
  reportUrl,
}: MigrationFailureAlertProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تنبيه: ارتفاع نسبة فشل ترحيل البيانات إلى {failureRate}%</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>قِطاعات</Text>
        </Section>
        <Hr style={hr} />
        <Heading style={h1}>⚠️ تنبيه: ارتفاع نسبة فشل ترحيل البيانات</Heading>
        <Text style={text}>
          تم رصد ارتفاع في نسبة فشل عمليات ترحيل مفاتيح localStorage خلال آخر {windowHours} ساعة،
          وتجاوزت العتبة المحددة في إعدادات النظام.
        </Text>

        <Section style={alertBox}>
          <Text style={metricRow}>نسبة الفشل الحالية: <strong style={bigNumber}>{failureRate}%</strong></Text>
          <Text style={metricRow}>العتبة المحددة: <strong>{threshold}%</strong></Text>
          <Text style={metricRow}>نافذة التقييم: <strong>{windowHours} ساعة</strong></Text>
          <Text style={metricRow}>إجمالي العمليات: <strong>{totalEvents}</strong></Text>
          <Text style={metricRow}>عمليات فاشلة: <strong>{failedEvents}</strong></Text>
        </Section>

        <Text style={text}>
          يُنصح بمراجعة تقرير الترحيل وفحص رسائل الخطأ المصنفة (RLS، JSON parse، مفاتيح مفقودة...) لتحديد سبب الارتفاع.
        </Text>

        {reportUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={reportUrl} style={button}>فتح تقرير الترحيل</Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          هذا البريد مرسل تلقائياً من نظام {SITE_NAME} — لن يتكرر هذا التنبيه قبل انقضاء فترة التهدئة.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MigrationFailureAlertEmail,
  subject: (data: Record<string, any>) =>
    `⚠️ ارتفاع فشل ترحيل البيانات (${data.failureRate ?? 0}%) - ${SITE_NAME}`,
  displayName: 'تنبيه فشل ترحيل البيانات',
  previewData: {
    failureRate: 32.5,
    threshold: 25,
    totalEvents: 120,
    failedEvents: 39,
    windowHours: 6,
    reportUrl: 'https://qitaat.lovable.app/admin/migration-report',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '28px', fontWeight: '700', color: 'hsl(220, 35%, 15%)', margin: '0' }
const hr = { borderColor: 'hsl(220, 15%, 88%)', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(0, 70%, 40%)', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 35%)', lineHeight: '1.7', margin: '0 0 14px', textAlign: 'right' as const }
const alertBox = { backgroundColor: 'hsl(0, 80%, 97%)', borderRadius: '12px', padding: '20px', margin: '16px 0', borderRight: '4px solid hsl(0, 70%, 50%)' as any }
const metricRow = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', margin: '8px 0', textAlign: 'right' as const }
const bigNumber = { fontSize: '18px', color: 'hsl(0, 70%, 45%)' }
const button = { backgroundColor: 'hsl(220, 35%, 15%)', color: '#fff', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: 'hsl(220, 10%, 45%)', margin: '20px 0 0', textAlign: 'center' as const }
