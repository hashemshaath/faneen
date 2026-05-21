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
      ? 'سياسة خصوصية قِطاعات الكاملة: ما البيانات التي نجمعها عند التسجيل، كيف نحمي معلوماتك، استخدام الكوكيز، تنظيف التخزين المحلي القديم تلقائياً، جمع مؤشرات الأداء بدون معرّفات شخصية، وكيفية الوصول لبياناتك أو حذفها وضبط متصفحك. آخر تحديث 2026.'
      : 'Full Qitaat privacy policy: what data we collect at signup, how we protect your information, our use of cookies, automatic cleanup of legacy local storage, anonymous performance telemetry, and how to access, delete or block your data from your browser. Updated 2026.',
    canonical: 'https://qitaat.com/privacy',
  });

  useMultiJsonLd(useMemo(() => {
    const faqAr = [
      { q: 'ما البيانات الشخصية التي يجمعها موقع قِطاعات؟', a: 'نجمع فقط ما تقدمه أنت مباشرة عند التسجيل أو إنشاء ملف تجاري: الاسم، البريد الإلكتروني، رقم الجوال، ومعلومات المنشأة. لا نجمع بيانات تصفحك خارج المنصة.' },
      { q: 'هل يستخدم قِطاعات ملفات تعريف الارتباط (Cookies)؟', a: 'نعم، نستخدم كوكيز ضرورية لحفظ جلسة تسجيل الدخول وتفضيلات اللغة، وأخرى تحليلية مجهولة الهوية لقياس أداء الموقع. يمكنك حذف الكوكيز من إعدادات متصفحك في أي وقت.' },
      { q: 'ماذا يحدث للبيانات المخزّنة محلياً من إصدارات سابقة؟', a: 'عند زيارتك التالية يقوم الموقع تلقائياً بحذف أي مفاتيح قديمة من localStorage و sessionStorage والكوكيز المتبقية من إصدارات سابقة. تتم العملية داخل متصفحك دون إرسال أي بيانات لخوادمنا، ويتم تعيين علامة (qitaat_legacy_cleanup_v1_done) لمنع تكرارها.' },
      { q: 'هل تجمعون بيانات أداء الموقع؟ وهل تتضمن معرّفي؟', a: 'نعم نجمع مؤشرات Core Web Vitals (LCP، CLS، INP، FCP، TTFB) مع مسار الصفحة ونوع الجهاز فقط. لا نسجل عنوان IP ولا أي معرّف شخصي ولا محتوى تتصفحه. تُستخدم البيانات داخلياً لتحسين السرعة فقط.' },
      { q: 'كيف أطلب حذف بياناتي من قِطاعات؟', a: 'راسلنا على info@qitaat.com من البريد المسجّل في حسابك وسنحذف بياناتك خلال 30 يوماً، باستثناء ما يلزمنا الاحتفاظ به قانونياً (مثل سجلات الفواتير).' },
      { q: 'هل تشاركون بياناتي مع جهات خارجية؟', a: 'لا نبيع بياناتك. نشاركها فقط مع مزودي البنية التحتية (الاستضافة، البريد، التحليلات) وفق اتفاقيات معالجة بيانات صارمة، أو عند طلب رسمي من جهة قضائية مختصة.' },
    ];
    const faqEn = [
      { q: 'What personal data does Qitaat collect?', a: 'Only what you provide directly at signup or while creating a business profile: name, email, phone, and business information. We do not track your browsing outside the platform.' },
      { q: 'Does Qitaat use cookies?', a: 'Yes — strictly-necessary cookies for the login session and language preferences, plus anonymous analytics cookies for performance. You can clear cookies anytime from your browser settings.' },
      { q: 'What happens to locally-stored data from older versions?', a: 'On your next visit the site automatically removes any legacy keys left in localStorage, sessionStorage, and cookies from older versions. This runs inside your browser; no data is sent to our servers. A flag (qitaat_legacy_cleanup_v1_done) prevents repeats.' },
      { q: 'Do you collect performance data, and does it identify me?', a: 'We collect Core Web Vitals (LCP, CLS, INP, FCP, TTFB) along with page path and device type only. No IP address, no personal identifier, no browsed content is recorded. Used internally to improve speed.' },
      { q: 'How do I request deletion of my data?', a: 'Email info@qitaat.com from the address registered to your account; we delete your data within 30 days, except where retention is legally required (e.g. billing records).' },
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
      dateModified: '2026-04-22',
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
        <h2>{isRTL ? 'تنظيف التخزين المحلي القديم' : 'Legacy Local Storage Cleanup'}</h2>
        <p>{isRTL ? 'قد يحتفظ متصفحك ببعض المفاتيح المحلية المتبقية من إصدارات سابقة من المنصة (مثل تفضيلات اللغة، سجل البحث، أو إعدادات الواجهة). يقوم قِطاعات بتشغيل سكربت تنظيف لمرة واحدة عند زيارتك التالية يحذف تلقائياً هذه المفاتيح القديمة من localStorage و sessionStorage و الكوكيز الخاصة بالنطاق. تتم العملية بالكامل داخل متصفحك، ولا يتم إرسال أي من هذه البيانات إلى خوادمنا قبل حذفها، ويتم تعيين علامة (qitaat_legacy_cleanup_v1_done) لمنع تكرار العملية.' : 'Your browser may still contain legacy local keys left over from earlier versions of the platform (e.g. language preferences, search history, UI settings). Qitaat runs a one-time cleanup script on your next visit that automatically removes these legacy keys from localStorage, sessionStorage, and domain cookies. This happens entirely within your browser — none of this data is sent to our servers before deletion — and a flag (qitaat_legacy_cleanup_v1_done) is set to prevent the cleanup from running again.'}</p>
        <h2>{isRTL ? 'إزالة نظام القياس التجريبي (Telemetry)' : 'Removal of Experimental Telemetry'}</h2>
        <p>{isRTL ? 'تم حذف نظام تتبع الترحيل التجريبي بالكامل، بما في ذلك جداول التتبع، تقارير التشغيل، إشعارات الفشل، وسجلات إعادة التشغيل. لم يعد الموقع يجمع أي بيانات تتعلق بترحيل التخزين المحلي. أي بيانات سابقة تم إنتاجها من هذا النظام أثناء الفترة التجريبية تم حذفها من قاعدة البيانات.' : 'The experimental migration telemetry system has been fully removed, including its tracking tables, run reports, failure alerts, and rerun history. The site no longer collects any data related to local-storage migrations. Any prior data generated by this system during the beta period has been deleted from our database.'}</p>
        <h2>{isRTL ? 'بيانات الأداء (Core Web Vitals)' : 'Performance Data (Core Web Vitals)'}</h2>
        <p>{isRTL ? 'لتحسين سرعة الموقع، نقوم بجمع مقاييس أداء مجهولة الهوية (LCP، CLS، INP، FCP، TTFB) من المتصفح، إضافة إلى مسار الصفحة ونوع الجهاز (جوال/سطح مكتب). لا تتضمن هذه البيانات أي معرّف شخصي أو عنوان IP أو محتوى تتصفحه. يتم إرسالها عبر تقنية sendBeacon دون تعطيل التنقل، وتُستخدم حصرياً داخل لوحة الإدارة لقياس صحة الأداء. لا نشغّل هذا التتبع داخل بيئة معاينة Lovable.' : 'To improve site speed we collect anonymous performance metrics (LCP, CLS, INP, FCP, TTFB) from your browser, along with the page path and device type (mobile/desktop). This data contains no personal identifiers, IP address, or browsing content. It is sent via sendBeacon without blocking navigation and is used exclusively inside our admin panel to monitor performance health. This tracking is disabled inside the Lovable preview environment.'}</p>
        <h2>{isRTL ? 'التحليلات وGoogle Tag Manager / GA4' : 'Analytics & Google Tag Manager / GA4'}</h2>
        <p>{isRTL ? 'يستخدم قِطاعات Google Tag Manager وGoogle Analytics 4 (أو أدوات تحليل مماثلة) لقياس استخدام الموقع بشكل مجمّع. لا تتضمن الأحداث التحليلية أي بيانات شخصية مباشرة: لا الاسم، ولا البريد الإلكتروني، ولا رقم الجوال، ولا نص الرسائل المرسلة عبر النماذج. تُجمع فقط معلومات تقنية وسلوكية عامة (مثل الصفحة، نوع الجهاز، نوع الحدث).' : 'Qitaat uses Google Tag Manager and Google Analytics 4 (or comparable analytics tools) to measure aggregate site usage. Analytics events never include direct personal data: no name, email, phone number, or message text sent through forms. Only general technical and behavioral signals are collected (e.g. page, device type, event type).'}</p>
        <h2>{isRTL ? 'وضع الموافقة (Consent Mode v2)' : 'Consent Mode v2'}</h2>
        <p>{isRTL ? 'نطبّق نموذج Google Consent Mode v2: بشكل افتراضي يتم رفض كل من analytics_storage وad_storage وad_user_data وad_personalization حتى تختار صراحة قبول الكوكيز التحليلية من خلال شريط الموافقة. يمكنك في أي وقت سحب موافقتك أو تغيير اختيارك من إعدادات الكوكيز في متصفحك أو إعادة فتح شريط الموافقة عبر مسح بيانات الموقع. نحفظ قرارك محلياً فقط لمنع تكرار السؤال.' : 'We implement Google Consent Mode v2: by default analytics_storage, ad_storage, ad_user_data and ad_personalization are denied until you explicitly accept analytics cookies through our consent banner. You may withdraw consent at any time via your browser cookie settings or by clearing site data to re-trigger the banner. Your choice is stored locally only, to avoid re-prompting.'}</p>
        <h2>{isRTL ? 'كوكيز الموافقة (Cookie Consent)' : 'Cookie Consent'}</h2>
        <p>{isRTL ? 'الكوكيز الضرورية فقط (الجلسة، اللغة، تفضيلات الواجهة) تُفعَّل بدون موافقة لأنها لازمة لعمل الموقع. الكوكيز التحليلية والتسويقية لا تُفعَّل إلا بعد موافقتك الصريحة عبر شريط الكوكيز.' : 'Strictly-necessary cookies (session, language, UI preferences) are enabled without consent because the site cannot function without them. Analytics and marketing cookies are activated only after your explicit consent through the cookie banner.'}</p>
        <h2>{isRTL ? 'تتبع مصدر الزيارة (UTM Attribution)' : 'Traffic Source Tracking (UTM Attribution)'}</h2>
        <p>{isRTL ? 'إذا وصلت إلى الموقع من رابط حملة تسويقية يحتوي على معاملات utm_source وutm_medium وutm_campaign وutm_term وutm_content، فإننا نحفظها في متصفحك (localStorage) ونرفقها مع أحداث تسجيل الحساب وإرسال نموذج التواصل وطلبات العروض، لمعرفة مصدر الزيارة وقياس فعالية الحملات. لا نحفظ معها أي بيانات شخصية، ولا تُربط بهويتك مباشرة. نحتفظ بأول لمسة (first_touch) بشكل ثابت وآخر لمسة (last_touch) تُحدَّث مع كل زيارة جديدة من مصدر مختلف.' : 'If you arrive via a campaign URL containing utm_source, utm_medium, utm_campaign, utm_term or utm_content parameters, we store them in your browser (localStorage) and attach them to account-registration, contact-form and lead-request events to attribute traffic and measure campaign performance. No personal data is stored alongside them and they are not linked to your identity. The first_touch is fixed; last_touch is updated whenever you arrive from a new source.'}</p>
        <h2>{isRTL ? 'استخدام البيانات المجمعة' : 'Use of Aggregated Data'}</h2>
        <p>{isRTL ? 'قد نستخدم بيانات تحليلية مجمعة (مجهولة الهوية وغير قابلة للربط بمستخدم بعينه) لتحسين تجربة المستخدم، تطوير ميزات جديدة، ضبط أداء الصفحات، وتقييم نتائج الحملات التسويقية.' : 'We may use aggregated, anonymized analytics data (not linkable to any individual user) to improve user experience, develop new features, tune page performance and evaluate marketing campaign results.'}</p>
        <h2>{isRTL ? 'رفض التتبع التحليلي' : 'Opting Out of Analytics Tracking'}</h2>
        <p>{isRTL ? 'يمكنك في أي وقت رفض التتبع التحليلي عبر اختيار الرفض من شريط الكوكيز عند ظهوره، أو من خلال إعدادات الخصوصية والكوكيز في متصفحك. عند الرفض يبقى الموقع يعمل بشكل كامل، ولن نقوم بإرسال أحداث تحليلية إلى Google Analytics.' : 'You may opt out of analytics tracking at any time by declining via the cookie banner, or through the privacy/cookie settings of your browser. When declined the site continues to work in full, and we will not send analytics events to Google Analytics.'}</p>
        <h2>{isRTL ? 'تدقيق الموقع (SEO Audit)' : 'Site Audit (SEO)'}</h2>
        <p>{isRTL ? 'يقوم النظام بتدقيق دوري (يومي) لصحة الموقع يشمل التحقق من ملفات robots.txt و sitemap.xml ووسوم meta على صفحاتنا العامة فقط. لا يجمع هذا التدقيق أي بيانات عن الزوار.' : 'The system performs a periodic (daily) site-health audit covering robots.txt, sitemap.xml, and meta tags on our public pages only. This audit collects no visitor data.'}</p>
        <h2>{isRTL ? 'حقوقك' : 'Your Rights'}</h2>
        <p>{isRTL ? 'يمكنك طلب الاطلاع على بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت عبر التواصل معنا. كما يمكنك مسح بيانات المتصفح يدوياً من إعدادات المتصفح.' : 'You may request access, correction, or deletion of your personal data at any time by contacting us. You can also clear browser-stored data manually from your browser settings.'}</p>
        <h2>{isRTL ? 'التواصل' : 'Contact'}</h2>
        <p>{isRTL ? 'لأي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا على info@qitaat.com' : 'For any privacy policy inquiries, please contact us at info@qitaat.com'}</p>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
