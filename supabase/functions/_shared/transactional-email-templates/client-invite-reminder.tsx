/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  inviteRef?: string
  expiryDate?: string
  acceptUrl?: string
}

const Email: React.FC<Props> = ({
  recipientName, businessName, inviteRef, expiryDate, acceptUrl,
}) => (
  <BilingualEmail
    preview={`تذكير بدعوة قِطاعات · Reminder: invitation pending${inviteRef ? ` · ${inviteRef}` : ''}`}
    badge={{ textAr: 'تذكير', textEn: 'Reminder', tone: 'warning' }}
    titleAr="تذكير: دعوتك إلى قِطاعات بانتظارك"
    titleEn="Reminder: your Qitaat invitation is waiting"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={
      businessName
        ? `هذا تذكير ودي بأن دعوة ${businessName} على منصة قِطاعات لا تزال بانتظار قبولك.`
        : 'هذا تذكير ودي بأن دعوتك على منصة قِطاعات لا تزال بانتظار قبولك.'
    }
    introEn={
      businessName
        ? `Friendly reminder: your invitation from ${businessName} on Qitaat is still waiting for you.`
        : 'Friendly reminder: your Qitaat invitation is still waiting for you.'
    }
    details={[
      ...(inviteRef ? [{ labelAr: 'رقم الدعوة', labelEn: 'Invite ID', value: inviteRef, mono: true }] : []),
      ...(expiryDate ? [{ labelAr: 'صالحة حتى', labelEn: 'Valid until', value: expiryDate }] : []),
    ]}
    cta={acceptUrl ? { href: acceptUrl, labelAr: 'قبول الدعوة', labelEn: 'Accept invitation' } : undefined}
    tipAr="إذا لم تعد بحاجة لهذه الدعوة، يمكنك تجاهل هذه الرسالة وستنتهي صلاحيتها تلقائياً."
    tipEn="If you no longer need this invitation, simply ignore this email and it will expire automatically."
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `تذكير بدعوة قِطاعات${d?.inviteRef ? ` (${d.inviteRef})` : ''} · Reminder — ${SITE_NAME_AR}`,
  displayName: 'تذكير بدعوة عميل · Client invite reminder',
  previewData: {
    recipientName: 'أحمد العتيبي',
    businessName: 'مؤسسة قطاعات الألمنيوم',
    inviteRef: 'INV-1000001',
    expiryDate: '2026-05-26',
    acceptUrl: 'https://qitaat.com/invite/sample-token',
  },
} satisfies TemplateEntry