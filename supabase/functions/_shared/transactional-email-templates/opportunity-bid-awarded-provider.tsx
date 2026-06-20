/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; businessName?: string; url?: string }

const Email: React.FC<Props> = ({ ref, businessName, url }) => (
  <BilingualEmail
    preview={`مبروك! تم تعميد عرضك ${ref ?? ''} · Bid awarded`}
    badge={{ textAr: 'تم التعميد', textEn: 'Awarded', tone: 'success' }}
    titleAr="مبروك! تم تعميد عرضك"
    titleEn="Congratulations — your bid was awarded"
    greetingNameAr={businessName}
    greetingNameEn={businessName}
    introAr={`تم اختيار عرضك كعرض فائز على الفرصة ${ref ?? ''}. الخطوة التالية: مراجعة العقد المبدئي وإكمال الإجراءات مع العميل.`}
    introEn={`Your bid was selected as the winning bid on opportunity ${ref ?? ''}. Next step: review the draft contract and proceed with the client.`}
    tipAr="جودة التواصل في أول 24 ساعة تنعكس على تقييم العميل."
    tipEn="Strong communication in the first 24 hours reflects on your client rating."
    cta={url ? { href: url, labelAr: 'فتح الفرصة', labelEn: 'Open opportunity' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `مبروك! تم تعميد عرضك ${d?.ref ?? ''} · Bid awarded — ${SITE_NAME_AR}`,
  displayName: 'فرصة: تم التعميد للمزود · Bid awarded (provider)',
  previewData: { ref: 'OPP-1000123', businessName: 'مصنع الألمنيوم المتقدم', url: 'https://qitaat.com/dashboard/opportunities/OPP-1000123' },
} satisfies TemplateEntry