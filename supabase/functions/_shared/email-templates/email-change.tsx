/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <BilingualEmail
    preview="أكّد تغيير البريد الإلكتروني · Confirm your email change"
    badge={{ textAr: 'تغيير البريد', textEn: 'Email change', tone: 'warning' }}
    titleAr="أكّد تغيير البريد الإلكتروني"
    titleEn="Confirm your email change"
    introAr={
      <>
        طلبت تغيير عنوان البريد الإلكتروني لحسابك في قِطاعات من{' '}
        <strong className="tech-content">{oldEmail}</strong> إلى{' '}
        <strong className="tech-content">{newEmail}</strong>. اضغط الزر أدناه للتأكيد.
      </>
    }
    introEn={
      <>
        You requested to change the email address for your Qitaat account from{' '}
        <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>. Click the button to confirm.
      </>
    }
    cta={{
      href: confirmationUrl,
      labelAr: 'تأكيد تغيير البريد',
      labelEn: 'Confirm email change',
    }}
    tipAr="إذا لم تقم بهذا الطلب، يُرجى تأمين حسابك فوراً بتغيير كلمة المرور."
    tipEn="If you didn't request this change, please secure your account by changing your password immediately."
  />
)

export default EmailChangeEmail
