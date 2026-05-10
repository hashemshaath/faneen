/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  businessName?: string
  dashboardUrl?: string
}

const WelcomeBusinessEmail: React.FC<Props> = ({ businessName, dashboardUrl }) => (
  <BilingualEmail
    preview={`تم إنشاء ملف منشأتك في ${SITE_NAME_AR} · Your business profile is ready`}
    badge={{ textAr: 'منشأة جديدة', textEn: 'New business', tone: 'success' }}
    titleAr="تم إنشاء ملف منشأتك في قِطاعات 🏢"
    titleEn="Your business profile in Qitaat is ready 🏢"
    greetingNameAr={businessName}
    greetingNameEn={businessName}
    introAr="تم إنشاء ملف منشأتك بنجاح في قِطاعات. يمكنك الآن استكمال البيانات، متابعة حالة الاعتماد، والاستعداد لاستقبال طلبات العملاء بعد الموافقة."
    introEn="Your business profile has been created successfully on Qitaat. You can now complete the details, track the approval status, and prepare to receive customer requests once approved."
    bodyAr="ننصحك بإضافة وصف واضح للنشاط، الخدمات والقطاعات التي تغطّيها، وصور أعمال سابقة لتسريع مراجعة الاعتماد ورفع فرص الظهور للعملاء."
    bodyEn="We recommend adding a clear business description, the services and sectors you cover, and portfolio images to speed up the approval review and improve visibility to customers."
    cta={{
      href: dashboardUrl || `${SITE_URL}/dashboard`,
      labelAr: 'إكمال ملف المنشأة',
      labelEn: 'Complete business profile',
    }}
    tipAr="حالة الاعتماد ستظهر في لوحة التحكم، وسيصلك إشعار فور مراجعتها من فريق قِطاعات."
    tipEn="The approval status appears in your dashboard, and you'll receive a notification once the Qitaat team reviews it."
  />
)

export const template = {
  component: WelcomeBusinessEmail,
  subject: (data: Record<string, any>) =>
    data?.businessName
      ? `${data.businessName} · تم إنشاء ملف منشأتك في قِطاعات · Your business profile is ready`
      : 'تم إنشاء ملف منشأتك في قِطاعات · Your business profile is ready',
  displayName: 'ترحيب بإنشاء منشأة · Welcome business',
  previewData: { businessName: 'مؤسسة الإتقان للألمنيوم', dashboardUrl: 'https://qitaat.com/dashboard' },
} satisfies TemplateEntry