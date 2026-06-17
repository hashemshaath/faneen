/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface QuoteReceivedProps {
  ref_id?: string
  customer_name?: string
  city?: string
  sector?: string
  submitted_at?: string
}

const QuoteReceivedEmail: React.FC<QuoteReceivedProps> = ({
  ref_id, customer_name, city, sector, submitted_at,
}) => (
  <BilingualEmail
    preview={`تم استلام طلبك في ${SITE_NAME_AR} · We received your quote request`}
    badge={{ textAr: 'تم الاستلام', textEn: 'Received', tone: 'success' }}
    titleAr="تم استلام طلبك في قطاعات"
    titleEn="Your quote request was received"
    greetingNameAr={customer_name}
    greetingNameEn={customer_name}
    introAr="تم استلام طلب عرض السعر الخاص بك بنجاح. سيقوم فريق قطاعات بمراجعة الطلب والتواصل معك أو توجيهه للجهات المناسبة حسب تفاصيله."
    introEn="We have successfully received your quote request. The Qitaat team will review it and either contact you or route it to the appropriate parties based on its details."
    details={[
      ...(ref_id ? [{ labelAr: 'رقم الطلب', labelEn: 'Reference', value: ref_id, mono: true }] : []),
      ...(sector ? [{ labelAr: 'القطاع', labelEn: 'Sector', value: sector }] : []),
      ...(city ? [{ labelAr: 'المدينة', labelEn: 'City', value: city }] : []),
      ...(submitted_at ? [{ labelAr: 'وقت الإرسال', labelEn: 'Submitted at', value: submitted_at, mono: true }] : []),
    ]}
    tipAr="سنوافيك بأي تحديثات على هذا البريد. لا حاجة لأي إجراء إضافي حالياً."
    tipEn="We will update you on this email. No further action is required from you at this stage."
  />
)

export const template = {
  component: QuoteReceivedEmail,
  subject: () => `تم استلام طلبك في قطاعات · Quote request received — ${SITE_NAME_AR}`,
  displayName: 'تأكيد استلام طلب عرض سعر · Quote request received',
  previewData: {
    ref_id: 'REQ-1000001',
    customer_name: 'أحمد العتيبي',
    city: 'جدة',
    sector: 'aluminum-works',
    submitted_at: '2026-06-17 10:30',
  },
} satisfies TemplateEntry