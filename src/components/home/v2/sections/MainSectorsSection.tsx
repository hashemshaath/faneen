import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Square, Wrench, DoorClosed, Layers, Boxes, Hammer,
} from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import sectorAluminum from '@/assets/home/sector-aluminum.webp';
import sectorIron from '@/assets/home/sector-iron.webp';
import sectorWood from '@/assets/home/sector-wood.webp';
import sectorGlass from '@/assets/home/sector-glass.webp';
import sectorStainless from '@/assets/home/sector-stainless.webp';
import sectorFabrication from '@/assets/home/sector-fabrication.webp';
import { Section, SectionCover, SecondaryCTA, ROUTES } from './_shared';

type SectorItem = {
  slug: string;
  icon: ComponentType<{ className?: string }>;
  image: string;
  accent: string;
  dot: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

const SectorCard = ({ s, idx }: { s: SectorItem; idx: number }) => {
  const bi = useBi();
  const { ref, isVisible } = useScrollAnimation<HTMLAnchorElement>(0.15);
  return (
    <Link
      ref={ref}
      to={`/search?category=${s.slug}`}
      style={{ transitionDelay: isVisible ? `${Math.min(idx * 70, 280)}ms` : '0ms' }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card hover-lift block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 will-change-transform transform-gpu transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={s.image}
          alt={bi(`صورة قطاع ${s.titleAr}`, `${s.titleEn} sector cover`)}
          width={1280}
          height={800}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
        <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none`} />
        <div className="absolute top-2.5 start-2.5 sm:top-3 sm:start-3 inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[10px] font-semibold uppercase tracking-wider text-white max-w-[60%] truncate">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
          {bi('قطاع', 'Sector')}
        </div>
        <div className="absolute top-2.5 end-2.5 sm:top-3 sm:end-3 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </div>
        <h3 className="absolute bottom-3 start-3 end-3 sm:start-4 sm:end-4 font-heading font-bold text-lg sm:text-xl md:text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-tight line-clamp-2">
          {bi(s.titleAr, s.titleEn)}
        </h3>
      </div>
      <div className="relative p-4 sm:p-5 md:p-6">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{bi(s.bodyAr, s.bodyEn)}</p>
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/40 inline-flex items-center gap-1.5 text-xs font-semibold text-primary translate-x-0 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform w-full">
          {bi('استعرض المزودين', 'Browse providers')}
          <ArrowLeft className="w-3 h-3 rtl:block ltr:hidden" />
          <ArrowRight className="w-3 h-3 ltr:block rtl:hidden" />
        </div>
      </div>
    </Link>
  );
};

const MainSectorsSection = () => {
  const bi = useBi();
  const sectors: SectorItem[] = [
    { slug: 'aluminum', icon: Square, image: sectorAluminum, accent: 'from-sky-500/15 to-sky-500/0', dot: 'bg-sky-500',
      titleAr: 'ألمنيوم', titleEn: 'Aluminum',
      bodyAr: 'أبواب، شبابيك، واجهات، مطابخ، وقواطع.', bodyEn: 'Doors, windows, facades, kitchens and partitions.' },
    { slug: 'iron', icon: Wrench, image: sectorIron, accent: 'from-slate-500/15 to-slate-500/0', dot: 'bg-slate-500',
      titleAr: 'حديد', titleEn: 'Iron',
      bodyAr: 'أبواب، سلالم، هياكل، شبك، وأعمال معدنية.', bodyEn: 'Doors, stairs, frames, mesh and metalwork.' },
    { slug: 'wood', icon: DoorClosed, image: sectorWood, accent: 'from-amber-600/15 to-amber-600/0', dot: 'bg-amber-600',
      titleAr: 'خشب', titleEn: 'Wood',
      bodyAr: 'أبواب، أثاث، ديكور، تفصيل، وتجهيزات داخلية.', bodyEn: 'Doors, furniture, décor, custom work and interiors.' },
    { slug: 'glass', icon: Layers, image: sectorGlass, accent: 'from-cyan-500/15 to-cyan-500/0', dot: 'bg-cyan-500',
      titleAr: 'زجاج', titleEn: 'Glass',
      bodyAr: 'واجهات، سيكوريت، قواطع، أبواب زجاجية، وتركيب.', bodyEn: 'Facades, tempered glass, partitions, doors and install.' },
    { slug: 'stainless', icon: Boxes, image: sectorStainless, accent: 'from-zinc-500/15 to-zinc-500/0', dot: 'bg-zinc-500',
      titleAr: 'ستانلس ستيل', titleEn: 'Stainless steel',
      bodyAr: 'مطاعم، مطابخ، درابزين، تجهيزات، وأعمال خاصة.', bodyEn: 'Restaurants, kitchens, railings, fittings and custom work.' },
    { slug: 'fabrication', icon: Hammer, image: sectorFabrication, accent: 'from-emerald-600/15 to-emerald-600/0', dot: 'bg-emerald-600',
      titleAr: 'التصنيع والتركيب', titleEn: 'Fabrication & install',
      bodyAr: 'ورش ومصانع وفرق تنفيذ حسب احتياج المشروع.', bodyEn: 'Workshops, factories and install crews per project.' },
  ];
  return (
    <Section id="sectors" ariaLabelledBy="sectors-heading">
      <SectionCover
        headingId="sectors-heading"
        tone="primary"
        icon={Layers}
        eyebrow={bi('القطاعات الرئيسية', 'Main sectors')}
        title={bi('قطاعات تغطي احتياجات المشاريع اليومية', 'Sectors that cover everyday project needs')}
        sub={bi(
          'من الأعمال الصغيرة إلى المشاريع التجارية، ابدأ من القطاع المناسب.',
          'From small jobs to commercial projects — start from the right sector.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {sectors.map((s, idx) => (
          <SectorCard key={s.slug} s={s} idx={idx} />
        ))}
      </div>
      <div className="text-center mt-12">
        <SecondaryCTA to={ROUTES.categories} label={bi('استكشف كل القطاعات', 'Explore all sectors')} />
      </div>
    </Section>
  );
};

export { MainSectorsSection };
export default MainSectorsSection;