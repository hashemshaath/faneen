/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail } from '../email-layout/BilingualLayout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <BilingualEmail
    preview="أكّد بريدك الإلكتروني للانضمام إلى قِطاعات · Confirm your email to join Qitaat"
    badge={{ textAr: 'تأكيد الحساب', textEn: 'Verify account', tone: 'info' }}
    titleAr="أكّد بريدك الإلكتروني"
    titleEn="Confirm your email"
    introAr={
      <>
        شكراً لانضمامك إلى <strong>قِطاعات</strong> — الدليل الصناعي للألمنيوم والزجاج والخشب والحديد.
        لتفعيل حسابك ({recipient})، يُرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه.
      </>
    }
    introEn={
      <>
        Thanks for joining <strong>Qitaat</strong> — the specialized industrial directory.
        To activate your account ({recipient}), please confirm your email using the button below.
      </>
    }
    cta={{
      href: confirmationUrl,
      labelAr: 'تأكيد البريد الإلكتروني',
      labelEn: 'Confirm email',
    }}
    tipAr="إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان."
    tipEn="If you didn't create an account, you can safely ignore this email."
  />
)

export default SignupEmail
