import React, { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const Terms = () => {
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? 'الشروط والأحكام | قِطاعات' : 'Terms & Conditions | Qitaat',
    description: isRTL
      ? 'الشروط والأحكام الكاملة لمنصة قِطاعات: قواعد إنشاء الحساب، مسؤولية المحتوى المنشور، دور المنصة كوسيط بين العملاء ومزودي خدمات الألمنيوم والحديد والزجاج، أحكام العقود الإلكترونية، الدفع، الإلغاء، وحدود المسؤولية القانونية. آخر تحديث 2026.'
      : 'Complete Qitaat platform terms & conditions: account rules, responsibility for published content, the platform role as an intermediary between clients and aluminum, iron and glass providers, electronic contract clauses, payment, cancellation, and limits of legal liability. Updated 2026.',
    canonical: 'https://qitaat.com/terms',
  });

  useMultiJsonLd(useMemo(() => {
    const faqAr = [
      { q: 'هل قِطاعات طرف في العقد بيني وبين مزود الخدمة؟', a: 'لا. قِطاعات منصة وسيطة تربط العملاء بمزودي خدمات الألمنيوم والحديد والزجاج والخشب. العقد يُبرم مباشرة بينك وبين المزوّد، ونحن نوفر أدوات إدارة وتوثيق العقد فقط.' },
      { q: 'هل يحق لي إلغاء حسابي ومحو ملفي التجاري؟', a: 'نعم، يمكنك إلغاء الحساب من إعدادات لوحة التحكم أو بمراسلتنا. يتم إيقاف ظهور ملفك فوراً، وتُحذف البيانات الشخصية خلال 30 يوماً مع الاحتفاظ بسجلات العقود الموقّعة وفق المتطلبات القانونية.' },
      { q: 'من المسؤول عن دقة المحتوى المنشور (المنتجات، الأسعار، التقييمات)؟', a: 'كل مستخدم مسؤول قانونياً عن المحتوى الذي ينشره (وصف خدمات، أسعار، صور، مراجعات). تحتفظ قِطاعات بحق إزالة أو تعديل أي محتوى ينتهك الشروط أو حقوق الغير دون إشعار مسبق.' },
      { q: 'كيف يتم احتساب ضريبة القيمة المضافة في العقود؟', a: 'الأسعار في العقود الإلكترونية شاملة لضريبة القيمة المضافة 15% بشكل افتراضي، ويتم توضيح ذلك في جدول الدفعات (30% عند البدء، 40% عند التسليم الجزئي، 30% عند التسليم النهائي).' },
      { q: 'ماذا يحدث عند نشوب نزاع بين العميل والمزود؟', a: 'نشجّع التواصل المباشر أولاً عبر نظام الرسائل الموثّق داخل المنصة. إذا تعذّر الحل، يمكن الرجوع للجهات القضائية المختصة في المملكة العربية السعودية، ويحق لقِطاعات تزويد أطراف النزاع بنسخة من سجلات العقد عند الطلب الرسمي.' },
      { q: 'ما هي حدود مسؤولية قِطاعات؟', a: 'لا تضمن قِطاعات جودة أعمال المزودين أو سلامة المنتجات المسلّمة، ولا تتحمل أي أضرار مباشرة أو غير مباشرة ناتجة عن التعامل بين المستخدمين. حدّ المسؤولية الإجمالي لا يتجاوز قيمة رسوم الاشتراك المدفوعة آخر 12 شهراً.' },
    ];
    const faqEn = [
      { q: 'Is Qitaat a party to the contract between me and the provider?', a: 'No. Qitaat is an intermediary platform connecting clients with aluminum, iron, glass, and wood providers. The contract is concluded directly between you and the provider; we only supply tooling for managing and documenting it.' },
      { q: 'Can I cancel my account and delete my business profile?', a: 'Yes — from your dashboard settings or by contacting us. Your profile is hidden immediately, and personal data is deleted within 30 days, while signed-contract records are retained as legally required.' },
      { q: 'Who is responsible for the accuracy of published content (products, prices, reviews)?', a: 'Each user is legally responsible for the content they publish (service descriptions, prices, images, reviews). Qitaat reserves the right to remove or edit any content that violates these terms or third-party rights without prior notice.' },
      { q: 'How is VAT calculated in electronic contracts?', a: 'Prices in e-contracts are inclusive of 15% VAT by default and are itemized in the payment schedule (30% at start, 40% at partial delivery, 30% at final delivery).' },
      { q: 'What happens if a dispute arises between client and provider?', a: 'We encourage direct communication first via the documented in-platform messaging. If unresolved, parties may resort to competent courts in the Kingdom of Saudi Arabia; Qitaat may provide either party with a copy of contract records upon formal request.' },
      { q: "What are the limits of Qitaat's liability?", a: 'Qitaat does not guarantee the quality of provider workmanship or delivered goods, and is not liable for any direct or indirect damages arising from dealings between users. Total liability does not exceed subscription fees paid in the last 12 months.' },
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
      '@type': 'TermsOfService',
      name: isRTL ? 'الشروط والأحكام — قِطاعات' : 'Terms & Conditions — Qitaat',
      url: 'https://qitaat.com/terms',
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
        { '@type': 'ListItem', position: 2, name: isRTL ? 'الشروط والأحكام' : 'Terms & Conditions', item: 'https://qitaat.com/terms' },
      ],
    };
    return [article, faq, breadcrumb];
  }, [isRTL]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10"><div className="container px-4"><h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}</h1></div></div>
      <div className="container py-10 px-4 max-w-3xl prose prose-sm dark:prose-invert">
        <h2>{isRTL ? 'القبول بالشروط' : 'Acceptance of Terms'}</h2>
        <p>{isRTL ? 'باستخدامك لمنصة قِطاعات، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام المنصة.' : 'By using Qitaat platform, you agree to be bound by these terms and conditions. If you disagree, please do not use the platform.'}</p>
        <h2>{isRTL ? 'الحسابات' : 'Accounts'}</h2>
        <p>{isRTL ? 'أنت مسؤول عن الحفاظ على سرية حسابك وكلمة المرور وعن جميع الأنشطة التي تتم من خلال حسابك.' : 'You are responsible for maintaining the confidentiality of your account and password and for all activities under your account.'}</p>
        <h2>{isRTL ? 'المحتوى' : 'Content'}</h2>
        <p>{isRTL ? 'أنت مسؤول عن المحتوى الذي تنشره على المنصة. يجب أن يكون المحتوى دقيقاً وقانونياً ولا ينتهك حقوق الآخرين.' : 'You are responsible for content you publish on the platform. Content must be accurate, legal and not infringe on others rights.'}</p>
        <h2>{isRTL ? 'العقود والمعاملات' : 'Contracts & Transactions'}</h2>
        <p>{isRTL ? 'قِطاعات توفر منصة لتسهيل التواصل بين مزودي الخدمات والعملاء. المنصة ليست طرفاً في العقود المبرمة بين المستخدمين.' : 'Qitaat provides a platform to facilitate communication between service providers and clients. The platform is not a party to contracts between users.'}</p>
        <h2>{isRTL ? 'تحديد المسؤولية' : 'Limitation of Liability'}</h2>
        <p>{isRTL ? 'قِطاعات غير مسؤولة عن أي أضرار ناتجة عن استخدام المنصة أو التعامل مع المزودين المسجلين عليها.' : 'Qitaat is not responsible for any damages resulting from using the platform or dealing with registered providers.'}</p>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
