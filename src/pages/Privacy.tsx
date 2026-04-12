import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const Privacy = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'سياسة الخصوصية | فنيين' : 'Privacy Policy | Faneen', description: isRTL ? 'سياسة الخصوصية لمنصة فنيين' : 'Faneen platform privacy policy' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10"><div className="container px-4"><h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1></div></div>
      <div className="container py-10 px-4 max-w-3xl prose prose-sm dark:prose-invert">
        <h2>{isRTL ? 'جمع المعلومات' : 'Information Collection'}</h2>
        <p>{isRTL ? 'نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند التسجيل أو استخدام خدماتنا، بما في ذلك الاسم والبريد الإلكتروني ورقم الهاتف ومعلومات العمل.' : 'We collect information you provide directly when registering or using our services, including name, email, phone number and business information.'}</p>
        <h2>{isRTL ? 'استخدام المعلومات' : 'Use of Information'}</h2>
        <p>{isRTL ? 'نستخدم المعلومات لتوفير وتحسين خدماتنا، والتواصل معك، وضمان أمان المنصة.' : 'We use information to provide and improve our services, communicate with you, and ensure platform security.'}</p>
        <h2>{isRTL ? 'حماية المعلومات' : 'Information Protection'}</h2>
        <p>{isRTL ? 'نتخذ إجراءات أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح.' : 'We take appropriate security measures to protect your personal information from unauthorized access, alteration or disclosure.'}</p>
        <h2>{isRTL ? 'ملفات تعريف الارتباط' : 'Cookies'}</h2>
        <p>{isRTL ? 'نستخدم ملفات تعريف الارتباط لتحسين تجربة الاستخدام وتحليل حركة المرور على الموقع.' : 'We use cookies to improve user experience and analyze website traffic.'}</p>
        <h2>{isRTL ? 'التواصل' : 'Contact'}</h2>
        <p>{isRTL ? 'لأي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا على info@faneen.com' : 'For any privacy policy inquiries, please contact us at info@faneen.com'}</p>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
