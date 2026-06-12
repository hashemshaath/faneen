import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Wrench,
  ShieldCheck,
  MapPin,
  FileText,
  Building2,
  Search as SearchIcon,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

const CANONICAL = 'https://qitaat.com/guides/heavy-equipment-rental-saudi-arabia';

const HeavyEquipmentRentalSaudiArabia: React.FC = () => {
  const { isRTL } = useLanguage();

  const title = isRTL
    ? 'دليل تأجير المعدات الثقيلة في السعودية | قِطاعات'
    : 'Heavy Equipment Rental in Saudi Arabia — Complete Guide | Qitaat';

  const description = isRTL
    ? 'دليل عملي لتأجير المعدات الثقيلة في السعودية: متى تستأجر بدلاً من الشراء، أنواع المعدات، اختيار المزوّد، المستندات المطلوبة، السلامة، وعوامل الموقع.'
    : 'A practical Arabic guide to heavy equipment rental in Saudi Arabia: when to rent vs buy, equipment categories, choosing a provider, documents, safety, and site factors.';

  usePageMeta({ title, description, canonical: CANONICAL });

  const faq = useMemo(
    () => [
      {
        q: 'ما هو تأجير المعدات الثقيلة؟',
        a: 'هو الحصول على معدات إنشائية أو صناعية لفترة محددة من مزوّد متخصص دون شرائها، مع إمكانية تضمين السائق/المشغل والصيانة حسب الاتفاق.',
      },
      {
        q: 'متى يكون التأجير أفضل من الشراء؟',
        a: 'عندما يكون الاستخدام مؤقتاً أو موسمياً، أو عند الحاجة إلى معدة متخصصة لمشروع محدد، أو لتجنّب تكاليف الصيانة وقطع الغيار والتخزين على المدى الطويل.',
      },
      {
        q: 'ما المستندات التي يحتاجها طالب التأجير؟',
        a: 'عادةً السجل التجاري أو الهوية الوطنية، تفاصيل الموقع والمدة، نوع العمل المطلوب، وأي اشتراطات سلامة من المالك أو الجهة المشرفة على المشروع.',
      },
      {
        q: 'هل تشمل تكلفة التأجير المشغّل والوقود؟',
        a: 'يختلف ذلك بين المزوّدين؛ بعض العقود تكون «جاف» (المعدة فقط) وبعضها «رطب» (مع مشغّل وأحياناً وقود وصيانة). يُفضّل توضيح ذلك كتابةً قبل التعاقد.',
      },
      {
        q: 'كيف أختار مزوّد تأجير موثوق في السعودية؟',
        a: 'تحقّق من السجل التجاري، اطّلع على تقييمات وأعمال سابقة، اطلب شهادات الفحص الدوري للمعدة، وتأكّد من توفّر الدعم الفني وقطع الغيار خلال فترة المشروع.',
      },
      {
        q: 'هل يمكنني مقارنة عدة مزوّدين عبر قِطاعات؟',
        a: 'نعم، يتيح قِطاعات إرسال طلب واحد لعدة مزوّدين معتمدين في منطقتك ومقارنة العروض والشروط بسهولة.',
      },
    ],
    [],
  );

  useMultiJsonLd(
    useMemo(
      () => [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'دليل تأجير المعدات الثقيلة في السعودية',
          inLanguage: 'ar',
          mainEntityOfPage: CANONICAL,
          url: CANONICAL,
          about: 'تأجير المعدات الثقيلة',
          author: { '@type': 'Organization', name: 'Qitaat', url: 'https://qitaat.com' },
          publisher: {
            '@type': 'Organization',
            name: 'Qitaat',
            url: 'https://qitaat.com',
            logo: { '@type': 'ImageObject', url: 'https://qitaat.com/favicon.png' },
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
            { '@type': 'ListItem', position: 2, name: 'الأدلة', item: 'https://qitaat.com/guides' },
            { '@type': 'ListItem', position: 3, name: 'تأجير المعدات الثقيلة', item: CANONICAL },
          ],
        },
      ],
      [faq],
    ),
  );

  const categories = [
    { icon: Truck, name: 'الرافعات (كرينات)', desc: 'رفع الأحمال الثقيلة في مواقع البناء والمصانع، بأنواع برجية ومتحرّكة وذات أذرع تلسكوبية.' },
    { icon: Wrench, name: 'الحفّارات', desc: 'حفر الأساسات والخنادق وأعمال التسوية، بأحجام تناسب المشاريع الصغيرة والكبيرة.' },
    { icon: Truck, name: 'اللوادر (الشيول)', desc: 'تحميل ونقل الرمل والركام والمخلفات داخل الموقع وبين المواقع القريبة.' },
    { icon: Truck, name: 'الرافعات الشوكية (فوركليفت)', desc: 'مناولة البليتات والمواد الثقيلة في المستودعات والمصانع وورش التصنيع.' },
    { icon: Wrench, name: 'المولّدات الكهربائية', desc: 'تشغيل المواقع البعيدة عن الشبكة أو كحلّ احتياطي للمصانع وورش العمل.' },
    { icon: Wrench, name: 'الكمبروسرات (ضواغط الهواء)', desc: 'تشغيل المعدات الهوائية وأعمال الرملة والتنظيف الصناعي.' },
    { icon: Wrench, name: 'معدات الرفع المساعدة', desc: 'منصات رفع الأفراد (سكيسر/بوم)، روافع السلاسل، والروافع الكهربائية للأعمال على الارتفاعات.' },
    { icon: Truck, name: 'الشاحنات ومعدات النقل', desc: 'نقل المعدات والمواد بين المواقع، شاحنات قلاب، ناقلات منخفضة (لوبد)، وصهاريج.' },
  ];

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5 flex-wrap" aria-label="breadcrumb">
          <Link to="/" className="hover:text-primary">قِطاعات</Link>
          <span>/</span>
          <Link to="/guides" className="hover:text-primary">الأدلة</Link>
          <span>/</span>
          <span className="text-foreground">تأجير المعدات الثقيلة</span>
        </nav>

        {/* Hero */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Truck className="w-3.5 h-3.5" />
            دليل عملي
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            دليل تأجير المعدات الثقيلة في السعودية
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            دليل شامل للمقاولين والمصانع وورش العمل وأصحاب المشاريع لاختيار المعدات الثقيلة المناسبة،
            وفهم الفروق بين الشراء والتأجير، واختيار المزوّد المناسب في السوق السعودي.
          </p>
        </header>

        <article className="prose prose-sm sm:prose-base max-w-none dark:prose-invert space-y-10">
          {/* Section 1 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3">
              ما هو تأجير المعدات الثقيلة؟
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              تأجير المعدات الثقيلة هو استئجار آليات إنشائية أو صناعية — مثل الرافعات والحفّارات واللوادر —
              لفترة زمنية محددة من شركة متخصصة، بدلاً من شرائها وتحمّل تكاليف امتلاكها وصيانتها وتخزينها.
              يُستخدم هذا الخيار على نطاق واسع في السعودية بفضل تنوّع المشاريع الإنشائية والصناعية،
              ومرونة العقود التي تناسب احتياجات المشاريع قصيرة وطويلة الأمد.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3">
              متى يكون التأجير أفضل من الشراء؟
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-muted-foreground">
              <li>• المشاريع المؤقتة أو الموسمية التي لا تتطلّب استخدام المعدة طوال العام.</li>
              <li>• الحاجة إلى معدة متخصصة لمهمة محددة فقط، كرافعة بحمولة كبيرة لرفعة واحدة.</li>
              <li>• تجنّب تكاليف الصيانة الدورية وقطع الغيار والتخزين والتأمين.</li>
              <li>• مرونة استبدال المعدة بأخرى أحدث أو مختلفة عند تغيّر متطلبات المشروع.</li>
              <li>• تقليل رأس المال المجمَّد في الأصول، وتحرير السيولة لاحتياجات تشغيلية أخرى.</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              في المقابل، قد يكون الشراء مناسباً عندما يكون الاستخدام يومياً ومستمراً لسنوات،
              أو عندما تتوفّر بنية صيانة داخلية كافية لدى المنشأة.
            </p>
          </section>

          {/* Section 3 - Categories */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-4">
              أبرز فئات المعدات الثقيلة القابلة للتأجير
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {categories.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.name} className="rounded-xl border border-border bg-card p-4 hover-lift">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-heading text-sm font-bold">{c.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3">
              كيف تختار مزوّد تأجير مناسباً؟
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-muted-foreground">
              <li>• تحقّق من السجل التجاري والترخيص النظامي للنشاط.</li>
              <li>• اطّلع على أعمال سابقة وتقييمات من عملاء حقيقيين.</li>
              <li>• اطلب شهادات الفحص الدوري للمعدات (خصوصاً الرافعات ومنصات الرفع).</li>
              <li>• تأكّد من توفّر دعم فني وقطع غيار خلال فترة المشروع لتفادي توقف العمل.</li>
              <li>• حدّد بوضوح ما إذا كان العقد «جاف» (المعدة فقط) أو «رطب» (مع مشغّل ووقود).</li>
              <li>• راجع شروط التأمين والمسؤولية عن الأضرار والحوادث.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              ما يجب على طالب التأجير تجهيزه
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-muted-foreground">
              <li>• نوع العمل المطلوب ووصف مختصر للمهمة (رفع، حفر، نقل، توليد طاقة... إلخ).</li>
              <li>• مدة التأجير المتوقعة وتاريخ البدء.</li>
              <li>• تفاصيل الموقع: المدينة، الحي، طبيعة الأرض، وسهولة الوصول.</li>
              <li>• الأبعاد أو الأحمال إن وُجدت (وزن الحمل، ارتفاع الرفع، عمق الحفر).</li>
              <li>• اشتراطات السلامة الخاصة بالمالك أو الجهة المشرفة على المشروع.</li>
              <li>• المستندات النظامية: السجل التجاري أو الهوية الوطنية حسب نوع الجهة.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              السلامة واعتبارات المشغّل
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              السلامة عنصر أساسي عند تشغيل المعدات الثقيلة. تأكّد من أن المشغّل يحمل رخصة قيادة سارية للفئة المناسبة،
              وأن لديه خبرة موثّقة بالمعدة المستأجَرة. ينبغي توفير معدات الوقاية الشخصية (خوذة، حذاء سلامة، سترة عاكسة)،
              ووضع خطة عمل آمنة للموقع تشمل عزل منطقة العمل، والتحقق من المسافات الآمنة عن خطوط الكهرباء،
              والالتزام بالاشتراطات النظامية المعمول بها في المملكة.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              عوامل المدينة وموقع المشروع
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              تختلف تكلفة وتوفّر المعدات حسب المدينة وقرب المزوّد من الموقع. المشاريع داخل المدن الكبرى
              (الرياض، جدة، الدمام، مكة، المدينة) غالباً ما تتوفر فيها خيارات أوسع، بينما تتطلب المواقع البعيدة
              ترتيبات إضافية للنقل والإقامة. خذ في الاعتبار: مسار الوصول إلى الموقع، تصاريح الدخول، وقت العمل المسموح به،
              والتنسيق مع البلدية أو الجهة المالكة عند العمل في مناطق حساسة.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              كيف يساعدك قِطاعات؟
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              يتيح لك <Link to="/" className="text-primary hover:underline">قِطاعات</Link> الوصول إلى مزوّدي تأجير معدات معتمدين
              في مختلف مدن المملكة. يمكنك إرسال طلب واحد، ومقارنة العروض، والاطلاع على ملفات المزوّدين، وتقييمات العملاء،
              وحفظ مفضلاتك للمشاريع القادمة. كما يمكنك تصفّح <Link to="/rentals" className="text-primary hover:underline">كتالوج التأجير</Link>{' '}
              أو زيارة <Link to="/guides" className="text-primary hover:underline">مكتبة الأدلة الفنية</Link> لمزيد من المعلومات
              المتخصصة لقطاعك.
            </p>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-2">
              ابدأ طلب تأجير معدتك الآن
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              قارن العروض من مزوّدين معتمدين في منطقتك خلال دقائق.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="h-11 px-5 rounded-xl">
                <Link to="/quote">
                  اطلب عرض سعر
                  <ArrowIcon className="w-4 h-4 ms-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5 rounded-xl">
                <Link to="/search?q=%D8%AA%D8%A3%D8%AC%D9%8A%D8%B1+%D9%85%D8%B9%D8%AF%D8%A7%D8%AA">
                  <SearchIcon className="w-4 h-4 me-1" />
                  ابحث عن مزوّدين
                </Link>
              </Button>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-4">الأسئلة الشائعة</h2>
            <div className="space-y-3">
              {faq.map((f, idx) => (
                <details
                  key={idx}
                  className="group rounded-xl border border-border bg-card p-4 open:border-primary/30"
                >
                  <summary className="font-heading text-sm sm:text-base font-bold cursor-pointer list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-primary text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related */}
          <section className="border-t border-border pt-6">
            <h2 className="font-heading text-lg font-bold mb-3">روابط ذات صلة</h2>
            <ul className="text-sm space-y-1.5">
              <li>
                <Link to="/rentals" className="text-primary hover:underline">كتالوج تأجير المعدات</Link>
              </li>
              <li>
                <Link to="/guides" className="text-primary hover:underline">مكتبة الأدلة الفنية</Link>
              </li>
              <li>
                <Link to="/sectors" className="text-primary hover:underline">القطاعات الصناعية</Link>
              </li>
              <li>
                <Link to="/quote" className="text-primary hover:underline">طلب عرض سعر</Link>
              </li>
            </ul>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default HeavyEquipmentRentalSaudiArabia;