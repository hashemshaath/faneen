/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { ref?: string; contractRef?: string; businessName?: string; url?: string }

const Email: React.FC<Props> = ({ ref, contractRef, businessName, url }) => (
  <BilingualEmail
    preview={`عقد مبدئي من الفرصة ${ref ?? ''} · Draft contract`}
    badge={{ textAr: 'عقد مبدئي', textEn: 'Draft contract', tone: 'info' }}
    titleAr="تم إنشاء عقد مبدئي"
    titleEn="A draft contract was created"
    greetingNameAr={businessName}
    greetingNameEn={businessName}
    introAr={`تم إنشاء عقد مبدئي من الفرصة ${ref ?? ''}. راجع البنود وأكمل الإجراءات مع العميل.`}
    introEn={`A draft contract was created from opportunity ${ref ?? ''}. Review the terms and proceed with the client.`}
    details={contractRef ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ref', value: contractRef, mono: true }] : []}
    cta={url ? { href: url, labelAr: 'فتح العقد', labelEn: 'Open contract' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `عقد مبدئي ${d?.contractRef ?? ''} · Draft contract — ${SITE_NAME_AR}`,
  displayName: 'فرصة: عقد مبدئي للمزود · Contract created (provider)',
  previewData: { ref: 'OPP-1000123', contractRef: 'CTR-2000045', businessName: 'مصنع الألمنيوم المتقدم', url: 'https://qitaat.com/contracts/CTR-2000045' },
} satisfies TemplateEntry