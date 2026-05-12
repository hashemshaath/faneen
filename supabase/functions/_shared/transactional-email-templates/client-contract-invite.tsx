/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  providerName?: string
  inviteRef?: string
  expiryDate?: string
  acceptUrl?: string
}

const Email: React.FC<Props> = ({
  recipientName, businessName, providerName, inviteRef, expiryDate, acceptUrl,
}) => (
  <BilingualEmail
    preview={`دعوة للانضمام إلى قِطاعات · You've been invited to Qitaat${inviteRef ? ` · ${inviteRef}` : ''}`}
    badge={{ textAr: 'دعوة جديدة', textEn: 'New invitation', tone: 'info' }}
    titleAr="لقد تمت دعوتك إلى قِطاعات"
    titleEn="You've been invited to Qitaat"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={
      businessName
        ? `قامت ${businessName} بدعوتك للانضمام إلى منصة قِطاعات لإكمال إجراءات تعاقد رسمي. يرجى قبول الدعوة وإنشاء حسابك للمتابعة.`
        : 'تمت دعوتك للانضمام إلى منصة قِطاعات لإكمال إجراءات تعاقد رسمي. يرجى قبول الدعوة وإنشاء حسابك للمتابعة.'
    }
    introEn={
      businessName
        ? `${businessName} has invited you to join Qitaat to complete a formal contract. Accept the invitation and create your account to proceed.`
        : "You've been invited to join Qitaat to complete a formal contract. Accept the invitation and create your account to proceed."
    }
    details={[
      ...(inviteRef ? [{ labelAr: 'رقم الدعوة', labelEn: 'Invite ID', value: inviteRef, mono: true }] : []),
      ...(businessName ? [{ labelAr: 'الجهة الداعية', labelEn: 'Invited by', value: businessName }] : (providerName ? [{ labelAr: 'الجهة الداعية', labelEn: 'Invited by', value: providerName }] : [])),
      ...(expiryDate ? [{ labelAr: 'صالحة حتى', labelEn: 'Valid until', value: expiryDate }] : []),
    ]}
    cta={acceptUrl ? { href: acceptUrl, labelAr: 'قبول الدعوة', labelEn: 'Accept invitation' } : undefined}
    tipAr="إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة بأمان."
    tipEn="If you weren't expecting this invitation, you can safely ignore this email."
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `دعوة للانضمام${d?.businessName ? ` من ${d.businessName}` : ''} · You've been invited — ${SITE_NAME_AR}`,
  displayName: 'دعوة عميل · Client invitation',
  previewData: {
    recipientName: 'أحمد العتيبي',
    businessName: 'مؤسسة قطاعات الألمنيوم',
    providerName: 'فريق المبيعات',
    inviteRef: 'INV-1000001',
    expiryDate: '2026-05-26',
    acceptUrl: 'https://qitaat.com/invite/sample-token',
  },
} satisfies TemplateEntry