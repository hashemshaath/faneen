/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
  refId?: string
}

const LeadRejectedEmail: React.FC<Props> = ({ name, businessName, refId }) => (
  <BilingualEmail
    preview={`تعذر قبول طلبك حاليًا · Your request could not be accepted`}
    badge={{ textAr: 'تعذر القبول', textEn: 'Not accepted', tone: 'danger' }}
    titleAr="تعذر قبول طلبك حاليًا"
    titleEn="Your request could not be accepted right now"
    greetingNameAr={name}
    greetingNameEn={name}
    introAr={
      <>
        نأسف، لم تتمكن <strong>{businessName ?? 'المنشأة'}</strong> من قبول طلبك في الوقت الحالي.
        يمكنك تصفح مزودين آخرين في القطاع نفسه ومقارنة العروض.
      </>
    }
    introEn={
      <>
        We're sorry — <strong>{businessName ?? 'the provider'}</strong> wasn't able to accept your
        request right now. You can browse other providers in the same sector and compare offerings.
      </>
    }
    details={refId ? [{ labelAr: 'رقم الطلب', labelEn: 'Request ID', value: refId }] : undefined}
    cta={{
      href: `${SITE_URL}/search`,
      labelAr: 'تصفح مزودين آخرين',
      labelEn: 'Browse other providers',
    }}
  />
)

export const template = {
  component: LeadRejectedEmail,
  subject: (data: Record<string, any>) =>
    `تعذر قبول طلبك ${data?.refId ? `(${data.refId}) ` : ''}· Request not accepted — ${SITE_NAME_AR}`,
  displayName: 'رفض طلب الخدمة · Lead rejected',
  previewData: { name: 'سارة أحمد', businessName: 'مصنع الألمنيوم المتقدم', refId: 'LR-1000123' },
} satisfies TemplateEntry