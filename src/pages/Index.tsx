import { Search, Star, Shield, FileText, CreditCard, Users, Award, Video, Wrench, BarChart3, Building2, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-gold/20">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
            <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-primary-foreground leading-none">فنيين</h1>
            <span className="text-xs text-gold font-body">Faneen</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 font-body text-sm text-primary-foreground/80">
          <Link to="/search" className="hover:text-gold transition-colors flex items-center gap-1">
            <Search className="w-4 h-4" />
            {t('search.page_title')}
          </Link>
          <a href="#categories" className="hover:text-gold transition-colors">{t('nav.sections')}</a>
          <a href="#features" className="hover:text-gold transition-colors">{t('nav.features')}</a>
          <a href="#providers" className="hover:text-gold transition-colors">{t('nav.providers')}</a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="text-xs text-primary-foreground/60 hover:text-gold transition-colors px-2 py-1 rounded border border-primary-foreground/20"
          >
            {t('nav.language')}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="hero" size="sm">{t('dashboard.overview')}</Button>
              </Link>
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm" onClick={signOut}>
                {t('auth.logout')}
              </Button>
            </div>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" size="sm">
                  {t('nav.register')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <img src={heroBg} alt="أعمال الألمنيوم والحديد والزجاج والخشب" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-navy opacity-85" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 35% 10% / 0.3) 0%, hsl(220 35% 10% / 0.9) 100%)" }} />
      <div className="relative z-10 container text-center px-4 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/10 mb-8">
          <Star className="w-4 h-4 text-gold" />
          <span className="text-sm font-body text-gold">{t('hero.badge')}</span>
        </div>
        <h2 className="font-heading font-black text-4xl md:text-6xl lg:text-7xl text-primary-foreground leading-tight mb-6">
          {t('hero.title1')}
          <br />
          <span className="text-gradient-gold">{t('hero.title2')}</span>
        </h2>
        <p className="font-body text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('hero.desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link to="/search">
            <Button variant="hero" size="lg" className="text-base px-10 py-6">
              <Search className="w-5 h-5 ml-2" />
              {t('hero.search')}
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="heroOutline" size="lg" className="text-base px-10 py-6">
              {t('hero.provider')}
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 text-primary-foreground/60 font-body text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold" />
            <span>{t('hero.providers_count')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-gold" />
            <span>{t('hero.reviews_count')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            <span>{t('hero.protection')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const CategoriesSection = () => {
  const { t } = useLanguage();

  const categories = [
    { icon: Layers, titleKey: 'cat.aluminum' as const, descKey: 'cat.aluminum.desc' as const, color: "from-blue-500/20 to-blue-600/5" },
    { icon: Shield, titleKey: 'cat.iron' as const, descKey: 'cat.iron.desc' as const, color: "from-slate-500/20 to-slate-600/5" },
    { icon: Layers, titleKey: 'cat.glass' as const, descKey: 'cat.glass.desc' as const, color: "from-cyan-500/20 to-cyan-600/5" },
    { icon: Building2, titleKey: 'cat.wood' as const, descKey: 'cat.wood.desc' as const, color: "from-amber-500/20 to-amber-600/5" },
    { icon: Wrench, titleKey: 'cat.accessories' as const, descKey: 'cat.accessories.desc' as const, color: "from-rose-500/20 to-rose-600/5" },
    { icon: Users, titleKey: 'cat.designers' as const, descKey: 'cat.designers.desc' as const, color: "from-violet-500/20 to-violet-600/5" },
  ];

  return (
    <section id="categories" className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-body text-gold font-semibold tracking-wider">{t('categories.label')}</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">{t('categories.title')}</h2>
          <p className="font-body text-muted-foreground mt-4 max-w-xl mx-auto">{t('categories.desc')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <div
              key={cat.titleKey}
              className="group relative p-8 rounded-2xl bg-card border border-border hover:border-gold/40 transition-all duration-500 cursor-pointer"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <cat.icon className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-xl text-card-foreground mb-2">{t(cat.titleKey)}</h3>
                <p className="font-body text-muted-foreground text-sm">{t(cat.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    { icon: Search, titleKey: 'feat.search' as const, descKey: 'feat.search.desc' as const },
    { icon: Star, titleKey: 'feat.reviews' as const, descKey: 'feat.reviews.desc' as const },
    { icon: FileText, titleKey: 'feat.contracts' as const, descKey: 'feat.contracts.desc' as const },
    { icon: CreditCard, titleKey: 'feat.installments' as const, descKey: 'feat.installments.desc' as const },
    { icon: Shield, titleKey: 'feat.warranty' as const, descKey: 'feat.warranty.desc' as const },
    { icon: Award, titleKey: 'feat.certified' as const, descKey: 'feat.certified.desc' as const },
    { icon: Video, titleKey: 'feat.gallery' as const, descKey: 'feat.gallery.desc' as const },
    { icon: BarChart3, titleKey: 'feat.analytics' as const, descKey: 'feat.analytics.desc' as const },
  ];

  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-body text-gold font-semibold">{t('features.label')}</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">{t('features.title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <div key={feat.titleKey} className="p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:border-gold/30 transition-all duration-300 group" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gradient-gold transition-all duration-300">
                <feat.icon className="w-6 h-6 text-gold group-hover:text-secondary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-heading font-bold text-foreground mb-2">{t(feat.titleKey)}</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{t(feat.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SearchSection = () => {
  const { t } = useLanguage();
  const tags = ['cat.aluminum', 'cat.iron', 'cat.glass', 'cat.wood', 'cat.accessories', 'cat.designers'] as const;

  return (
    <section className="py-24 bg-gradient-navy relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(42 85% 55% / 0.3) 0%, transparent 50%)" }} />
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-foreground mb-6">{t('search.title')}</h2>
          <p className="font-body text-primary-foreground/60 mb-10">{t('search.desc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-primary-foreground/10 border border-gold/20">
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/40" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                className="w-full pr-12 pl-4 py-4 rounded-xl bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <Button variant="hero" size="lg" className="px-8">
              {t('search.btn')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 rounded-full text-xs font-body text-gold border border-gold/30 hover:bg-gold/10 cursor-pointer transition-colors">
                {t(tag)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const MembershipSection = () => {
  const { t, language } = useLanguage();

  const memberships = [
    {
      titleKey: 'membership.individual' as const,
      descKey: 'membership.individual.desc' as const,
      features: [
        { ar: 'تصفح وبحث', en: 'Browse & Search' },
        { ar: 'تقييمات ومراجعات', en: 'Ratings & Reviews' },
        { ar: 'طلب عروض أسعار', en: 'Request Quotes' },
        { ar: 'سجل الأعمال', en: 'Work History' },
      ],
    },
    {
      titleKey: 'membership.business' as const,
      descKey: 'membership.business.desc' as const,
      featured: true,
      features: [
        { ar: 'صفحة تعريفية', en: 'Profile Page' },
        { ar: 'معرض أعمال', en: 'Work Gallery' },
        { ar: 'استقبال طلبات', en: 'Receive Requests' },
        { ar: 'عقود إلكترونية', en: 'E-Contracts' },
        { ar: 'إعلانات مميزة', en: 'Featured Ads' },
      ],
    },
    {
      titleKey: 'membership.company' as const,
      descKey: 'membership.company.desc' as const,
      features: [
        { ar: 'كل مميزات الأعمال', en: 'All Business Features' },
        { ar: 'تحليلات متقدمة', en: 'Advanced Analytics' },
        { ar: 'أولوية ظهور', en: 'Priority Listing' },
        { ar: 'دعم مخصص', en: 'Dedicated Support' },
        { ar: 'تقارير أداء', en: 'Performance Reports' },
      ],
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-body text-gold font-semibold">{t('membership.label')}</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">{t('membership.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {memberships.map(plan => (
            <div key={plan.titleKey} className={`relative p-8 rounded-2xl border transition-all duration-300 ${plan.featured ? "bg-gradient-navy border-gold/40 scale-105 shadow-gold" : "bg-card border-border hover:border-gold/30"}`}>
              {plan.featured && (
                <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1 rounded-full bg-gradient-gold text-xs font-heading font-bold text-secondary-foreground">
                  {t('membership.popular')}
                </div>
              )}
              <h3 className={`font-heading font-bold text-2xl mb-2 ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}>{t(plan.titleKey)}</h3>
              <p className={`font-body text-sm mb-6 ${plan.featured ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{t(plan.descKey)}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f.en} className={`flex items-center gap-2 font-body text-sm ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                    {language === 'ar' ? f.ar : f.en}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button variant={plan.featured ? "hero" : "outline"} className="w-full">
                  {t('membership.start')}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  const { t } = useLanguage();
  const stats = [
    { value: "2,500+", labelKey: 'stats.providers' as const },
    { value: "15,000+", labelKey: 'stats.reviews' as const },
    { value: "8,200+", labelKey: 'stats.projects' as const },
    { value: "98%", labelKey: 'stats.satisfaction' as const },
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.labelKey} className="text-center">
              <div className="font-heading font-black text-3xl md:text-4xl text-gradient-gold mb-2">{stat.value}</div>
              <div className="font-body text-sm text-muted-foreground">{t(stat.labelKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-primary py-16">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
                <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-primary-foreground">فنيين</h3>
                <span className="text-xs text-gold font-body">Faneen.com</span>
              </div>
            </div>
            <p className="font-body text-sm text-primary-foreground/50 leading-relaxed">{t('footer.desc')}</p>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4">{t('footer.sections')}</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.aluminum')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.iron')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.glass')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.wood')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.contracts')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.installments')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.warranties')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.ads')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.support')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.partnerships')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.privacy')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.terms')}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-6 text-center">
          <p className="font-body text-xs text-primary-foreground/30">{t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};

// Need to use language in MembershipSection
const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <FeaturesSection />
      <SearchSection />
      <MembershipSection />
      <Footer />
    </div>
  );
};

export default Index;
