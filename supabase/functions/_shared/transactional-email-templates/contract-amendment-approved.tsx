/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  amendmentNumber?: number | string
  amendmentTitle?: string
  approverRole?: 'client' | 'provider'
  bothApproved?: boolean
  approvedAt?: string
  contractUrl?: string
}

const ROLE_AR = { client: 'العميل', provider: 'المزود' }
const ROLE_EN = { client: 'Client', provider: 'Provider' }

const Email: React.FC<Props> = ({
  recipientName, contractRefId, amendmentNumber, amendmentTitle,
  approverRole, bothApproved, contractUrl,
}) => {
  const roleAr = approverRole ? ROLE_AR[approverRole] : ''
  const roleEn = approverRole ? ROLE_EN[approverRole] : ''
  return (
    <BilingualEmail
      preview={`تمت الموافقة على ملحق العقد · Amendment approved${contractRefId ? ` #${contractRefId}` : ''}`}
      badge={{ textAr: bothApproved ? 'مكتمل التوقيع' : 'موافقة جزئية', textEn: bothApproved ? 'Fully approved' : 'Partial approval', tone: 'success' }}
      titleAr={bothApproved ? 'تمت الموافقة على ملحق العقد من الطرفين' : 'تمت الموافقة على ملحق العقد'}
      titleEn={bothApproved ? 'Amendment approved by both parties' : 'Amendment approved'}
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr={bothApproved
        ? 'وافق الطرفان على الملحق وأصبح جاهزاً للتطبيق على العقد.'
        : `وافق ${roleAr || 'الطرف الآخر'} على الملحق. سيُطبَّق الملحق فور اكتمال موافقات الطرفين.`}
      introEn={bothApproved
        ? 'Both parties have approved the amendment. It is now ready to be applied to the contract.'
        : `${roleEn || 'The other party'} has approved the amendment. It will be applied once both parties have approved.`}
      details={[
        ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
        ...(amendmentNumber != null ? [{ labelAr: 'رقم الملحق', labelEn: 'Amendment #', value: String(amendmentNumber), mono: true }] : []),
        ...(amendmentTitle ? [{ labelAr: 'عنوان الملحق', labelEn: 'Title', value: amendmentTitle }] : []),
      ]}
      cta={contractUrl ? { href: contractUrl, labelAr: 'عرض العقد', labelEn: 'View contract' } : undefined}
    />
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `تمت الموافقة على الملحق${d?.contractRefId ? ` للعقد ${d.contractRefId}` : ''} · Amendment approved — ${SITE_NAME_AR}`,
  displayName: 'ملحق — تمت الموافقة · Amendment approved',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    amendmentNumber: 2,
    amendmentTitle: 'تمديد فترة التنفيذ',
    approverRole: 'client',
    bothApproved: false,
    contractUrl: 'https://qitaat.com/contracts/123',
  },
} satisfies TemplateEntry