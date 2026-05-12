/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  amendmentNumber?: number | string
  amendmentTitle?: string
  amendmentType?: string
  publicReason?: string
  contractUrl?: string
}

const Email: React.FC<Props> = ({
  recipientName, contractRefId, amendmentNumber, amendmentTitle, publicReason, contractUrl,
}) => (
  <BilingualEmail
    preview={`موافقتك مطلوبة على ملحق العقد · Your approval is needed${contractRefId ? ` #${contractRefId}` : ''}`}
    badge={{ textAr: 'بانتظار موافقتك', textEn: 'Awaiting your approval', tone: 'warning' }}
    titleAr="موافقتك مطلوبة على ملحق العقد"
    titleEn="Your approval is needed on a contract amendment"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="هناك ملحق على عقدك ينتظر موافقتك حتى يصبح ساري المفعول."
    introEn="A contract amendment is awaiting your approval before it can take effect."
    details={[
      ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
      ...(amendmentNumber != null ? [{ labelAr: 'رقم الملحق', labelEn: 'Amendment #', value: String(amendmentNumber), mono: true }] : []),
      ...(amendmentTitle ? [{ labelAr: 'عنوان الملحق', labelEn: 'Title', value: amendmentTitle }] : []),
    ]}
    highlight={publicReason ? { labelAr: 'سبب التعديل', labelEn: 'Reason', content: publicReason } : undefined}
    cta={contractUrl ? { href: contractUrl, labelAr: 'مراجعة وتأكيد', labelEn: 'Review and approve' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `موافقتك مطلوبة${d?.contractRefId ? ` على ${d.contractRefId}` : ''} · Approval needed — ${SITE_NAME_AR}`,
  displayName: 'ملحق — بانتظار الموافقة · Amendment pending approval',
  previewData: {
    recipientName: 'سارة المطيري',
    contractRefId: 'CON-0001234',
    amendmentNumber: 2,
    amendmentTitle: 'تمديد فترة التنفيذ',
    publicReason: 'تأخير بسيط في توريد المواد.',
    contractUrl: 'https://qitaat.com/contracts/123',
  },
} satisfies TemplateEntry