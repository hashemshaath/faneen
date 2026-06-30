/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({ confirmationUrl, token }: RecoveryEmailProps) => (
  <BilingualEmail
    preview="إعادة تعيين كلمة المرور · Reset your password"
    badge={{ textAr: 'إعادة تعيين', textEn: 'Password reset', tone: 'warning' }}
    titleAr="إعادة تعيين كلمة المرور"
    titleEn="Reset your password"
    introAr="استخدم رمز التحقق أدناه لإكمال العملية، أو اضغط على الزر لاختيار كلمة مرور جديدة."
    introEn="Use the verification code below to complete the process, or click the button to choose a new password."
    highlight={token ? {
      labelAr: 'رمز التحقق',
      labelEn: 'Verification code',
      content: (
        <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '0.5em', textAlign: 'center', fontFamily: 'monospace' }}>
          {token}
        </div>
      ),
    } : undefined}
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
