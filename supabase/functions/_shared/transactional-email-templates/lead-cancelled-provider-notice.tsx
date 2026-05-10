/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  businessName?: string
  refId?: string
}

const LeadCancelledProviderEmail: React.FC<Props> = ({ businessName, refId }) => (
  <BilingualEmail
    preview={`تم إلغاء طلب خدمة من العميل · A customer cancelled a service request`}
    badge={{ textAr: 'تم الإلغاء', textEn: 'Cancelled', tone: 'neutral' }}
    titleAr="تم إلغاء طلب خدمة من العميل"
    titleEn="A customer cancelled a service request"
    introAr={
      <>
        قام العميل بإلغاء طلب الخدمة الموجّه إلى <strong>{businessName ?? 'منشأتك'}</strong>.
        لا يلزم اتخاذ أي إجراء — تم تحديث حالة الطلب تلقائيًا في لوحة التحكم.
      </>
    }
    introEn={
      <>
        The customer cancelled the service request sent to <strong>{businessName ?? 'your business'}</strong>.
        No action is required — the request status has been updated in your dashboard.
      </>
    }
    details={refId ? [{ labelAr: 'رقم الطلب', labelEn: 'Request ID', value: refId }] : undefined}
    cta={{
      href: `${SITE_URL}/dashboard/leads`,
      labelAr: 'فتح طلبات الخدمة',
      labelEn: 'Open service requests',
    }}
  />
)

export const template = {
  component: LeadCancelledProviderEmail,
  subject: (data: Record<string, any>) =>
    `تم إلغاء طلب خدمة ${data?.refId ? `(${data.refId}) ` : ''}· Service request cancelled — ${SITE_NAME_AR}`,
  displayName: 'إشعار إلغاء طلب للمزود · Lead cancelled (provider)',
  previewData: { businessName: 'مصنع الألمنيوم المتقدم', refId: 'LR-1000123' },
} satisfies TemplateEntry