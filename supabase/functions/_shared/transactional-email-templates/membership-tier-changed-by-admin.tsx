/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  oldTier?: string
  newTier?: string
  reason?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, oldTier, newTier, reason }) => (
  <BilingualEmail
    preview={`تم تحديث باقة منشأتك من قِبل الإدارة · Plan updated by admin`}
    badge={{ textAr: 'تحديث إداري', textEn: 'Admin update', tone: 'info' }}
    titleAr="تم تحديث باقة منشأتك من قِبل الإدارة"
    titleEn="Your business plan has been updated by an admin"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={`قام فريق ${SITE_NAME_AR} بتحديث باقة منشأتك من ${oldTier ?? '—'} إلى ${newTier ?? '—'}.`}
    introEn={`The Qitaat team has updated your business plan from ${oldTier ?? '—'} to ${newTier ?? '—'}.`}
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(oldTier ? [{ labelAr: 'الباقة السابقة', labelEn: 'Previous plan', value: oldTier, mono: true }] : []),
      ...(newTier ? [{ labelAr: 'الباقة الجديدة', labelEn: 'New plan', value: newTier, mono: true }] : []),
      ...(reason ? [{ labelAr: 'السبب', labelEn: 'Reason', value: reason }] : []),
    ]}
    cta={{ href: `${SITE_URL}/dashboard/membership`, labelAr: 'عرض الباقة', labelEn: 'View membership' }}
  />
)

export const template = {
  component: Email,
  subject: `تم تحديث باقة منشأتك من قِبل الإدارة · Plan updated by admin`,
  displayName: 'باقة — تحديث إداري · Plan updated by admin',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', oldTier: 'basic', newTier: 'premium' },
} satisfies TemplateEntry