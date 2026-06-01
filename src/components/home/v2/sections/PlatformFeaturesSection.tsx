import {
  Layers, Tags, Wrench, Images, Briefcase, Scale, FileSignature,
  ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Section, SectionCover } from './_shared';

/**
 * UX-REDESIGN-1: surfaces platform capabilities that previously had no
 * homepage entry point — brands, services catalog, showcase, projects,
 * compare, and contracts/operations framing. All routes are public and
 * already shipped. Copy is intentionally soft ("يدعم", "يساعد على")
 * to avoid claiming guarantees for partially-live capabilities.
 */
const PlatformFeaturesSection = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const items: Array<{
    to: string;
    icon: typeof Layers;
    titleAr: string; titleEn: string;
    bodyAr: string; bodyEn: string;
    linkAr: string; linkEn: string;
    tone: 'primary' | 'secondary' | 'accent';
  }> = [
    {
      to: '/services',
      icon: Wrench,
      titleAr: 'خدمات مصنّفة',
      titleEn: 'Classified services',
      bodyAr: 'تصفح الخدمات حسب القطاع، وافهم نطاق كل خدمة قبل التواصل.',
      bodyEn: 'Browse services by sector and understand each scope before reaching out.',
      linkAr: 'استكشف الخدمات', linkEn: 'Explore services',
      tone: 'primary',
    },
    {
      to: '/brands',
      icon: Tags,
      titleAr: 'علامات تجارية معتمدة',
      titleEn: 'Approved brands',
      bodyAr: 'العلامات المعروضة معتمدة من إدارة المنصة وتربط بالخدمات والقطاعات.',
      bodyEn: 'Listed brands are reviewed by the platform and linked to sectors and services.',
      linkAr: 'تصفح العلامات', linkEn: 'Browse brands',
      tone: 'secondary',
    },
    {
      to: '/showcase',
      icon: Images,
      titleAr: 'معرض أعمال موثّق',
      titleEn: 'Verified work showcase',
      bodyAr: 'استعرض أعمالًا منشورة من جهات تم التحقق من بياناتها قبل اختيار المزود.',
      bodyEn: 'Browse published work from verified providers before you decide.',
      linkAr: 'افتح المعرض', linkEn: 'Open the showcase',
      tone: 'accent',
    },
    {
      to: '/projects',
      icon: Briefcase,
      titleAr: 'مشاريع منشورة',
      titleEn: 'Published projects',
      bodyAr: 'اطلع على مشاريع سابقة لفهم نطاق العمل قبل طلب عرض سعر مشابه.',
      bodyEn: 'See past projects to understand scope before requesting a similar quote.',
      linkAr: 'تصفح المشاريع', linkEn: 'Browse projects',
      tone: 'primary',
    },
    {
      to: '/compare',
      icon: Scale,
      titleAr: 'مقارنة قبل التواصل',
      titleEn: 'Compare before contacting',
      bodyAr: 'اختر عدة مزودين وقارن الخدمات والتقييمات في مكان واحد.',
      bodyEn: 'Pick multiple providers and compare services and ratings in one view.',
      linkAr: 'ابدأ المقارنة', linkEn: 'Start comparing',
      tone: 'secondary',
    },
    {
      to: '/for-providers',
      icon: FileSignature,
      titleAr: 'تنظيم الطلبات والعقود',
      titleEn: 'Organize requests & contracts',
      bodyAr: 'تدعم المنصة تنظيم الطلبات، العروض، والمراحل، قابل للتفعيل حسب نوع الخدمة.',
      bodyEn: 'The platform supports organizing requests, quotes and stages — enabled per service type.',
      linkAr: 'تعرف على المزيد', linkEn: 'Learn more',
      tone: 'accent',
    },
  ];

  const toneRing = (t: 'primary' | 'secondary' | 'accent') =>
    t === 'secondary' ? 'bg-secondary/10 text-secondary' :
    t === 'accent'    ? 'bg-accent/10 text-accent' :
                        'bg-primary/10 text-primary';

  return (
    <Section id="platform-features" ariaLabelledBy="platform-features-heading">
      <SectionCover
        headingId="platform-features-heading"
        tone="primary"
        icon={Layers}
        eyebrow={bi('قدرات المنصة', 'Platform capabilities')}
        title={bi('أكثر من مجرد دليل مزودين', 'More than a provider directory')}
        sub={bi(
          'قطاعات تجمع الخدمات، العلامات، الأعمال السابقة، والمقارنة في مكان واحد — لتبدأ من معلومة أوضح.',
          'Qitaat brings together services, brands, past work and comparison — so you start from clearer information.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {items.map(({ to, icon: Icon, titleAr, titleEn, bodyAr, bodyEn, linkAr, linkEn, tone }) => (
          <Link
            key={to}
            to={to}
            className="group relative rounded-2xl border border-border/60 bg-card p-5 sm:p-6 hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex flex-col"
          >
            <div className={`inline-flex w-11 h-11 rounded-xl items-center justify-center mb-4 ${toneRing(tone)}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground mb-2 leading-snug">
              {bi(titleAr, titleEn)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
              {bi(bodyAr, bodyEn)}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary translate-x-0 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
              {bi(linkAr, linkEn)}
              <Arrow className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
};

export { PlatformFeaturesSection };
export default PlatformFeaturesSection;