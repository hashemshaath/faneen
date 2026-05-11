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

const ContractDraftCreatedClientEmail: React.FC<Props> = ({
  name, businessName, contractNumber, contractId,
}) => {
  const details = [
    contractNumber ? { labelAr: 'رقم العقد', labelEn: 'Contract no.', value: contractNumber, mono: true } : null,
    businessName ? { labelAr: 'المنشأة', labelEn: 'Provider', value: businessName } : null,
  ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string; mono?: boolean }>
  const href = contractId ? `${SITE_URL}/contracts/${contractId}` : `${SITE_URL}/dashboard/contracts`
  return (
    <BilingualEmail
      preview={`تم إنشاء مسودة عقد لطلبك · A draft contract has been created for your request`}
      badge={{ textAr: 'مسودة عقد', textEn: 'Draft contract', tone: 'info' }}
      titleAr="تم إنشاء مسودة عقد لطلبك"
      titleEn="A draft contract has been created for your request"
      greetingNameAr={name}
      greetingNameEn={name}
      introAr={
        <>
          تم إنشاء مسودة عقد بناءً على طلبك. يمكنك مراجعة بنود العقد والتفاصيل
          من لوحة التحكم قبل اعتماده.
        </>
      }
      introEn={
        <>
          A draft contract has been created based on your request. You can review
          the contract terms and details from your dashboard before approving it.
        </>
      }
      details={details.length ? details : undefined}
      cta={{ href, labelAr: 'مراجعة العقد', labelEn: 'Review the contract' }}
    />
  )
}

export const template = {
  component: ContractDraftCreatedClientEmail,
  subject: `تم إنشاء مسودة عقد لطلبك في ${SITE_NAME_AR} · Draft contract created`,
  displayName: 'مسودة عقد للعميل · Contract draft (client)',
  previewData: {
    name: 'سارة أحمد',
    businessName: 'مصنع الألمنيوم المتقدم',
    contractNumber: 'CT-1000123',
    contractId: '00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry