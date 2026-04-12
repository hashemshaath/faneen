import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const Terms = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'الشروط والأحكام | فنيين' : 'Terms & Conditions | Faneen', description: isRTL ? 'الشروط والأحكام لاستخدام منصة فنيين' : 'Terms and conditions for using Faneen platform' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10"><div className="container px-4"><h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}</h1></div></div>
      <div className="container py-10 px-4 max-w-3xl prose prose-sm dark:prose-invert">
        <h2>{isRTL ? 'القبول بالشروط' : 'Acceptance of Terms'}</h2>
        <p>{isRTL ? 'باستخدامك لمنصة فنيين، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام المنصة.' : 'By using Faneen platform, you agree to be bound by these terms and conditions. If you disagree, please do not use the platform.'}</p>
        <h2>{isRTL ? 'الحسابات' : 'Accounts'}</h2>
        <p>{isRTL ? 'أنت مسؤول عن الحفاظ على سرية حسابك وكلمة المرور وعن جميع الأنشطة التي تتم من خلال حسابك.' : 'You are responsible for maintaining the confidentiality of your account and password and for all activities under your account.'}</p>
        <h2>{isRTL ? 'المحتوى' : 'Content'}</h2>
        <p>{isRTL ? 'أنت مسؤول عن المحتوى الذي تنشره على المنصة. يجب أن يكون المحتوى دقيقاً وقانونياً ولا ينتهك حقوق الآخرين.' : 'You are responsible for content you publish on the platform. Content must be accurate, legal and not infringe on others rights.'}</p>
        <h2>{isRTL ? 'العقود والمعاملات' : 'Contracts & Transactions'}</h2>
        <p>{isRTL ? 'فنيين توفر منصة لتسهيل التواصل بين مزودي الخدمات والعملاء. المنصة ليست طرفاً في العقود المبرمة بين المستخدمين.' : 'Faneen provides a platform to facilitate communication between service providers and clients. The platform is not a party to contracts between users.'}</p>
        <h2>{isRTL ? 'تحديد المسؤولية' : 'Limitation of Liability'}</h2>
        <p>{isRTL ? 'فنيين غير مسؤولة عن أي أضرار ناتجة عن استخدام المنصة أو التعامل مع المزودين المسجلين عليها.' : 'Faneen is not responsible for any damages resulting from using the platform or dealing with registered providers.'}</p>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
