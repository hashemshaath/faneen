import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { WhyQitaatSection } from '@/components/home/WhyQitaatSection';
import {
  Mail, MapPin, Sparkles, Target, Eye, Heart, ShieldCheck, Handshake,
  Lightbulb, Gem, Building2, Star, FolderOpen, Users, ArrowLeft, ArrowRight,
  Layers, FileSignature, Wallet, BadgeCheck,
} from 'lucide-react';

/* ───────── Hero ───────── */
const AboutHero = ({ isRTL }: { isRTL: boolean }) => (
  <section className="relative overflow-hidden bg-primary text-primary-foreground pt-28 sm:pt-36 pb-20 sm:pb-28">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-24 -start-24 w-[28rem] h-[28rem] rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-32 -end-24 w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(hsl(var(--gold)) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    </div>
    <div className="container relative px-4 sm:px-6 text-center max-w-3xl">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 backdrop-blur mb-6 animate-fade-in">
        <Sparkles className="w-3.5 h-3.5 text-gold" />
        <span className="text-xs font-body font-medium text-gold">{isRTL ? 'تعرّف على قِطاعات' : 'Get to know Qitaat'}</span>
      </div>
      <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-6xl leading-tight mb-5 tracking-tight">
        {isRTL ? (<>نُعيد تعريف <span className="text-gradient-gold-shimmer">قِطاعات الصناعة</span></>) : (<>Reimagining the <span className="text-gradient-gold-shimmer">Industrial Sectors</span></>)}
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
const StatItem = ({ icon: Icon, end, label, isVisible }: { icon: React.ElementType; end: number; label: string; isVisible: boolean }) => {
  const display = useCountUp(end, isVisible, 1800);
  return (
    <div className="text-center px-2">
      <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 rounded-xl bg-accent/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div className="font-heading font-black text-2xl sm:text-3xl text-gradient-gold tracking-tight tech-content">{display}+</div>
      <div className="text-[11px] sm:text-xs text-muted-foreground font-body mt-0.5">{label}</div>
    </div>
  );
};

const StatsStrip = ({ isRTL }: { isRTL: boolean }) => {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  const { data } = useQuery({
    queryKey: ['about-stats'],
    queryFn: async () => {
      const [biz, rev, proj, users] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      return { biz: biz.count ?? 0, rev: rev.count ?? 0, proj: proj.count ?? 0, users: users.count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  const items = [
    { icon: Building2, end: data?.biz ?? 0, label: isRTL ? 'مزود خدمة' : 'Providers' },
    { icon: Star, end: data?.rev ?? 0, label: isRTL ? 'تقييم' : 'Reviews' },
    { icon: FolderOpen, end: data?.proj ?? 0, label: isRTL ? 'مشروع' : 'Projects' },
    { icon: Users, end: data?.users ?? 0, label: isRTL ? 'عضو' : 'Members' },
  ];
  return (
    <section className="relative -mt-12 sm:-mt-16 z-10">
      <div className="container px-4 sm:px-6">
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-6 shadow-elev-3">
          {items.map((s, i) => (
            <StatItem key={i} icon={s.icon} end={s.end} label={s.label} isVisible={isVisible} />
          ))}
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
      tone: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    },
    {
      icon: Eye,
      title: isRTL ? 'رؤيتنا' : 'Our Vision',
      desc: isRTL
        ? 'أن نكون البوابة الرقمية الأولى لأعمال الألمنيوم والزجاج والخشب والحديد في الوطن العربي بحلول 2030.'
        : 'To become the leading digital gateway for aluminum, glass, wood, and steel businesses in the Arab world by 2030.',
      tone: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Heart,
      title: isRTL ? 'قيمنا' : 'Our Values',
      desc: isRTL
        ? 'الثقة، الجودة، الشفافية، والابتكار — أربعة مبادئ تحكم كل قرار وكل ميزة نطلقها.'
        : 'Trust, Quality, Transparency, and Innovation — four principles that guide every decision and feature we ship.',
      tone: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
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
const JourneySection = ({ isRTL }: { isRTL: boolean }) => {
  const steps = [
    { icon: Lightbulb, year: '2023', title: isRTL ? 'الفكرة' : 'The Idea', desc: isRTL ? 'بدأت قِطاعات كحل لمشكلة حقيقية في ربط العملاء بمزودي خدمة موثوقين.' : 'Qitaat started as a solution to a real problem: connecting clients with trusted providers.' },
    { icon: Layers, year: '2024', title: isRTL ? 'الإطلاق' : 'The Launch', desc: isRTL ? 'إطلاق المنصة بأكثر من 6 قطاعات وأدوات احترافية متكاملة.' : 'Platform launch with 6+ sectors and integrated professional tools.' },
    { icon: FileSignature, year: '2025', title: isRTL ? 'العقود الذكية' : 'Smart Contracts', desc: isRTL ? 'أطلقنا نظام العقود المحمية والدفع بالتقسيط والضمانات.' : 'Launched protected contracts, installment payments, and warranties.' },
    { icon: Gem, year: '2026', title: isRTL ? 'التوسع' : 'Expansion', desc: isRTL ? 'توسع إقليمي وميزات ذكاء اصطناعي وتجربة موحدة.' : 'Regional expansion, AI features, and a unified experience.' },
  ];
  return (
    <section className="py-16 sm:py-24">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <span className="inline-block text-eyebrow text-accent mb-3">{isRTL ? 'رحلتنا' : 'Our Journey'}</span>
          <h2 className="ds-h2 font-heading font-bold text-foreground mb-3">
            {isRTL ? 'من فكرة إلى منصّة رائدة' : 'From an Idea to a Leading Platform'}
          </h2>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute top-0 bottom-0 start-6 sm:start-1/2 w-px bg-gradient-to-b from-accent/40 via-border to-accent/40 sm:-translate-x-1/2" />
          <div className="space-y-8 sm:space-y-12">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const onLeft = i % 2 === 0;
              return (
                <div key={i} className={`relative flex sm:items-center gap-4 ${onLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                  <div className="absolute start-6 sm:start-1/2 w-3 h-3 rounded-full bg-accent ring-4 ring-background sm:-translate-x-1/2 mt-6" />
                  <div className="ps-16 sm:ps-0 sm:w-1/2 sm:px-8">
                    <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 hover:border-accent/40 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-heading font-bold text-accent tech-content">{s.year}</span>
                      </div>
                      <h3 className="font-heading font-bold text-base sm:text-lg text-foreground mb-1">{s.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block sm:w-1/2" />
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
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
            <div className="absolute -top-20 -end-20 w-80 h-80 rounded-full bg-gold/20 blur-3xl" />
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
                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center"><Mail className="w-5 h-5 text-gold" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-primary-foreground/60 font-body">{isRTL ? 'البريد الإلكتروني' : 'Email'}</div>
                  <div className="font-heading font-bold text-sm tech-content truncate">info@qitaat.com</div>
                </div>
              </a>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.06] border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center"><MapPin className="w-5 h-5 text-gold" /></div>
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
    title: isRTL ? 'من نحن - عن منصة قِطاعات | قِطاعات' : 'About Us - Qitaat Platform | Qitaat',
    description: isRTL ? 'تعرف على منصة قِطاعات - المنصة الأولى لدليل أعمال الألمنيوم والحديد والزجاج والخشب في العالم العربي' : 'Learn about Qitaat - the leading business directory for aluminum, iron, glass and wood in the Arab world',
    canonical: 'https://qitaat.com/about',
  });

  useMultiJsonLd(useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'من نحن' : 'About', item: 'https://qitaat.com/about' },
      ],
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

    return [breadcrumb, faqPage];
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
