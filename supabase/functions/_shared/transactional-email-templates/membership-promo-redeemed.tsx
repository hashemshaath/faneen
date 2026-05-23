/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  promoCode?: string
  tierName?: string
  expiresAt?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, promoCode, tierName, expiresAt }) => (
  <BilingualEmail
    preview={`تم استبدال كود الترويج · Promo code redeemed`}
    badge={{ textAr: 'تم الاستبدال', textEn: 'Redeemed', tone: 'success' }}
    titleAr="تم استبدال كود الترويج"
    titleEn="Promo code redeemed"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={`تم استبدال كود ${promoCode ?? ''} بنجاح. الباقة الفعّالة الآن: ${tierName ?? ''}${expiresAt ? `، وتنتهي في ${expiresAt}` : ''}.`}
    introEn={`Promo code ${promoCode ?? ''} redeemed successfully. Active plan: ${tierName ?? ''}${expiresAt ? `, expires ${expiresAt}` : ''}.`}
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(promoCode ? [{ labelAr: 'الكود', labelEn: 'Code', value: promoCode, mono: true }] : []),
      ...(tierName ? [{ labelAr: 'الباقة', labelEn: 'Plan', value: tierName, mono: true }] : []),
      ...(expiresAt ? [{ labelAr: 'تاريخ الانتهاء', labelEn: 'Expires at', value: expiresAt }] : []),
    ]}
    cta={{ href: `${SITE_URL}/dashboard/membership`, labelAr: 'عرض الباقة', labelEn: 'View membership' }}
  />
)

export const template = {
  component: Email,
  subject: `تم استبدال كود الترويج · Promo code redeemed`,
  displayName: 'كود ترويج — تم الاستبدال · Promo code redeemed',
  previewData: { recipientName: 'أحمد العتيبي', promoCode: 'WELCOME30', tierName: 'premium', expiresAt: '2026-06-23' },
} satisfies TemplateEntry