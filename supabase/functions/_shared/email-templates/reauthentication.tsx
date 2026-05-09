/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, otpStyle } from '../email-layout/BilingualLayout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BilingualEmail
    preview="رمز التحقق الخاص بك · Your verification code"
    badge={{ textAr: 'رمز تحقق', textEn: 'Verification', tone: 'info' }}
    titleAr="رمز التحقق الخاص بك"
    titleEn="Your verification code"
    introAr={
      <>
        استخدم الرمز التالي لتأكيد هويتك في قِطاعات:
        <span style={otpStyle}>{token}</span>
      </>
    }
    introEn={
      <>
        Use the code below to confirm your identity on Qitaat:
        <span style={otpStyle}>{token}</span>
      </>
    }
    tipAr="ينتهي الرمز خلال دقائق. إذا لم تطلب هذا التحقق، يمكنك تجاهل الرسالة."
    tipEn="The code expires in a few minutes. If you didn't request this, you can safely ignore the email."
  />
)

export default ReauthenticationEmail
