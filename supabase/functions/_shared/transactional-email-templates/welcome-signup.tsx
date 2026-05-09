/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  fullName?: string
  dashboardUrl?: string
}

const WelcomeSignupEmail: React.FC<Props> = ({ fullName, dashboardUrl }) => (
  <BilingualEmail
    preview={`أهلاً بك في ${SITE_NAME_AR} · Welcome to Qitaat`}
    badge={{ textAr: 'حساب مفعّل', textEn: 'Account active', tone: 'success' }}
    titleAr="أهلاً بك في قِطاعات 👋"
    titleEn="Welcome to Qitaat 👋"
    greetingNameAr={fullName}
    greetingNameEn={fullName}
    introAr="يسعدنا انضمامك إلى قِطاعات — الدليل الصناعي المتخصص في قطاعات الألمنيوم والزجاج والأخشاب والحديد. حسابك جاهز للاستخدام الآن."
    introEn="Welcome to Qitaat — the specialized industrial directory for Aluminum, Glass, Wood and Steel. Your account is ready to use."
    bodyAr="من خلال حسابك يمكنك استكشاف المزودين المعتمدين، طلب عروض الأسعار، إدارة العقود إلكترونياً، ومتابعة المشاريع من لوحة تحكم واحدة."
    bodyEn="From your account you can discover verified providers, request quotes, manage contracts online, and track all your projects in one dashboard."
    cta={{
      href: dashboardUrl || `${SITE_URL}/dashboard`,
      labelAr: 'الانتقال إلى لوحة التحكم',
      labelEn: 'Go to dashboard',
    }}
    tipAr="ننصح بإكمال ملفك الشخصي والتحقق من جوالك للحصول على أفضل تجربة."
    tipEn="We recommend completing your profile and verifying your phone for the best experience."
  />
)

export const template = {
  component: WelcomeSignupEmail,
  subject: (data: Record<string, any>) =>
    data?.fullName
      ? `${data.fullName}، تم تفعيل حسابك في قِطاعات · Welcome to Qitaat`
      : 'تم تفعيل حسابك في قِطاعات · Welcome to Qitaat',
  displayName: 'بريد الترحيب بعد التسجيل · Welcome',
  previewData: { fullName: 'أحمد العتيبي', dashboardUrl: 'https://qitaat.com/dashboard' },
} satisfies TemplateEntry
