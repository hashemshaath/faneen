import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { supabase } from '@/integrations/supabase/client';
import { countActiveBusinesses } from '@/modules/businesses';
import { countProfiles } from '@/modules/users';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { WhyQitaatSection } from '@/components/home/WhyQitaatSection';
import {
  Mail, MapPin, Sparkles, Target, Eye, Heart, ShieldCheck, Handshake,
  Lightbulb, Gem, Building2, Star, FolderOpen, Users, ArrowLeft, ArrowRight,
  Layers, FileSignature, Wallet, BadgeCheck, TrendingUp, CheckCircle2, Rocket,
} from 'lucide-react';

/* ───────── Hero ───────── */
const AboutHero = ({ isRTL }: { isRTL: boolean }) => (
  <section className="relative overflow-hidden bg-primary text-primary-foreground pt-28 sm:pt-36 pb-20 sm:pb-28">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-24 -start-24 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-32 -end-24 w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(hsl(var(--accent)) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    </div>
    <div className="container relative px-4 sm:px-6 text-center max-w-3xl">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 backdrop-blur mb-6 animate-fade-in">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-body font-medium text-accent">{isRTL ? 'تعرّف على قِطاعات' : 'Get to know Qitaat'}</span>
      </div>
      <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-6xl leading-tight mb-5 tracking-tight">
        {isRTL ? (<>نُعيد تعريف <span className="text-primary">قِطاعات الصناعة</span></>) : (<>Reimagining the <span className="text-primary">Industrial Sectors</span></>)}
      </h1>
      <p className="text-sm sm:text-lg text-primary-foreground/70 font-body leading-relaxed max-w-2xl mx-auto">
        {isRTL
          ? 'قِطاعات هي المنصة العربية الأولى التي تربط أصحاب المشاريع بأفضل مزودي الخدمات في الألمنيوم والزجاج والخشب والحديد — بأدوات احترافية، عقود محمية، وضمانات حقيقية.'
          : 'Qitaat is the leading Arabic platform that connects project owners with the best service providers in aluminum, glass, wood, and steel — with professional tools, protected contracts, and real warranties.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Button asChild variant="hero" size="lg"><Link to="/search">{isRTL ? 'استكشف المزودين' : 'Explore Providers'}</Link></Button>
        <Button asChild variant="heroOutline" size="lg"><Link to="/contact">{isRTL ? 'تواصل معنا' : 'Contact Us'}</Link></Button>
      </div>
    </div>
  </section>
);

/* ───────── Live stats strip ───────── */
const StatItem = ({
  icon: Icon, end, label, sub, isVisible, accent, index,
}: {
  icon: React.ElementType; end: number; label: string; sub: string;
  isVisible: boolean; accent: string; index: number;
}) => {
  const display = useCountUp(end, isVisible, 2000);
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 sm:p-6 hover:border-accent/40 hover:shadow-elev-3 transition-all duration-500 ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 110}ms`, animationFillMode: 'both' }}
    >
      {/* hover-only color wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="font-heading font-black text-3xl sm:text-4xl text-primary tracking-tight tech-content leading-none">
            {display}<span className="text-accent/80">+</span>
          </div>
          <div className="font-heading font-bold text-sm text-foreground mt-2">{label}</div>
          <div className="text-[11px] text-muted-foreground font-body mt-0.5 leading-relaxed">{sub}</div>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-5 h-5 text-white drop-shadow" strokeWidth={2.2} />
        </div>
      </div>
      {/* live pulse dot */}
      <div className="relative mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-body">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-success opacity-70 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-success" />
        </span>
        <span className="tracking-wide uppercase">live</span>
      </div>
    </div>
  );
};

const StatsStrip = ({ isRTL }: { isRTL: boolean }) => {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  const { data, isLoading } = useQuery({
    queryKey: ['about-stats'],
    queryFn: async () => {
      const [biz, rev, proj, users] = await Promise.all([
        countActiveBusinesses(),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        countProfiles(),
      ]);
      return { biz: biz.count ?? 0, rev: rev.count ?? 0, proj: proj.count ?? 0, users: users.count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = [
    { icon: Building2, end: data?.biz ?? 0, label: isRTL ? 'مزود خدمة' : 'Providers',
      sub: isRTL ? 'مفعّلون ومتحقَّق منهم' : 'Active & verified',
      accent: 'from-warning to-warning' },
    { icon: Star, end: data?.rev ?? 0, label: isRTL ? 'تقييم' : 'Reviews',
      sub: isRTL ? 'تقييمات حقيقية موثقة' : 'Real verified reviews',
      accent: 'from-success to-success' },
    { icon: FolderOpen, end: data?.proj ?? 0, label: isRTL ? 'مشروع' : 'Projects',
      sub: isRTL ? 'منجزة ومنشورة' : 'Completed & published',
      accent: 'from-info to-info' },
    { icon: Users, end: data?.users ?? 0, label: isRTL ? 'عضو' : 'Members',
      sub: isRTL ? 'يثقون بقِطاعات' : 'Trust Qitaat',
      accent: 'from-secondary to-secondary' },
  ];

  return (
    <section className="relative -mt-14 sm:-mt-20 z-10" aria-label={isRTL ? 'إحصائيات حية' : 'Live statistics'}>
      <div className="container px-4 sm:px-6">
        <div ref={ref} className="relative">
          {/* Glow under the card */}
          <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-warning/10 via-success/10 to-secondary/10 blur-3xl pointer-events-none" />
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-3 sm:p-4 shadow-elev-3">
            {/* Section eyebrow */}
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-2 pb-3 border-b border-border/40 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-xs font-heading font-bold text-foreground">
                  {isRTL ? 'أرقامنا تتحدث' : 'Our Numbers Speak'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-body tech-content">
                {isRTL ? 'محدّث مباشرة' : 'Live updated'}
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {items.map((s, i) => (
                <StatItem
                  key={i}
                  icon={s.icon}
                  end={isLoading ? 0 : s.end}
                  label={s.label}
                  sub={s.sub}
                  accent={s.accent}
                  isVisible={isVisible}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ───────── Mission / Vision / Values ───────── */
const PillarsSection = ({ isRTL }: { isRTL: boolean }) => {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  const pillars = [
    {
      icon: Target,
      title: isRTL ? 'رسالتنا' : 'Our Mission',
      desc: isRTL
        ? 'تمكين قطاع الصناعة العربي عبر منصة موثوقة تجمع المزودين والعملاء في بيئة شفافة، احترافية، ومحمية.'
        : 'Empowering the Arab industrial sector through a trusted platform that connects providers and clients in a transparent, professional, and protected environment.',
      tone: 'from-warning/15 to-warning/5 text-warning dark:text-warning',
    },
    {
      icon: Eye,
      title: isRTL ? 'رؤيتنا' : 'Our Vision',
      desc: isRTL
        ? 'أن نكون البوابة الرقمية الأولى لأعمال الألمنيوم والزجاج والخشب والحديد في الوطن العربي بحلول 2030.'
        : 'To become the leading digital gateway for aluminum, glass, wood, and steel businesses in the Arab world by 2030.',
      tone: 'from-success/15 to-success/5 text-success dark:text-success',
    },
    {
      icon: Heart,
      title: isRTL ? 'قيمنا' : 'Our Values',
      desc: isRTL
        ? 'الثقة، الجودة، الشفافية، والابتكار — أربعة مبادئ تحكم كل قرار وكل ميزة نطلقها.'
        : 'Trust, Quality, Transparency, and Innovation — four principles that guide every decision and feature we ship.',
      tone: 'from-info/15 to-info/5 text-info dark:text-info',
    },
  ];
  return (
    <section className="py-16 sm:py-24" aria-labelledby="pillars-heading">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
          <span className="inline-block text-eyebrow text-accent mb-3">{isRTL ? 'هويّتنا' : 'Our Identity'}</span>
          <h2 id="pillars-heading" className="ds-h2 font-heading font-bold text-foreground mb-3">
            {isRTL ? 'ما الذي يحرّكنا كل يوم' : 'What Drives Us Every Day'}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {isRTL ? 'مبادئ واضحة، أهداف طموحة، وقيم لا نتنازل عنها.' : 'Clear principles, ambitious goals, and values we never compromise on.'}
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <article
                key={i}
                className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 sm:p-8 hover:border-accent/40 hover:shadow-elev-3 transition-all duration-500 ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${p.tone.split(' ').slice(0, 2).join(' ')} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.tone.split(' ').slice(0, 2).join(' ')} flex items-center justify-center mb-5`}>
                    <Icon className={`w-7 h-7 ${p.tone.split(' ').slice(2).join(' ')}`} strokeWidth={2} />
                  </div>
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ───────── Sectors we serve ───────── */
const SectorsSection = ({ isRTL }: { isRTL: boolean }) => {
  const sectors = [
    { ar: 'الألمنيوم', en: 'Aluminum', emoji: '🪟' },
    { ar: 'الزجاج', en: 'Glass', emoji: '🔲' },
    { ar: 'الخشب', en: 'Wood', emoji: '🪵' },
    { ar: 'الحديد والاستيل', en: 'Iron & Steel', emoji: '⚙️' },
    { ar: 'المطابخ والخزائن', en: 'Kitchens & Cabinets', emoji: '🏠' },
    { ar: 'الأبواب والنوافذ', en: 'Doors & Windows', emoji: '🚪' },
  ];
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="inline-block text-eyebrow text-accent mb-3">{isRTL ? 'القطاعات' : 'Sectors'}</span>
          <h2 className="ds-h2 font-heading font-bold text-foreground mb-3">
            {isRTL ? 'القطاعات التي نخدمها' : 'Sectors We Serve'}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {isRTL ? 'تخصص عميق في أكثر من ستة قطاعات صناعية متكاملة.' : 'Deep specialization across six interconnected industrial sectors.'}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {sectors.map((s, i) => (
            <div key={i} className="group bg-card border border-border/40 rounded-2xl p-5 text-center hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{s.emoji}</div>
              <div className="font-heading font-bold text-sm text-foreground">{isRTL ? s.ar : s.en}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────── Journey / Timeline ───────── */
type JourneyStep = {
  icon: React.ElementType; year: string; title: string; desc: string;
  highlights: string[]; status: 'done' | 'live' | 'next';
  accent: string;
};

const JourneySection = ({ isRTL }: { isRTL: boolean }) => {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  const steps: JourneyStep[] = [
    {
      icon: Lightbulb, year: '2023',
      title: isRTL ? 'الفكرة والبحث' : 'Idea & Research',
      desc: isRTL ? 'دراسة عميقة للسوق وتحديد فجوة الثقة بين العملاء ومزودي الخدمة.' : 'Deep market study identifying the trust gap between clients and providers.',
      highlights: isRTL ? ['أبحاث ميدانية', 'تحليل السوق'] : ['Field research', 'Market analysis'],
      status: 'done', accent: 'from-warning to-warning',
    },
    {
      icon: Layers, year: '2024',
      title: isRTL ? 'إطلاق المنصة' : 'Platform Launch',
      desc: isRTL ? 'انطلاقة قِطاعات مع أكثر من 6 قطاعات صناعية وأدوات احترافية متكاملة.' : 'Qitaat launches with 6+ industrial sectors and integrated tools.',
      highlights: isRTL ? ['6 قطاعات', 'بحث متقدم', 'ملفات احترافية'] : ['6 sectors', 'Advanced search', 'Pro profiles'],
      status: 'done', accent: 'from-success to-success',
    },
    {
      icon: FileSignature, year: '2025',
      title: isRTL ? 'الأدوات الذكية' : 'Smart Tools',
      desc: isRTL ? 'إطلاق العقود المحمية، التقسيط المرن، الضمانات الرقمية، ومحفظة آمنة.' : 'Protected contracts, flexible installments, digital warranties, and secure wallet.',
      highlights: isRTL ? ['عقود محمية', 'تقسيط', 'ضمانات', 'محفظة'] : ['Protected contracts', 'Installments', 'Warranties', 'Wallet'],
      status: 'live', accent: 'from-info to-info',
    },
    {
      icon: Rocket, year: '2026',
      title: isRTL ? 'التوسّع والذكاء الاصطناعي' : 'Expansion & AI',
      desc: isRTL ? 'توسع إقليمي، ميزات مدعومة بالذكاء الاصطناعي، وتجربة موحَّدة عبر الأجهزة.' : 'Regional expansion, AI-powered features, and a unified cross-device experience.',
      highlights: isRTL ? ['توسع إقليمي', 'ذكاء اصطناعي', 'تطبيقات الجوال'] : ['Regional rollout', 'AI features', 'Mobile apps'],
      status: 'next', accent: 'from-secondary to-secondary',
    },
  ];

  const statusLabel = (s: JourneyStep['status']) => {
    if (s === 'done') return isRTL ? 'مكتمل' : 'Completed';
    if (s === 'live') return isRTL ? 'جارٍ الآن' : 'In progress';
    return isRTL ? 'قادم' : 'Upcoming';
  };
  const statusClasses = (s: JourneyStep['status']) =>
    s === 'done' ? 'bg-success/15 text-success dark:text-success border-success/30'
      : s === 'live' ? 'bg-info/15 text-info dark:text-info border-info/30'
      : 'bg-muted text-muted-foreground border-border';

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden" aria-labelledby="journey-heading">
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(hsl(var(--accent)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="container px-4 sm:px-6 relative">
        <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
          <span className="inline-block text-eyebrow text-accent mb-3">{isRTL ? 'رحلتنا' : 'Our Journey'}</span>
          <h2 id="journey-heading" className="ds-h2 font-heading font-bold text-foreground mb-3">
            {isRTL ? 'من فكرة إلى منصّة رائدة' : 'From an Idea to a Leading Platform'}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {isRTL ? 'كل مرحلة بُنيت على ثقة عملائنا وتعاون مزوّدينا.' : 'Every milestone built on customer trust and provider collaboration.'}
          </p>
        </div>

        <div ref={ref} className="relative max-w-5xl mx-auto">
          {/* Vertical spine */}
          <div className="absolute top-0 bottom-0 start-7 sm:start-1/2 w-[2px] bg-gradient-to-b from-transparent via-border to-transparent sm:-translate-x-1/2" aria-hidden />

          <div className="space-y-6 sm:space-y-10">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const onLeft = i % 2 === 0; // visual side on desktop
              return (
                <div
                  key={i}
                  className={`relative grid sm:grid-cols-2 gap-4 sm:gap-10 items-center ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
                  style={{ animationDelay: `${i * 140}ms`, animationFillMode: 'both' }}
                >
                  {/* Marker */}
                  <div className="absolute start-7 sm:start-1/2 sm:-translate-x-1/2 -translate-y-0 top-6 sm:top-1/2 sm:-translate-y-1/2 z-10">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.accent} ring-4 ring-background flex items-center justify-center shadow-lg`}>
                      <Icon className="w-4 h-4 text-white" strokeWidth={2.4} />
                    </div>
                    {s.status === 'live' && (
                      <span className="absolute inset-0 rounded-full bg-info/30 animate-ping" aria-hidden />
                    )}
                  </div>

                  {/* Card placement */}
                  <div className={`ps-20 sm:ps-0 ${onLeft ? 'sm:col-start-1 sm:pe-10 sm:text-end' : 'sm:col-start-2 sm:ps-10 sm:text-start'}`}>
                    <article className="group bg-card border border-border/50 rounded-2xl p-5 sm:p-6 hover:border-accent/40 hover:shadow-elev-3 hover:-translate-y-0.5 transition-all duration-300">
                      <div className={`flex items-center gap-2 mb-3 ${onLeft ? 'sm:justify-end' : 'sm:justify-start'}`}>
                        <span className="font-heading font-black text-2xl sm:text-3xl text-primary tech-content leading-none">{s.year}</span>
                        <span className={`text-[10px] font-body font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusClasses(s.status)}`}>
                          {statusLabel(s.status)}
                        </span>
                      </div>
                      <h3 className="font-heading font-bold text-base sm:text-lg text-foreground mb-1.5">{s.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
                      <ul className={`flex flex-wrap gap-1.5 ${onLeft ? 'sm:justify-end' : 'sm:justify-start'}`}>
                        {s.highlights.map((h, k) => (
                          <li key={k} className="inline-flex items-center gap-1 text-[11px] font-body font-medium text-foreground/80 bg-muted/60 border border-border/50 rounded-full px-2.5 py-1">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>
                  {/* Spacer column for opposite side on desktop */}
                  <div className="hidden sm:block" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ───────── Trust / Promises ───────── */
const PromisesSection = ({ isRTL }: { isRTL: boolean }) => {
  const items = [
    { icon: ShieldCheck, t: isRTL ? 'بيئة موثوقة' : 'Trusted Environment', d: isRTL ? 'كل مزود خدمة مفعّل لديه سجل تجاري نشط ومُتحقَّق منه.' : 'Every active provider holds a verified commercial registration.' },
    { icon: Wallet, t: isRTL ? 'دفع محمي' : 'Protected Payments', d: isRTL ? 'محفظة رقمية وعقود تحمي حق الطرفين في كل مرحلة.' : 'A digital wallet and contracts that protect both parties at every stage.' },
    { icon: Handshake, t: isRTL ? 'تواصل مباشر' : 'Direct Contact', d: isRTL ? 'لا وسطاء ولا عمولات خفيّة بينك وبين مزود الخدمة.' : 'No middlemen, no hidden commissions between you and the provider.' },
    { icon: BadgeCheck, t: isRTL ? 'ضمانات حقيقية' : 'Real Warranties', d: isRTL ? 'تتبّع رقمي للضمانات وقابلية التحقق منها في أي وقت.' : 'Digital warranty tracking that you can verify any time.' },
  ];
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="inline-block text-eyebrow text-accent mb-3">{isRTL ? 'وعودنا' : 'Our Promises'}</span>
          <h2 className="ds-h2 font-heading font-bold text-foreground mb-3">
            {isRTL ? 'لماذا يثق العملاء بقِطاعات' : 'Why Customers Trust Qitaat'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 hover:border-accent/40 hover:shadow-lg transition-all">
                <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-success dark:text-success" />
                </div>
                <h3 className="font-heading font-bold text-sm text-foreground mb-1.5">{it.t}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{it.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ───────── Contact card ───────── */
const ContactCTA = ({ isRTL }: { isRTL: boolean }) => {
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <section className="py-16 sm:py-24">
      <div className="container px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-navy-light text-primary-foreground p-8 sm:p-14">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -end-20 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute -bottom-24 -start-24 w-96 h-96 rounded-full bg-accent/15 blur-3xl" />
          </div>
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-heading font-black text-2xl sm:text-4xl mb-3 leading-tight">
                {isRTL ? 'هل لديك سؤال أو فكرة شراكة؟' : 'Have a question or partnership idea?'}
              </h2>
              <p className="text-primary-foreground/70 text-sm sm:text-base leading-relaxed">
                {isRTL ? 'فريقنا جاهز للرد على استفساراتك خلال ساعات العمل، ونرحب بفرص التعاون مع الشركاء والمستثمرين.' : 'Our team is ready to answer your questions during working hours, and we welcome partnership and investment opportunities.'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <Button asChild variant="hero" size="lg"><Link to="/contact">{isRTL ? 'صفحة التواصل' : 'Contact Page'} <Arrow className="w-4 h-4" /></Link></Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <a href="mailto:info@qitaat.com" className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all">
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center"><Mail className="w-5 h-5 text-accent" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-primary-foreground/60 font-body">{isRTL ? 'البريد الإلكتروني' : 'Email'}</div>
                  <div className="font-heading font-bold text-sm tech-content truncate">info@qitaat.com</div>
                </div>
              </a>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.06] border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center"><MapPin className="w-5 h-5 text-accent" /></div>
                <div className="flex-1">
                  <div className="text-xs text-primary-foreground/60 font-body">{isRTL ? 'الموقع' : 'Location'}</div>
                  <div className="font-heading font-bold text-sm">{isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const About = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL
      ? 'من نحن — قصة قِطاعات ورؤيتنا للصناعات'
      : 'About Qitaat — Our Story & Industrial Vision',
    description: isRTL
      ? 'قِطاعات: منصة تربط أصحاب المشاريع بأفضل مزودي الألمنيوم والزجاج والحديد والخشب — عقود محمية، تقسيط مرن، وضمانات موثوقة في السعودية والخليج.'
      : 'Qitaat connects project owners with top aluminum, glass, steel and wood providers — protected contracts, flexible installments and trusted reviews across Saudi & Gulf.',
    canonical: 'https://qitaat.com/about',
    ogType: 'website',
    ogImage: 'https://qitaat.com/og-image.jpg',
    ogTitle: isRTL ? 'قِطاعات — منصة قطاعات الصناعة في العالم العربي' : 'Qitaat — Industrial Sectors Platform in the Arab World',
    ogDescription: isRTL
      ? 'تعرّف على رؤية ومسيرة قِطاعات والقطاعات الصناعية التي نخدمها: ألمنيوم، زجاج، حديد، خشب، خزائن وتشطيبات.'
      : 'Discover Qitaat\'s vision and journey across the industrial sectors we serve: aluminum, glass, steel, wood, cabinets and finishes.',
    keywords: isRTL
      ? 'من نحن قِطاعات, منصة الألمنيوم, دليل مزودي الزجاج, شركات الحديد السعودية, ورش الخشب, عقود محمية, ضمان الواجهات, تقسيط الكلادينج, تقييمات صناعية'
      : 'about Qitaat, aluminum platform, glass providers directory, Saudi steel companies, wood workshops, protected contracts, facade warranty, cladding installments, industrial reviews',
  });

  useMultiJsonLd(useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: language === 'ar' ? 'قِطاعات' : 'Qitaat', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'من نحن' : 'About', item: 'https://qitaat.com/about' },
      ],
    };

    const aboutPage = {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      url: 'https://qitaat.com/about',
      inLanguage: language === 'ar' ? 'ar' : 'en',
      name: language === 'ar' ? 'من نحن — قِطاعات' : 'About Us — Qitaat',
      description: language === 'ar'
        ? 'تعرّف على منصة قِطاعات: رؤيتنا، مسيرتنا، والقطاعات الصناعية التي نخدمها.'
        : 'Learn about Qitaat: our vision, journey and the industrial sectors we serve.',
      mainEntity: {
        '@type': 'Organization',
        name: 'قِطاعات Qitaat',
        url: 'https://qitaat.com',
        logo: 'https://qitaat.com/og-image.jpg',
        sameAs: [
          'https://qitaat.lovable.app',
        ],
      },
    };

    const organization = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://qitaat.com/#organization',
      name: 'قِطاعات Qitaat',
      alternateName: 'Qitaat',
      url: 'https://qitaat.com',
      logo: { '@type': 'ImageObject', url: 'https://qitaat.com/og-image.jpg' },
      description: language === 'ar'
        ? 'منصة قطاعات الصناعة العربية: ألمنيوم، زجاج، حديد، خشب وخزائن.'
        : 'Arabic industrial sectors platform: aluminum, glass, steel, wood and cabinets.',
      areaServed: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
      knowsAbout: language === 'ar'
        ? ['الألمنيوم', 'الزجاج', 'الحديد', 'الخشب', 'الخزائن', 'الكلادينج', 'الواجهات', 'النوافذ']
        : ['Aluminum', 'Glass', 'Steel', 'Wood', 'Cabinets', 'Cladding', 'Facades', 'Windows'],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'info@qitaat.com',
        contactType: 'customer support',
        availableLanguage: ['Arabic', 'English'],
      },
    };

    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: language === 'ar' ? 'ما هي منصة قِطاعات؟' : 'What is Qitaat?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar'
              ? 'قِطاعات هي المنصة الأولى المتخصصة في قطاع الألمنيوم والحديد والزجاج والخشب في العالم العربي. نربط بين أصحاب المشاريع ومزودي الخدمات بطريقة احترافية وآمنة.'
              : 'Qitaat is the first platform specializing in the aluminum, iron, glass and wood sector in the Arab world, connecting project owners with service providers.',
          },
        },
        {
          '@type': 'Question',
          name: language === 'ar' ? 'ما هي الأدوات التي توفرها قِطاعات؟' : 'What tools does Qitaat provide?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar'
              ? 'نوفر أدوات متكاملة تشمل: نظام عقود محمية، تقسيط مرن، ضمانات، تقييمات حقيقية، ومقارنة بين المزودين لمساعدتك في اتخاذ القرار الأفضل.'
              : 'We provide integrated tools including protected contracts, flexible installments, warranties, real reviews, and provider comparison.',
          },
        },
        {
          '@type': 'Question',
          name: language === 'ar' ? 'أين يقع مقر قِطاعات؟' : 'Where is Qitaat located?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia',
          },
        },
        {
          '@type': 'Question',
          name: language === 'ar' ? 'كيف أتواصل مع قِطاعات؟' : 'How can I contact Qitaat?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar' ? 'يمكنك التواصل عبر البريد الإلكتروني info@qitaat.com أو من خلال صفحة التواصل في الموقع.' : 'You can contact us via email at info@qitaat.com or through the contact page.',
          },
        },
      ],
    };

    return [breadcrumb, aboutPage, organization, faqPage];
  }, [language]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <AboutHero isRTL={isRTL} />
        <StatsStrip isRTL={isRTL} />
        <PillarsSection isRTL={isRTL} />
        <SectorsSection isRTL={isRTL} />
        <WhyQitaatSection variant="about" />
        <JourneySection isRTL={isRTL} />
        <PromisesSection isRTL={isRTL} />
        <ContactCTA isRTL={isRTL} />
      </main>
      <Footer />
    </div>
  );
};

export default About;
