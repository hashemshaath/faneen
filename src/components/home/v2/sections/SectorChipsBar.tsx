import { Link } from 'react-router-dom';
import {
  Square, Wrench, DoorClosed, Layers, Boxes, Hammer, Building2,
} from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';

const QUICK_SECTORS = [
  { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum', icon: Square },
  { ar: 'حديد', en: 'Iron', slug: 'iron', icon: Wrench },
  { ar: 'خشب', en: 'Wood', slug: 'wood', icon: DoorClosed },
  { ar: 'زجاج', en: 'Glass', slug: 'glass', icon: Layers },
  { ar: 'ستانلس ستيل', en: 'Stainless Steel', slug: 'stainless', icon: Boxes },
  { ar: 'تصنيع وتركيب', en: 'Fabrication & Install', slug: 'fabrication', icon: Hammer },
  { ar: 'واجهات ومحلات', en: 'Facades & Shops', slug: 'facades', icon: Building2 },
  { ar: 'تجهيزات مشاريع', en: 'Project Supplies', slug: 'projects', icon: Boxes },
];

const SectorChipsBar = () => {
  const bi = useBi();
  return (
    <section className="py-10 sm:py-14 border-y border-border/60 bg-gradient-to-b from-card/60 via-background to-card/30">
      <div className="container-app">
        <div className="text-center mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide uppercase mb-3">
            {bi('القطاعات', 'Sectors')}
          </span>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            {bi('اختر القطاع وابدأ', 'Pick a sector to start')}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            {bi(
              'قطاعات تساعدك على الوصول إلى مزودين حسب نوع الخدمة والمدينة.',
              'Qitaat helps you reach providers by service type and city.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {QUICK_SECTORS.map(({ ar, en, slug, icon: Icon }) => (
            <Link
              key={slug}
              to={`/search?category=${slug}`}
              aria-label={bi(`تصفح قطاع ${ar}`, `Browse ${en} sector`)}
              className="group inline-flex items-center gap-2 ps-3.5 pe-4 h-11 rounded-full bg-card border border-border/70 shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-foreground hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </span>
              {bi(ar, en)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export { SectorChipsBar };
export default SectorChipsBar;