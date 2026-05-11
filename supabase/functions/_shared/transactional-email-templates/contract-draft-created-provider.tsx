/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
  contractNumber?: string
  contractId?: string
}

const ContractDraftCreatedProviderEmail: React.FC<Props> = ({
  name, businessName, contractNumber, contractId,
}) => {
  const details = [
    contractNumber ? { labelAr: 'رقم العقد', labelEn: 'Contract no.', value: contractNumber, mono: true } : null,
    businessName ? { labelAr: 'المنشأة', labelEn: 'Business', value: businessName } : null,
  ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>
  const href = contractId ? `${SITE_URL}/contracts/${contractId}` : `${SITE_URL}/dashboard/contracts`
  return (
    <BilingualEmail
      preview={`تم إنشاء مسودة عقد جديدة · A new draft contract has been created`}
      badge={{ textAr: 'مسودة عقد', textEn: 'Draft contract', tone: 'info' }}
      titleAr="تم إنشاء مسودة عقد جديدة"
      titleEn="A new draft contract has been created"
      greetingNameAr={name}
      greetingNameEn={name}
      introAr={
        <>
          تم إنشاء مسودة عقد مرتبطة بطلب أحد العملاء. يمكنك مراجعة العقد ومتابعة
          الإجراءات اللازمة من لوحة التحكم.
        </>
      }
      introEn={
        <>
          A draft contract linked to a customer request has been created. You can
          review the contract and continue the next steps from your dashboard.
        </>
      }
      details={details.length ? details : undefined}
      cta={{ href, labelAr: 'مراجعة العقد', labelEn: 'Review the contract' }}
    />
  )
}

export const template = {
  component: ContractDraftCreatedProviderEmail,
  subject: `تم إنشاء مسودة عقد جديدة في ${SITE_NAME_AR} · New draft contract`,
  displayName: 'مسودة عقد للمنشأة · Contract draft (provider)',
  previewData: {
    name: 'محمد سالم',
    businessName: 'مصنع الألمنيوم المتقدم',
    contractNumber: 'CT-1000123',
    contractId: '00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry