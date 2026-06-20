/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; customerName?: string; url?: string }

const Email: React.FC<Props> = ({ ref, customerName, url }) => (
  <BilingualEmail
    preview={`استلمنا طلبك ${ref ?? ''} · Opportunity received`}
    badge={{ textAr: 'تم الاستلام', textEn: 'Received', tone: 'info' }}
    titleAr="استلمنا طلب الفرصة"
    titleEn="We received your opportunity"
    greetingNameAr={customerName}
    greetingNameEn={customerName}
    introAr={`استلمنا طلبك للفرصة ${ref ?? ''} وجاري مطابقتك مع أفضل المزودين المؤهلين.`}
    introEn={`We received opportunity ${ref ?? ''} and are matching you with top qualified providers.`}
    tipAr="سنُعلمك فور وصول أول عرض. قد تتراوح المدة بين بضع ساعات و٢٤ ساعة."
    tipEn="We'll notify you as soon as the first bid arrives — usually within a few hours to 24h."
    cta={url ? { href: url, labelAr: 'فتح الفرصة', labelEn: 'Open opportunity' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `استلمنا طلب الفرصة ${d?.ref ?? ''} · Opportunity received — ${SITE_NAME_AR}`,
  displayName: 'فرصة: تم الاستلام للعميل · Opportunity received (client)',
  previewData: { ref: 'OPP-1000123', customerName: 'سارة أحمد', url: 'https://qitaat.com/opportunities/OPP-1000123' },
} satisfies TemplateEntry