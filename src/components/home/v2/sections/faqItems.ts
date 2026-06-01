/**
 * FAQ source of truth shared between FAQSection and the homepage JSON-LD.
 * Kept as a separate module so Index.tsx can import it eagerly for SEO
 * without dragging the FAQSection component into the main bundle.
 */
export const FAQ_ITEMS_BI = [
  { qAr: 'ما هي قطاعات؟', qEn: 'What is Qitaat?',
    aAr: 'منصة تساعدك على الوصول إلى مزودي خدمات الصناعات الخفيفة وطلب عروض أسعار بطريقة منظمة.',
    aEn: 'A platform that helps you reach light-industry service providers and request quotes in an organized way.' },
  { qAr: 'هل قطاعات تنفذ الأعمال؟', qEn: 'Does Qitaat execute the work?',
    aAr: 'لا. قطاعات تساعد على الربط بين العميل ومزودي الخدمة، ولا تنفذ الأعمال مباشرة.',
    aEn: 'No. Qitaat connects clients with providers and does not execute work directly.' },
  { qAr: 'كيف أطلب عرض سعر؟', qEn: 'How do I request a quote?',
    aAr: 'اختر القطاع، أضف تفاصيل مشروعك، ثم أرسل الطلب للمزودين المناسبين.',
    aEn: 'Pick a sector, add your project details, then send the request to suitable providers.' },
  { qAr: 'هل يمكن للمزودين التسجيل؟', qEn: 'Can providers register?',
    aAr: 'نعم. يمكن للورش والمصانع والمعارض وفرق التنفيذ إنشاء ملف لعرض خدماتهم.',
    aEn: 'Yes. Workshops, factories, showrooms and install teams can create a profile.' },
  { qAr: 'هل المنصة مناسبة للمقاولين؟', qEn: 'Is the platform good for contractors?',
    aAr: 'نعم. تساعد المقاولين على الوصول إلى مزودي تنفيذ حسب القطاع والمدينة.',
    aEn: 'Yes. It helps contractors find execution partners by sector and city.' },
];