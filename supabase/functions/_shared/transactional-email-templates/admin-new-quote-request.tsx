/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface AdminNewQuoteRequestProps {
  ref_id?: string
  quote_request_id?: string
  customer_name?: string
  customer_phone?: string
  city?: string
  sector?: string
  admin_url?: string
}

const AdminNewQuoteRequestEmail: React.FC<AdminNewQuoteRequestProps> = ({
  ref_id, quote_request_id, customer_name, customer_phone, city, sector, admin_url,
}) => (
  <BilingualEmail
    preview={`طلب عرض سعر جديد يحتاج مراجعة · New quote request needs review`}
    badge={{ textAr: 'إشعار إداري', textEn: 'Admin alert', tone: 'info' }}
    titleAr="طلب عرض سعر جديد يحتاج مراجعة"
    titleEn="New quote request needs review"
    introAr="تم استقبال طلب عرض سعر جديد في قطاعات ويحتاج مراجعة من لوحة الإدارة."
    introEn="A new quote request was received in Qitaat and requires admin review."
    details={[
      ...(ref_id ? [{ labelAr: 'رقم الطلب', labelEn: 'Reference', value: ref_id, mono: true }] : []),
      ...(quote_request_id ? [{ labelAr: 'معرف السجل', labelEn: 'Record ID', value: quote_request_id, mono: true }] : []),
      ...(customer_name ? [{ labelAr: 'العميل', labelEn: 'Customer', value: customer_name }] : []),
      ...(customer_phone ? [{ labelAr: 'الجوال', labelEn: 'Phone', value: customer_phone, mono: true }] : []),
      ...(sector ? [{ labelAr: 'القطاع', labelEn: 'Sector', value: sector }] : []),
      ...(city ? [{ labelAr: 'المدينة', labelEn: 'City', value: city }] : []),
    ]}
    cta={admin_url ? {
      href: admin_url,
      labelAr: 'فتح في لوحة الإدارة',
      labelEn: 'Open in admin dashboard',
    } : undefined}
  />
)

export const template = {
  component: AdminNewQuoteRequestEmail,
  subject: (data: Record<string, any>) =>
    `طلب عرض سعر جديد${data?.ref_id ? ` (${data.ref_id})` : ''} · New quote request — ${SITE_NAME_AR}`,
  to: Deno.env.get('ADMIN_CONTACT_EMAIL') || 'info@qitaat.com',
  displayName: 'إشعار طلب عرض سعر جديد للإدارة · Admin new quote request',
  previewData: {
    ref_id: 'REQ-1000001',
    quote_request_id: '33d90fce-18db-47f3-ad5b-57f69f942e03',
    customer_name: 'أحمد العتيبي',
    customer_phone: '0501234567',
    city: 'جدة',
    sector: 'aluminum-works',
    admin_url: 'https://qitaat.com/admin/quote-requests',
  },
} satisfies TemplateEntry