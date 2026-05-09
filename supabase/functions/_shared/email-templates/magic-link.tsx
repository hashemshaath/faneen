/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <BilingualEmail
    preview="رابط تسجيل الدخول الخاص بك · Your login link"
    badge={{ textAr: 'تسجيل الدخول', textEn: 'Sign in', tone: 'info' }}
    titleAr="رابط تسجيل الدخول"
    titleEn="Your login link"
    introAr="اضغط على الزر أدناه لتسجيل الدخول إلى حسابك في قِطاعات. هذا الرابط صالح لفترة قصيرة لأسباب أمنية."
    introEn="Click the button below to sign in to your Qitaat account. The link expires shortly for your security."
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
