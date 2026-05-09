/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <BilingualEmail
    preview="لقد تمت دعوتك للانضمام إلى قِطاعات · You've been invited to Qitaat"
    badge={{ textAr: 'دعوة جديدة', textEn: 'Invitation', tone: 'info' }}
    titleAr="لقد تمت دعوتك إلى قِطاعات"
    titleEn="You've been invited to Qitaat"
    introAr="تمت دعوتك للانضمام إلى منصة قِطاعات — الدليل الصناعي المتخصص. اضغط على الزر أدناه لقبول الدعوة وإنشاء حسابك."
    introEn="You've been invited to join Qitaat — the specialized industrial directory. Click the button below to accept the invitation and create your account."
    cta={{
      href: confirmationUrl,
      labelAr: 'قبول الدعوة',
      labelEn: 'Accept invitation',
    }}
    tipAr="إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل الرسالة بأمان."
    tipEn="If you weren't expecting this invitation, you can safely ignore this email."
  />
)

export default InviteEmail
