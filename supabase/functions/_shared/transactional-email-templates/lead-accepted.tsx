/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
  refId?: string
}

const LeadAcceptedEmail: React.FC<Props> = ({ name, businessName, refId }) => (
  <BilingualEmail
    preview={`تم قبول طلبك من ${businessName ?? 'المنشأة'} · Your request was accepted`}
    badge={{ textAr: 'تم القبول', textEn: 'Accepted', tone: 'success' }}
    titleAr="تم قبول طلبك ✓"
    titleEn="Your request has been accepted ✓"
    greetingNameAr={name}
    greetingNameEn={name}
    introAr={
      <>
        قبلت <strong>{businessName ?? 'المنشأة'}</strong> طلبك. سيتواصل معك ممثل المنشأة قريبًا
        عبر وسيلة التواصل التي اخترتها، أو يمكنك متابعة حالة الطلب من لوحة التحكم.
      </>
    }
    introEn={
      <>
        <strong>{businessName ?? 'The provider'}</strong> has accepted your request.
        A representative will contact you shortly, or you can follow up from your dashboard.
      </>
    }
    details={refId ? [{ labelAr: 'رقم الطلب', labelEn: 'Request ID', value: refId }] : undefined}
    cta={{
      href: `${SITE_URL}/dashboard/my-requests`,
      labelAr: 'متابعة طلباتي',
      labelEn: 'Track my requests',
    }}
  />
)

export const template = {
  component: LeadAcceptedEmail,
  subject: (data: Record<string, any>) =>
    `تم قبول طلبك ${data?.refId ? `(${data.refId}) ` : ''}· Request accepted — ${SITE_NAME_AR}`,
  displayName: 'قبول طلب الخدمة · Lead accepted',
  previewData: { name: 'سارة أحمد', businessName: 'مصنع الألمنيوم المتقدم', refId: 'LR-1000123' },
} satisfies TemplateEntry