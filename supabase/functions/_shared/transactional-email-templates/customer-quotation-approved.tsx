/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  actionUrl?: string
  refId?: string
}

const CustomerQuotationApprovedEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="تأكيد اعتماد عرض السعر · Quotation approval confirmation"
    badge={{ textAr: 'تم الاعتماد', textEn: 'Approved', tone: 'success' }}
    titleAr="تم اعتماد عرض السعر"
    titleEn="Your quotation has been approved"
    introAr="شكراً لاعتماد عرض السعر. سيتم تجهيز العقد والخطوات التالية قريباً."
    introEn="Thank you for approving your quotation. The contract and next steps will follow shortly."
    details={refId ? [{ labelAr: 'رقم المرجع', labelEn: 'Reference', value: refId, mono: true }] : undefined}
    cta={{
      href: actionUrl ?? `${SITE_URL}/dashboard`,
      labelAr: 'فتح المشروع',
      labelEn: 'Open project',
    }}
  />
)

export const template = {
  component: CustomerQuotationApprovedEmail,
  subject: `تأكيد اعتماد عرض السعر · Quotation approved — ${SITE_NAME_AR}`,
  displayName: 'اعتماد عرض السعر · Customer quotation approved',
  previewData: { actionUrl: `${SITE_URL}/q/QT-1000123`, refId: 'QT-1000123' },
} satisfies TemplateEntry