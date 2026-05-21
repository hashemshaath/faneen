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
        <p className="text-muted-foreground text-xs">{isRTL ? 'آخر تحديث: 21 مايو 2026' : 'Last updated: May 21, 2026'}</p>

        <h2>{isRTL ? 'مقدمة' : 'Introduction'}</h2>
        <p>{isRTL ? 'قِطاعات منصة سعودية تربط العملاء بمزودي خدمات الألمنيوم والحديد والزجاج والخشب وستانلس ستيل وتجهيزات المشاريع. تنظّم هذه الشروط استخدامك للمنصة.' : 'Qitaat is a Saudi platform connecting clients with providers of aluminum, iron, glass, wood, stainless steel and project supplies. These terms govern your use of the platform.'}</p>

        <h2>{isRTL ? 'القبول بالشروط' : 'Acceptance of Terms'}</h2>
        <p>{isRTL ? 'باستخدامك لمنصة قِطاعات، فإنك توافق على الالتزام بهذه الشروط والأحكام وسياسة الخصوصية. إذا كنت لا توافق، يرجى عدم استخدام المنصة.' : 'By using Qitaat, you agree to be bound by these terms and the privacy policy. If you disagree, please do not use the platform.'}</p>

        <h2>{isRTL ? 'الأهلية' : 'Eligibility'}</h2>
        <p>{isRTL ? 'يجب أن يكون عمرك 18 عاماً أو أكثر وأن تكون قادراً قانونياً على إبرام العقود. الحسابات التجارية تستلزم وجود سجل تجاري أو وثيقة عمل سارية في المملكة العربية السعودية.' : 'You must be 18 or older and legally able to enter contracts. Business accounts require a valid commercial registration or work license in the Kingdom of Saudi Arabia.'}</p>

        <h2>{isRTL ? 'الحسابات وأمن البيانات' : 'Accounts & Security'}</h2>
        <p>{isRTL ? 'أنت مسؤول عن سرية بيانات حسابك (البريد، رقم الجوال، كلمة المرور، رموز التحقق OTP) وعن جميع الأنشطة التي تتم من خلاله. أبلغنا فوراً عند الاشتباه بأي وصول غير مصرّح به.' : 'You are responsible for the confidentiality of your account credentials (email, phone, password, OTP codes) and for all activities under your account. Notify us immediately of any suspected unauthorized access.'}</p>

        <h2>{isRTL ? 'دور المنصة' : 'Platform Role'}</h2>
        <p>{isRTL ? 'قِطاعات منصة وسيطة فقط تربط العملاء بمزودي الخدمات وتوفّر أدوات للتواصل وإدارة العقود والمدفوعات. لسنا طرفاً في أي عقد بين المستخدمين، ولا نقوم بتنفيذ الأعمال الإنشائية أو الصناعية.' : 'Qitaat is solely an intermediary platform connecting clients with providers and offering tools for communication, contract management and payments. We are not a party to any contract between users, and do not perform construction or industrial work ourselves.'}</p>

        <h2>{isRTL ? 'المحتوى المنشور' : 'Published Content'}</h2>
        <p>{isRTL ? 'كل مستخدم مسؤول قانونياً عن المحتوى الذي ينشره (وصف الخدمات، الأسعار، الصور، المراجعات، الشهادات). يجب أن يكون المحتوى دقيقاً وقانونياً وغير منتهك لحقوق الغير. تحتفظ قِطاعات بحق إزالة أو تعديل أي محتوى مخالف دون إشعار مسبق.' : 'Each user is legally responsible for content they publish (service descriptions, prices, images, reviews, certificates). Content must be accurate, lawful, and free of third-party infringement. Qitaat reserves the right to remove or edit any violating content without prior notice.'}</p>

        <h2>{isRTL ? 'العقود الإلكترونية' : 'Electronic Contracts'}</h2>
        <p>{isRTL ? 'العقود المُبرمة عبر المنصة هي عقود إلكترونية مباشرة بين العميل والمزوّد. الأسعار شاملة لضريبة القيمة المضافة 15% بشكل افتراضي، وتُقسّم الدفعات عادةً إلى 30% عند البدء، 40% عند التسليم الجزئي، 30% عند التسليم النهائي، ما لم يُتفق على غير ذلك. يُقفل العقد قانونياً عند تفعيله ولا يجوز تعديله إلا عبر ملاحق رسمية.' : 'Contracts created on the platform are direct electronic contracts between client and provider. Prices include 15% VAT by default; payments are typically split 30% at start, 40% at partial delivery, 30% at final delivery, unless otherwise agreed. Contracts lock legally upon activation and may only be modified via formal amendments.'}</p>

        <h2>{isRTL ? 'المدفوعات والرسوم' : 'Payments & Fees'}</h2>
        <p>{isRTL ? 'قد يفرض قِطاعات رسوماً على بعض الخدمات (اشتراكات المزودين، خدمات مميزة، أدوات تجارية). تُوضَّح الرسوم قبل التفعيل، وأي مدفوعات بين العميل والمزوّد تتم وفقاً لجدول الدفعات المتفق عليه في العقد.' : 'Qitaat may charge fees for certain services (provider subscriptions, premium features, business tools). All fees are disclosed before activation; payments between client and provider follow the schedule agreed in the contract.'}</p>

        <h2>{isRTL ? 'الإلغاء وإيقاف الحساب' : 'Cancellation & Account Termination'}</h2>
        <p>{isRTL ? 'يمكنك إلغاء حسابك في أي وقت من إعدادات لوحة التحكم أو بمراسلتنا. يتم إيقاف ظهور ملفك فوراً، وتُحذف البيانات الشخصية خلال 30 يوماً مع الاحتفاظ بسجلات العقود الموقّعة والفواتير وفق المتطلبات القانونية. يحق لقِطاعات تعليق أو إيقاف أي حساب يخالف هذه الشروط.' : 'You may cancel your account at any time from your dashboard settings or by contacting us. Your profile is hidden immediately, personal data deleted within 30 days, while signed-contract and invoice records are retained as legally required. Qitaat may suspend or terminate any account violating these terms.'}</p>

        <h2>{isRTL ? 'الاستخدامات المحظورة' : 'Prohibited Uses'}</h2>
        <p>{isRTL ? 'يحظر استخدام المنصة لأي نشاط غير قانوني، أو نشر محتوى مخالف للآداب العامة، أو محاولة اختراق الأنظمة، أو إرسال رسائل دعائية مزعجة (Spam)، أو انتحال هوية الغير، أو تجاوز إجراءات الحماية والتحقق.' : 'The platform may not be used for any unlawful activity, publishing content against public morals, attempts to breach systems, sending spam, impersonating others, or bypassing protection and verification measures.'}</p>

        <h2>{isRTL ? 'الملكية الفكرية' : 'Intellectual Property'}</h2>
        <p>{isRTL ? 'جميع حقوق الموقع وعلامته التجارية والتصاميم والكود مملوكة لقِطاعات. يبقى المحتوى الذي ينشره المستخدم ملكاً له، مع منحه قِطاعات ترخيصاً غير حصري لعرضه وتوزيعه داخل المنصة لأغراض تشغيلها.' : 'All rights to the site, brand, designs and code belong to Qitaat. User-published content remains owned by the user, who grants Qitaat a non-exclusive license to display and distribute it on the platform for operational purposes.'}</p>

        <h2>{isRTL ? 'النزاعات' : 'Disputes'}</h2>
        <p>{isRTL ? 'نشجّع التواصل المباشر أولاً عبر نظام الرسائل الموثّق داخل المنصة. إذا تعذّر الحل، يحق للأطراف الرجوع للجهات القضائية المختصة في المملكة العربية السعودية، ويحق لقِطاعات تزويد أطراف النزاع بنسخة من سجلات العقد عند الطلب الرسمي.' : 'We encourage direct communication first via the documented in-platform messaging. If unresolved, parties may resort to competent courts in the Kingdom of Saudi Arabia; Qitaat may provide either party with a copy of contract records upon formal request.'}</p>

        <h2>{isRTL ? 'تحديد المسؤولية' : 'Limitation of Liability'}</h2>
        <p>{isRTL ? 'لا تضمن قِطاعات جودة أعمال المزوّدين أو سلامة المنتجات المسلّمة، ولا تتحمل أي أضرار مباشرة أو غير مباشرة ناتجة عن التعامل بين المستخدمين. يقتصر الحد الأقصى للمسؤولية الإجمالية على قيمة رسوم الاشتراك المدفوعة خلال آخر 12 شهراً.' : 'Qitaat does not guarantee provider workmanship or delivered goods, and is not liable for any direct or indirect damages from dealings between users. Total liability is capped at subscription fees paid in the last 12 months.'}</p>

        <h2>{isRTL ? 'التعديلات على الشروط' : 'Changes to Terms'}</h2>
        <p>{isRTL ? 'قد نحدّث هذه الشروط من وقت لآخر. تُنشر النسخة المحدّثة على هذه الصفحة مع تاريخ آخر تحديث، ويُعدّ استمرارك في استخدام المنصة موافقة على التعديلات.' : 'We may update these terms periodically. The updated version is posted on this page with the "Last updated" date, and your continued use constitutes acceptance of the changes.'}</p>

        <h2>{isRTL ? 'القانون المعمول به' : 'Governing Law'}</h2>
        <p>{isRTL ? 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص محاكم الرياض بالنظر في أي نزاع ينشأ عنها.' : 'These terms are governed by the laws of the Kingdom of Saudi Arabia, and the courts of Riyadh have exclusive jurisdiction over any dispute arising from them.'}</p>

        <h2>{isRTL ? 'التواصل' : 'Contact'}</h2>
        <p>{isRTL ? 'لأي استفسارات حول الشروط والأحكام، راسلنا على info@qitaat.com.' : 'For any inquiries about these terms, contact us at info@qitaat.com.'}</p>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
