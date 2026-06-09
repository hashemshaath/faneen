/**
 * HomeSectorGrid — clean replacement for MainSectorsSection.
 * Same 6 sectors (taxonomy-stable slugs), same responsive images,
 * but no decorative icon badges, no dual gradients, no "Sector"
 * chip. Visual = image + title + one-line description + arrow.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import sectorAluminum from '@/assets/home/sector-aluminum.webp';
import sectorIron from '@/assets/home/sector-iron.webp';
import sectorWood from '@/assets/home/sector-wood.webp';
import sectorGlass from '@/assets/home/sector-glass.webp';
import sectorStainless from '@/assets/home/sector-stainless.webp';
import sectorFabrication from '@/assets/home/sector-fabrication.webp';
import sectorAluminum480 from '@/assets/home/sector-aluminum-480.webp';
import sectorAluminum768 from '@/assets/home/sector-aluminum-768.webp';
import sectorAluminum1024 from '@/assets/home/sector-aluminum-1024.webp';
import sectorIron480 from '@/assets/home/sector-iron-480.webp';
import sectorIron768 from '@/assets/home/sector-iron-768.webp';
import sectorWood480 from '@/assets/home/sector-wood-480.webp';
import sectorWood768 from '@/assets/home/sector-wood-768.webp';
import sectorWood1024 from '@/assets/home/sector-wood-1024.webp';
import sectorGlass480 from '@/assets/home/sector-glass-480.webp';
import sectorGlass768 from '@/assets/home/sector-glass-768.webp';
import sectorGlass1024 from '@/assets/home/sector-glass-1024.webp';
import sectorStainless480 from '@/assets/home/sector-stainless-480.webp';
import sectorStainless768 from '@/assets/home/sector-stainless-768.webp';
import sectorStainless1024 from '@/assets/home/sector-stainless-1024.webp';
import sectorFabrication480 from '@/assets/home/sector-fabrication-480.webp';
import sectorFabrication768 from '@/assets/home/sector-fabrication-768.webp';
import { Section, SectionHead, SecondaryCTA, ROUTES } from './_shared';

type Sector = {
  slug: string;
  image: string;
  srcSet: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

const SECTORS: Sector[] = [
  { slug: 'aluminum-glass-facades', image: sectorAluminum1024, srcSet: `${sectorAluminum480} 480w, ${sectorAluminum768} 768w, ${sectorAluminum1024} 1024w, ${sectorAluminum} 1200w`,
    titleAr: 'ألمنيوم', titleEn: 'Aluminum',
    bodyAr: 'واجهات وشبابيك وأبواب ومطابخ.', bodyEn: 'Facades, windows, doors and kitchens.' },
  { slug: 'steel-metal-works', image: sectorIron768, srcSet: `${sectorIron480} 480w, ${sectorIron768} 768w, ${sectorIron} 1000w`,
    titleAr: 'حديد', titleEn: 'Iron',
    bodyAr: 'أبواب وسلالم وهياكل وأعمال معدنية.', bodyEn: 'Doors, stairs, frames and metalwork.' },
  { slug: 'wood-carpentry', image: sectorWood1024, srcSet: `${sectorWood480} 480w, ${sectorWood768} 768w, ${sectorWood1024} 1024w, ${sectorWood} 1200w`,
    titleAr: 'خشب', titleEn: 'Wood',
    bodyAr: 'أبواب وأثاث وتفصيل داخلي.', bodyEn: 'Doors, furniture and custom interiors.' },
  { slug: 'aluminum-glass-facades', image: sectorGlass1024, srcSet: `${sectorGlass480} 480w, ${sectorGlass768} 768w, ${sectorGlass1024} 1024w, ${sectorGlass} 1200w`,
    titleAr: 'زجاج', titleEn: 'Glass',
    bodyAr: 'سيكوريت وواجهات وقواطع وأبواب.', bodyEn: 'Tempered glass, facades, partitions and doors.' },
  { slug: 'stainless-steel-fabrication', image: sectorStainless1024, srcSet: `${sectorStainless480} 480w, ${sectorStainless768} 768w, ${sectorStainless1024} 1024w, ${sectorStainless} 1200w`,
    titleAr: 'ستانلس ستيل', titleEn: 'Stainless steel',
    bodyAr: 'مطابخ ومطاعم ودرابزين وتجهيزات.', bodyEn: 'Kitchens, restaurants, railings and fittings.' },
  { slug: 'contracting-finishing', image: sectorFabrication768, srcSet: `${sectorFabrication480} 480w, ${sectorFabrication768} 768w, ${sectorFabrication} 1000w`,
    titleAr: 'تصنيع وتركيب', titleEn: 'Fabrication & install',
    bodyAr: 'ورش ومصانع وفرق تنفيذ متخصصة.', bodyEn: 'Workshops, factories and install crews.' },
];

const HomeSectorGrid = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <Section id="sectors" ariaLabelledBy="sectors-heading">
      <SectionHead
        headingId="sectors-heading"
        title={bi('القطاعات الرئيسية', 'Main sectors')}
        sub={bi('اختر القطاع وابدأ تصفّح المزودين.', 'Pick a sector and browse providers.')}
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {SECTORS.map((s) => (
          <Link
            key={s.slug}
            to={`/search?category=${s.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={s.image}
                srcSet={s.srcSet}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 50vw"
                alt={bi(s.titleAr, s.titleEn)}
                width={1024}
                height={640}
                loading="lazy"
                decoding="async"
                {...{ fetchpriority: 'low' }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
              <h3 className="absolute bottom-2.5 start-3 end-3 sm:bottom-3 font-heading font-bold text-base sm:text-lg md:text-xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-tight">
                {bi(s.titleAr, s.titleEn)}
              </h3>
            </div>
            <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">{bi(s.bodyAr, s.bodyEn)}</p>
              <Arrow className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
      <div className="text-center mt-10 sm:mt-12">
        <SecondaryCTA to={ROUTES.categories} label={bi('استكشف كل القطاعات', 'Explore all sectors')} />
      </div>
    </Section>
  );
};

export default HomeSectorGrid;