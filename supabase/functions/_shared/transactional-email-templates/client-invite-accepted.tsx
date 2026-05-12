/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  clientName?: string
  inviteRef?: string
  dashboardUrl?: string
}

const Email: React.FC<Props> = ({
  recipientName, clientName, inviteRef, dashboardUrl,
}) => (
  <BilingualEmail
    preview={`تم قبول دعوة العميل · Client invitation accepted${inviteRef ? ` · ${inviteRef}` : ''}`}
    badge={{ textAr: 'تم القبول', textEn: 'Accepted', tone: 'success' }}
    titleAr="تم قبول دعوة العميل"
    titleEn="Client invitation accepted"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={
      clientName
        ? `قام ${clientName} بقبول الدعوة وأصبح حسابه جاهزاً. يمكنك الآن متابعة إنشاء العقد من لوحة التحكم.`
        : 'تم قبول الدعوة وأصبح حساب العميل جاهزاً. يمكنك الآن متابعة إنشاء العقد من لوحة التحكم.'
    }
    introEn={
      clientName
        ? `${clientName} has accepted the invitation and their account is ready. You can now continue creating the contract from your dashboard.`
        : 'The invitation was accepted and the client account is ready. You can now continue creating the contract from your dashboard.'
    }
    details={[
      ...(inviteRef ? [{ labelAr: 'رقم الدعوة', labelEn: 'Invite ID', value: inviteRef, mono: true }] : []),
      ...(clientName ? [{ labelAr: 'العميل', labelEn: 'Client', value: clientName }] : []),
    ]}
    cta={dashboardUrl ? { href: dashboardUrl, labelAr: 'فتح لوحة العقود', labelEn: 'Open contracts' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `تم قبول دعوة العميل${d?.inviteRef ? ` (${d.inviteRef})` : ''} · Invitation accepted — ${SITE_NAME_AR}`,
  displayName: 'دعوة عميل — تم القبول · Client invite accepted',
  previewData: {
    recipientName: 'فريق المبيعات',
    clientName: 'أحمد العتيبي',
    inviteRef: 'INV-1000001',
    dashboardUrl: 'https://qitaat.com/dashboard/contracts',
  },
} satisfies TemplateEntry