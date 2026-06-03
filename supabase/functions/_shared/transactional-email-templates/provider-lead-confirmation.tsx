/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  nameAr?: string
  nameEn?: string
  contactName?: string
  referenceCode?: string
}

const ProviderLeadConfirmationEmail: React.FC<Props> = ({
  nameAr, nameEn, contactName, referenceCode,
}) => (
  <BilingualEmail
    preview={`تم استلام طلب الانضمام إلى ${SITE_NAME_AR} · Your join request was received`}
    badge={{ textAr: 'تم الاستلام', textEn: 'Received', tone: 'success' }}
    titleAr="سعادتنا بثقتكم بقطاعات"
    titleEn="Thank you for joining Qitaat"
    greetingNameAr={contactName}
    greetingNameEn={contactName}
    introAr={
      <>
        تم استلام طلب انضمام منشأة <strong>{nameAr ?? nameEn ?? ''}</strong> إلى منصة قِطاعات،
        وسيتم مراجعته وإرسال تأكيد التسجيل خلال فترة قصيرة.
      </>
    }
    introEn={
      <>
        We've received the join request for <strong>{nameEn ?? nameAr ?? ''}</strong>.
        Our team will review it and send you a confirmation shortly.
      </>
    }
    details={referenceCode ? [
      { labelAr: 'الرقم المرجعي', labelEn: 'Reference', value: referenceCode, mono: true },
    ] : undefined}
    cta={referenceCode ? {
      href: `https://qitaat.com/join/qitaat/edit?ref=${encodeURIComponent(referenceCode)}`,
      labelAr: 'تعديل بيانات الطلب',
      labelEn: 'Edit my request',
    } : undefined}
    tipAr="غالبية الطلبات تتم مراجعتها خلال 24–48 ساعة عمل. سنتواصل معكم عبر القناة المفضلة المختارة."
    tipEn="Most requests are reviewed within 24–48 business hours. We will reach out via your preferred contact channel."
  />
)

export const template = {
  component: ProviderLeadConfirmationEmail,
  subject: () => `تم استلام طلب الانضمام · Join request received — ${SITE_NAME_AR}`,
  displayName: 'تأكيد طلب انضمام مزود · Provider join confirmation',
  previewData: {
    nameAr: 'مصنع النموذج للألمنيوم',
    nameEn: 'Sample Aluminum Factory',
    contactName: 'أحمد العتيبي',
    referenceCode: 'PRV-1000001',
  },
} satisfies TemplateEntry