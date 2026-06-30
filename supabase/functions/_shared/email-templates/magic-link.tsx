/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({ confirmationUrl, token }: MagicLinkEmailProps) => (
  <BilingualEmail
    preview="رابط تسجيل الدخول الخاص بك · Your login link"
    badge={{ textAr: 'تسجيل الدخول', textEn: 'Sign in', tone: 'info' }}
    titleAr="رابط تسجيل الدخول"
    titleEn="Your login link"
    introAr="استخدم رمز التحقق أدناه لإكمال تسجيل الدخول إلى حسابك في قِطاعات، أو اضغط على الزر لتسجيل الدخول مباشرة. صالح لفترة قصيرة لأسباب أمنية."
    introEn="Use the verification code below to complete sign-in to your Qitaat account, or click the button to sign in directly. Valid for a short time for security."
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
      labelAr: 'تسجيل الدخول',
      labelEn: 'Sign in',
    }}
    tipAr="إذا لم تطلب هذا الرابط، يمكنك تجاهل الرسالة بأمان."
    tipEn="If you didn't request this link, you can safely ignore this email."
  />
)

export default MagicLinkEmail
