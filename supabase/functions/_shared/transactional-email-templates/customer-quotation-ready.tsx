/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  actionUrl?: string
  refId?: string
}

const CustomerQuotationReadyEmail: React.FC<Props> = ({ actionUrl, refId }) => (
  <BilingualEmail
    preview="عرض السعر جاهز للمراجعة · Your quotation is ready for review"
    badge={{ textAr: 'جاهز للمراجعة', textEn: 'Ready for review', tone: 'info' }}
    titleAr="عرض السعر جاهز للمراجعة"
    titleEn="Your quotation is ready for review"
    introAr="تم إرسال عرض السعر إليك. يمكنك مراجعة التفاصيل واعتماده أو طلب التعديل عبر الرابط الآمن أدناه."
    introEn="A quotation has been prepared for you. Review the details and approve or request changes through the secure link below."
    details={refId ? [{ labelAr: 'رقم المرجع', labelEn: 'Reference', value: refId, mono: true }] : undefined}
    cta={{
      href: actionUrl ?? `${SITE_URL}/dashboard`,
      labelAr: 'مراجعة عرض السعر',
      labelEn: 'Review quotation',
    }}
  />
)

export const template = {
  component: CustomerQuotationReadyEmail,
  subject: `عرض السعر جاهز للمراجعة · Your quotation is ready — ${SITE_NAME_AR}`,
  displayName: 'عرض سعر جاهز للمراجعة · Customer quotation ready',
  previewData: { actionUrl: `${SITE_URL}/q/QT-1000123`, refId: 'QT-1000123' },
} satisfies TemplateEntry