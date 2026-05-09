/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <BilingualEmail
    preview="إعادة تعيين كلمة المرور · Reset your password"
    badge={{ textAr: 'إعادة تعيين', textEn: 'Password reset', tone: 'warning' }}
    titleAr="إعادة تعيين كلمة المرور"
    titleEn="Reset your password"
    introAr="تلقّينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في قِطاعات. اضغط على الزر أدناه لاختيار كلمة مرور جديدة."
    introEn="We received a request to reset the password for your Qitaat account. Click the button below to choose a new password."
    cta={{
      href: confirmationUrl,
      labelAr: 'إعادة تعيين كلمة المرور',
      labelEn: 'Reset password',
    }}
    tipAr="هذا الرابط صالح لمدة محدودة لأسباب أمنية. إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان ولن يتم تغيير كلمة المرور."
    tipEn="This link expires shortly for security reasons. If you didn't request a reset, you can safely ignore this email — your password won't change."
  />
)

export default RecoveryEmail
