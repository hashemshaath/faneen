/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; businessName?: string; sector?: string; city?: string; url?: string }

const Email: React.FC<Props> = ({ ref, businessName, sector, city, url }) => (
  <BilingualEmail
    preview={`فرصة جديدة مطابقة ${ref ?? ''} · New matching opportunity`}
    badge={{ textAr: 'فرصة جديدة', textEn: 'New opportunity', tone: 'success' }}
    titleAr="فرصة جديدة مطابقة لنشاطك"
    titleEn="A new opportunity matched your business"
    greetingNameAr={businessName}
    greetingNameEn={businessName}
    introAr={`تمت إضافتك كمزود مرشح للفرصة ${ref ?? ''}. سارع بتقديم عرضك لرفع فرصة الفوز.`}
    introEn={`You were matched on opportunity ${ref ?? ''}. Submit your bid quickly to maximize your chance of winning.`}
    details={[
      ...(sector ? [{ labelAr: 'القطاع', labelEn: 'Sector', value: sector }] : []),
      ...(city ? [{ labelAr: 'المدينة', labelEn: 'City', value: city }] : []),
    ]}
    tipAr="المزودون الذين يردّون خلال أول ساعة يحققون أعلى نسبة فوز."
    tipEn="Providers who respond in the first hour have the highest win rate."
    cta={url ? { href: url, labelAr: 'تقديم العرض', labelEn: 'Submit your bid' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `فرصة جديدة ${d?.ref ?? ''} · New opportunity — ${SITE_NAME_AR}`,
  displayName: 'فرصة: تم المطابقة للمزود · Opportunity matched (provider)',
  previewData: { ref: 'OPP-1000123', businessName: 'مصنع الألمنيوم المتقدم', sector: 'الألمنيوم', city: 'جدة', url: 'https://qitaat.com/dashboard/opportunities/OPP-1000123' },
} satisfies TemplateEntry