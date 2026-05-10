/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
  refId?: string
}

const LeadNeedsInfoEmail: React.FC<Props> = ({ name, businessName, refId }) => (
  <BilingualEmail
    preview={`المنشأة بحاجة معلومات إضافية لطلبك · The provider needs more info`}
    badge={{ textAr: 'بحاجة معلومات', textEn: 'Needs info', tone: 'warning' }}
    titleAr="نحتاج بعض المعلومات الإضافية"
    titleEn="We need some additional information"
    greetingNameAr={name}
    greetingNameEn={name}
    introAr={
      <>
        تحتاج <strong>{businessName ?? 'المنشأة'}</strong> إلى معلومات إضافية لإكمال مراجعة طلبك.
        يمكنك متابعة الطلب من لوحة التحكم وإكمال البيانات المطلوبة.
      </>
    }
    introEn={
      <>
        <strong>{businessName ?? 'The provider'}</strong> needs additional information to continue
        reviewing your request. You can follow up from your dashboard.
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
  component: LeadNeedsInfoEmail,
  subject: (data: Record<string, any>) =>
    `المنشأة بحاجة معلومات لطلبك ${data?.refId ? `(${data.refId}) ` : ''}· More info needed — ${SITE_NAME_AR}`,
  displayName: 'طلب معلومات إضافية · Lead needs info',
  previewData: { name: 'سارة أحمد', businessName: 'مصنع الألمنيوم المتقدم', refId: 'LR-1000123' },
} satisfies TemplateEntry