import React, { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const Privacy = () => {
  const { isRTL } = useLanguage();

  usePageMeta({
    title: isRTL ? 'سياسة الخصوصية | قِطاعات' : 'Privacy Policy | Qitaat',
    description: isRTL
      ? 'سياسة خصوصية قِطاعات: ما البيانات التي نجمعها، كيف نحميها، استخدام الكوكيز وأدوات التحليل، حقوقك في الوصول والحذف، وكيفية التواصل معنا.'
      : 'Qitaat privacy policy: what data we collect, how we protect it, cookies and analytics, your rights to access and deletion, and how to contact us.',
    canonical: 'https://qitaat.com/privacy',
  });

  useMultiJsonLd(useMemo(() => {
    const faqAr = [
      { q: 'ما البيانات الشخصية التي يجمعها موقع قِطاعات؟', a: 'نجمع فقط ما تقدمه أنت مباشرة عند التسجيل أو إنشاء ملف تجاري: الاسم، البريد الإلكتروني، رقم الجوال، ومعلومات المنشأة. لا نتتبع تصفحك خارج المنصة.' },
      { q: 'هل يستخدم قِطاعات ملفات تعريف الارتباط (Cookies)؟', a: 'نستخدم كوكيز ضرورية لحفظ جلسة تسجيل الدخول وتفضيلات اللغة، وكوكيز تحليلية مجهولة الهوية لقياس أداء الموقع، ولا تُفعَّل إلا بعد موافقتك الصريحة من شريط الكوكيز.' },
      { q: 'هل تجمعون بيانات أداء الموقع؟ وهل تتضمن معرّفي؟', a: 'نجمع مؤشرات Core Web Vitals (LCP، CLS، INP، FCP، TTFB) مع مسار الصفحة ونوع الجهاز فقط. لا نسجل عنوان IP ولا أي معرّف شخصي ولا محتوى تتصفحه.' },
      { q: 'كيف أطلب حذف بياناتي من قِطاعات؟', a: 'راسلنا على info@qitaat.com من البريد المسجّل في حسابك وسنحذف بياناتك خلال 30 يوماً، باستثناء ما يلزمنا الاحتفاظ به قانونياً (مثل سجلات الفواتير والعقود الموقّعة).' },
      { q: 'هل تشاركون بياناتي مع جهات خارجية؟', a: 'لا نبيع بياناتك. نشاركها فقط مع مزودي البنية التحتية (الاستضافة، البريد، التحليلات) وفق اتفاقيات معالجة بيانات صارمة، أو عند طلب رسمي من جهة قضائية مختصة.' },
    ];
    const faqEn = [
      { q: 'What personal data does Qitaat collect?', a: 'Only what you provide directly at signup or while creating a business profile: name, email, phone, and business information. We do not track your browsing outside the platform.' },
      { q: 'Does Qitaat use cookies?', a: 'Strictly-necessary cookies for the login session and language preferences, plus anonymous analytics cookies activated only after explicit consent through the cookie banner.' },
      { q: 'Do you collect performance data, and does it identify me?', a: 'We collect Core Web Vitals (LCP, CLS, INP, FCP, TTFB) along with page path and device type only. No IP address, no personal identifier, no browsed content is recorded.' },
      { q: 'How do I request deletion of my data?', a: 'Email info@qitaat.com from the address registered to your account; we delete your data within 30 days, except where retention is legally required (e.g. billing and signed contracts).' },
      { q: 'Do you share my data with third parties?', a: 'We never sell your data. We share it only with infrastructure providers (hosting, email, analytics) under strict data-processing agreements, or upon a lawful request from a competent authority.' },
    ];
    const items = isRTL ? faqAr : faqEn;
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    };
    const article = {
      '@context': 'https://schema.org',
      '@type': 'PrivacyPolicy',
      name: isRTL ? 'سياسة الخصوصية — قِطاعات' : 'Privacy Policy — Qitaat',
      url: 'https://qitaat.com/privacy',
      inLanguage: isRTL ? 'ar' : 'en',
      dateModified: '2026-05-21',
      publisher: {
        '@type': 'Organization',
        name: 'قِطاعات Qitaat',
        url: 'https://qitaat.com',
        logo: { '@type': 'ImageObject', url: 'https://qitaat.com/logo.png' },
      },
    };
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'سياسة الخصوصية' : 'Privacy Policy', item: 'https://qitaat.com/privacy' },
      ],
    };
    return [article, faq, breadcrumb];
  }, [isRTL]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10">
        <div className="container px-4">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">
            {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <p className="text-primary-foreground/80 text-sm mt-2">
            {isRTL ? 'آخر تحديث: 21 مايو 2026' : 'Last updated: May 21, 2026'}
          </p>
        </div>
      </div>
      <div className="container py-10 px-4 max-w-3xl prose prose-sm dark:prose-invert">
        <h2>{isRTL ? 'مقدمة' : 'Introduction'}</h2>
        <p>{isRTL
          ? 'تشرح هذه السياسة كيف تجمع منصة قِطاعات بياناتك الشخصية وتستخدمها وتحميها. باستخدامك للموقع فإنك توافق على الممارسات الموضّحة هنا.'
          : 'This policy explains how Qitaat collects, uses, and protects your personal data. By using the site you agree to the practices described here.'}</p>

        <h2>{isRTL ? 'جمع المعلومات' : 'Information Collection'}</h2>
        <p>{isRTL
          ? 'نقوم بجمع المعلومات التي تقدمها مباشرة عند التسجيل أو استخدام خدماتنا، بما في ذلك الاسم والبريد الإلكتروني ورقم الهاتف ومعلومات المنشأة والملف التجاري.'
          : 'We collect information you provide directly at registration or while using our services, including name, email, phone number, business information and profile data.'}</p>

        <h2>{isRTL ? 'استخدام المعلومات' : 'Use of Information'}</h2>
        <p>{isRTL
          ? 'نستخدم المعلومات لتشغيل المنصة وتقديم خدماتنا، التحقق من الحسابات، تسهيل التواصل بين العملاء ومزودي الخدمات، تحسين تجربة المستخدم، وضمان أمن المنصة.'
          : 'We use information to operate the platform, verify accounts, facilitate communication between clients and providers, improve user experience, and ensure platform security.'}</p>

        <h2>{isRTL ? 'حماية المعلومات' : 'Information Protection'}</h2>
        <p>{isRTL
          ? 'نطبّق إجراءات أمنية تقنية وتنظيمية مناسبة (تشفير، فصل الأدوار، سياسات وصول، نسخ احتياطية) لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الإفصاح.'
          : 'We apply appropriate technical and organizational safeguards (encryption, role separation, access policies, backups) to protect your data from unauthorized access, alteration or disclosure.'}</p>

        <h2>{isRTL ? 'ملفات تعريف الارتباط' : 'Cookies'}</h2>
        <p>{isRTL
          ? 'نستخدم كوكيز ضرورية لحفظ جلسة تسجيل الدخول وتفضيلات اللغة وإعدادات الواجهة. كما نستخدم كوكيز تحليلية مجهولة الهوية لقياس أداء الموقع، ولا تُفعَّل إلا بعد موافقتك الصريحة من شريط الكوكيز. يمكنك حذف الكوكيز في أي وقت من إعدادات متصفحك.'
          : 'We use strictly-necessary cookies for session, language, and UI preferences, plus anonymous analytics cookies activated only after your explicit consent via the cookie banner. You can clear cookies anytime from your browser settings.'}</p>

        <h2>{isRTL ? 'بيانات الأداء (Core Web Vitals)' : 'Performance Data (Core Web Vitals)'}</h2>
        <p>{isRTL
          ? 'لتحسين سرعة الموقع نجمع مقاييس أداء مجهولة الهوية (LCP، CLS، INP، FCP، TTFB) إضافة إلى مسار الصفحة ونوع الجهاز فقط. لا تتضمن هذه البيانات أي معرّف شخصي أو عنوان IP أو محتوى تتصفحه، وتُرسل عبر sendBeacon دون تعطيل التنقل.'
          : 'To improve site speed we collect anonymous performance metrics (LCP, CLS, INP, FCP, TTFB) along with the page path and device type only. No personal identifier, IP address, or browsed content is included. Data is sent via sendBeacon without blocking navigation.'}</p>

        <h2>{isRTL ? 'التحليلات (Google Tag Manager / GA4)' : 'Analytics (Google Tag Manager / GA4)'}</h2>
        <p>{isRTL
          ? 'قد نستخدم Google Tag Manager وGoogle Analytics 4 لقياس الاستخدام بشكل مجمّع. لا تتضمن الأحداث التحليلية أي بيانات شخصية مباشرة (الاسم، البريد، الجوال، أو نص الرسائل)، بل معلومات تقنية وسلوكية عامة فقط.'
          : 'We may use Google Tag Manager and Google Analytics 4 to measure aggregate site usage. Analytics events never include direct personal data (name, email, phone, or message text), only general technical and behavioral signals.'}</p>

        <h2>{isRTL ? 'وضع الموافقة (Consent Mode v2)' : 'Consent Mode v2'}</h2>
        <p>{isRTL
          ? 'نطبّق Google Consent Mode v2: بشكل افتراضي يتم رفض analytics_storage و ad_storage و ad_user_data و ad_personalization حتى تختار صراحة قبول الكوكيز التحليلية. يمكنك سحب موافقتك في أي وقت من إعدادات متصفحك.'
          : 'We implement Google Consent Mode v2: analytics_storage, ad_storage, ad_user_data and ad_personalization are denied by default until you explicitly accept analytics cookies. You may withdraw consent at any time via your browser settings.'}</p>

        <h2>{isRTL ? 'تتبع مصدر الزيارة (UTM)' : 'Traffic Source Tracking (UTM)'}</h2>
        <p>{isRTL
          ? 'إذا وصلت من رابط حملة تسويقية يحتوي على utm_source و utm_medium و utm_campaign و utm_term و utm_content، نحفظها في متصفحك ونرفقها بأحداث التسجيل ونماذج التواصل لقياس فعالية الحملات، دون ربطها بهويتك مباشرة.'
          : 'If you arrive via a campaign URL containing utm_source, utm_medium, utm_campaign, utm_term or utm_content, we store them in your browser and attach them to account-registration and contact events to measure campaign performance, without linking them to your identity.'}</p>

        <h2>{isRTL ? 'مشاركة البيانات' : 'Data Sharing'}</h2>
        <p>{isRTL
          ? 'لا نبيع بياناتك. قد نشاركها مع مزودي البنية التحتية (الاستضافة، البريد، التحليلات) وفق اتفاقيات معالجة بيانات صارمة، أو عند طلب رسمي من جهة قضائية مختصة في المملكة العربية السعودية.'
          : 'We never sell your data. We may share it with infrastructure providers (hosting, email, analytics) under strict data-processing agreements, or upon a lawful request from a competent authority in the Kingdom of Saudi Arabia.'}</p>

        <h2>{isRTL ? 'الاحتفاظ بالبيانات' : 'Data Retention'}</h2>
        <p>{isRTL
          ? 'نحتفظ ببياناتك ما دام حسابك نشطاً. عند طلب الحذف تُحذف البيانات الشخصية خلال 30 يوماً، باستثناء ما يلزمنا الاحتفاظ به قانونياً (الفواتير، العقود الموقّعة، سجلات الامتثال).'
          : 'We retain your data while your account is active. Upon deletion request, personal data is removed within 30 days, except where retention is legally required (invoices, signed contracts, compliance records).'}</p>

        <h2>{isRTL ? 'حقوقك' : 'Your Rights'}</h2>
        <p>{isRTL
          ? 'يحق لك الاطلاع على بياناتك الشخصية، تصحيحها، أو حذفها في أي وقت بالتواصل معنا. كما يمكنك مسح بيانات المتصفح يدوياً من إعدادات المتصفح.'
          : 'You may request access, correction, or deletion of your personal data at any time by contacting us. You can also clear browser-stored data manually from your browser settings.'}</p>

        <h2>{isRTL ? 'التعديلات على السياسة' : 'Policy Changes'}</h2>
        <p>{isRTL
          ? 'قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر النسخة المحدّثة على هذه الصفحة مع تاريخ آخر تحديث، ويُعدّ استمرارك في استخدام المنصة موافقة على التعديلات.'
          : 'We may update this policy from time to time. The updated version will be posted on this page with the "Last updated" date, and your continued use constitutes acceptance of the changes.'}</p>

        <h2>{isRTL ? 'التواصل' : 'Contact'}</h2>
        <p>{isRTL
          ? 'لأي استفسارات حول الخصوصية، راسلنا على info@qitaat.com.'
          : 'For any privacy inquiries, contact us at info@qitaat.com.'}</p>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;