/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  contractTitle?: string
  milestoneTitle?: string
  contractId?: string
  contractUrl?: string
}

const ContractMilestoneCompletedEmail: React.FC<Props> = ({
  recipientName, contractRefId, contractTitle, milestoneTitle, contractId, contractUrl,
}) => {
  const url = contractUrl || (contractId ? `https://qitaat.com/contracts/${contractId}` : 'https://qitaat.com/dashboard/contracts')
  return (
    <BilingualEmail
      preview={`تم تحديث مرحلة في عقدك · Milestone updated${contractRefId ? ` #${contractRefId}` : ''}`}
      badge={{ textAr: 'تحديث مرحلة', textEn: 'Milestone updated', tone: 'info' }}
      titleAr="تم تحديث مرحلة في عقدك"
      titleEn="A milestone in your contract was updated"
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr="تم تحديث إحدى مراحل العمل في العقد. يمكنك مراجعة تفاصيل المرحلة من صفحة العقد."
      introEn="One of the work milestones on your contract has been updated. You can review the milestone details from the contract page."
      details={[
        ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
        ...(contractTitle ? [{ labelAr: 'عنوان العقد', labelEn: 'Title', value: contractTitle }] : []),
        ...(milestoneTitle ? [{ labelAr: 'المرحلة', labelEn: 'Milestone', value: milestoneTitle }] : []),
      ]}
      cta={{ href: url, labelAr: 'عرض العقد', labelEn: 'View contract' }}
    />
  )
}

export const template = {
  component: ContractMilestoneCompletedEmail,
  subject: (_data: Record<string, any>) =>
    `تم تحديث مرحلة في عقدك · Milestone updated — ${SITE_NAME_AR}`,
  displayName: 'تحديث مرحلة العقد · Contract milestone updated',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    contractTitle: 'توريد وتركيب واجهات ألمنيوم',
    milestoneTitle: 'تركيب الواجهات',
    contractId: '123',
  },
} satisfies TemplateEntry
