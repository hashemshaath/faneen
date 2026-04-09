import { Search, Star, Shield, FileText, CreditCard, Users, Award, Video, Wrench, BarChart3, Building2, Layers } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";

const Navbar = () => (
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
        <a href="#categories" className="hover:text-gold transition-colors">الأقسام</a>
        <a href="#features" className="hover:text-gold transition-colors">المميزات</a>
        <a href="#providers" className="hover:text-gold transition-colors">مزودي الخدمة</a>
        <a href="#projects" className="hover:text-gold transition-colors">المشاريع</a>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm">
          دخول
        </Button>
        <Button variant="hero" size="sm">
          سجل الآن
        </Button>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
    <img src={heroBg} alt="أعمال الألمنيوم والحديد والزجاج والخشب" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
    <div className="absolute inset-0 bg-gradient-navy opacity-85" />
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 35% 10% / 0.3) 0%, hsl(220 35% 10% / 0.9) 100%)" }} />
    <div className="relative z-10 container text-center px-4 animate-fade-up">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/10 mb-8">
        <Star className="w-4 h-4 text-gold" />
        <span className="text-sm font-body text-gold">المنصة الأولى لأعمال الألمنيوم والحديد والزجاج والخشب</span>
      </div>
      <h1 className="font-heading font-black text-4xl md:text-6xl lg:text-7xl text-primary-foreground leading-tight mb-6">
        دليلك الشامل لعالم
        <br />
        <span className="text-gradient-gold">الصناعات الاحترافية</span>
      </h1>
      <p className="font-body text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 leading-relaxed">
        ابحث عن أفضل المصانع والمحلات، قارن الأسعار، اقرأ التقييمات، وأنجز مشاريعك بحماية كاملة لحقوقك
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <Button variant="hero" size="lg" className="text-base px-10 py-6">
          <Search className="w-5 h-5 ml-2" />
          ابدأ البحث الآن
        </Button>
        <Button variant="heroOutline" size="lg" className="text-base px-10 py-6">
          سجل كمزود خدمة
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-8 text-primary-foreground/60 font-body text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gold" />
          <span>+2,500 مزود خدمة</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-gold" />
          <span>+15,000 تقييم</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          <span>حماية العقود</span>
        </div>
      </div>
    </div>
  </section>
);

const categories = [
  { icon: Layers, title: "الألمنيوم", desc: "نوافذ، أبواب، واجهات، شتر", color: "from-blue-500/20 to-blue-600/5" },
  { icon: Shield, title: "الحديد والاستيل", desc: "أبواب حديد، درابزين، هياكل", color: "from-slate-500/20 to-slate-600/5" },
  { icon: Layers, title: "الزجاج", desc: "زجاج مزدوج، سيكوريت، مرايا", color: "from-cyan-500/20 to-cyan-600/5" },
  { icon: Building2, title: "الخشب والخزائن", desc: "مطابخ، غرف ملابس، أبواب خشب", color: "from-amber-500/20 to-amber-600/5" },
  { icon: Wrench, title: "الاكسسوارات", desc: "مقابض، مفصلات، إغلاقات", color: "from-rose-500/20 to-rose-600/5" },
  { icon: Users, title: "المصممين", desc: "تصميم داخلي، رسومات هندسية", color: "from-violet-500/20 to-violet-600/5" },
];

const CategoriesSection = () => (
  <section id="categories" className="py-24 bg-background">
    <div className="container">
      <div className="text-center mb-16">
        <span className="text-sm font-body text-gold font-semibold tracking-wider">الأقسام الرئيسية</span>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">استكشف جميع التخصصات</h2>
        <p className="font-body text-muted-foreground mt-4 max-w-xl mx-auto">تصفح أقسامنا المتخصصة للعثور على ما تحتاجه بسرعة ودقة</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, i) => (
          <div
            key={cat.title}
            className="group relative p-8 rounded-2xl bg-card border border-border hover:border-gold/40 transition-all duration-500 cursor-pointer"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <cat.icon className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-bold text-xl text-card-foreground mb-2">{cat.title}</h3>
              <p className="font-body text-muted-foreground text-sm">{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const features = [
  { icon: Search, title: "بحث ذكي", desc: "محرك بحث متقدم للعثور على المصانع والمحلات حسب الموقع والتخصص والتقييم" },
  { icon: Star, title: "تقييمات احترافية", desc: "نظام تقييم شامل مع مجتمع توصيات موثوق من العملاء الحقيقيين" },
  { icon: FileText, title: "منصة العقود", desc: "عقود إلكترونية تحمي حقوق البائع والمشتري مع ضمانات واضحة" },
  { icon: CreditCard, title: "خدمات التقسيط", desc: "خيارات تقسيط مرنة حسب توفر الخدمة لدى مزود الخدمة" },
  { icon: Shield, title: "الضمانات", desc: "سجل كامل للضمانات وطلبات الصيانة والدعم الفني" },
  { icon: Award, title: "الجهات المصنفة", desc: "تصنيف احترافي للجهات الحاصلة على شهادات وجوائز الجودة" },
  { icon: Video, title: "معرض الأعمال", desc: "مكتبة شاملة للصور والفيديو والمشاريع المنجزة" },
  { icon: BarChart3, title: "تحليل السوق", desc: "تحليلات متقدمة للقطاعات والأسعار وجودة العمل والمقارنات" },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 bg-muted/50">
    <div className="container">
      <div className="text-center mb-16">
        <span className="text-sm font-body text-gold font-semibold">لماذا فنيين؟</span>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">منصة متكاملة لكل ما تحتاجه</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feat, i) => (
          <div key={feat.title} className="p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:border-gold/30 transition-all duration-300 group" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gradient-gold transition-all duration-300">
              <feat.icon className="w-6 h-6 text-gold group-hover:text-secondary-foreground transition-colors duration-300" />
            </div>
            <h3 className="font-heading font-bold text-foreground mb-2">{feat.title}</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SearchSection = () => (
  <section className="py-24 bg-gradient-navy relative overflow-hidden">
    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(42 85% 55% / 0.3) 0%, transparent 50%)" }} />
    <div className="container relative z-10">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-foreground mb-6">ابحث عن المزود المثالي لمشروعك</h2>
        <p className="font-body text-primary-foreground/60 mb-10">أدخل ما تبحث عنه وسنجد لك أفضل المزودين في منطقتك</p>
        <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-primary-foreground/10 border border-gold/20">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="مثال: نوافذ ألمنيوم، أبواب حديد، مطابخ..."
              className="w-full pr-12 pl-4 py-4 rounded-xl bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/50"
            />
          </div>
          <Button variant="hero" size="lg" className="px-8">
            بحث
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {["ألمنيوم", "حديد", "زجاج", "خشب", "مطابخ", "واجهات"].map(tag => (
            <span key={tag} className="px-4 py-1.5 rounded-full text-xs font-body text-gold border border-gold/30 hover:bg-gold/10 cursor-pointer transition-colors">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const memberships = [
  { title: "أفراد", desc: "للمستخدمين الباحثين عن خدمات", features: ["تصفح وبحث", "تقييمات ومراجعات", "طلب عروض أسعار", "سجل الأعمال"] },
  { title: "أعمال", desc: "للمحلات والمصانع", features: ["صفحة تعريفية", "معرض أعمال", "استقبال طلبات", "عقود إلكترونية", "إعلانات مميزة"], featured: true },
  { title: "شركات", desc: "للشركات والوكالات الكبرى", features: ["كل مميزات الأعمال", "تحليلات متقدمة", "أولوية ظهور", "دعم مخصص", "تقارير أداء"] },
];

const MembershipSection = () => (
  <section className="py-24 bg-background">
    <div className="container">
      <div className="text-center mb-16">
        <span className="text-sm font-body text-gold font-semibold">العضويات</span>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">اختر الخطة المناسبة لك</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {memberships.map(plan => (
          <div key={plan.title} className={`relative p-8 rounded-2xl border transition-all duration-300 ${plan.featured ? "bg-gradient-navy border-gold/40 scale-105 shadow-gold" : "bg-card border-border hover:border-gold/30"}`}>
            {plan.featured && (
              <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1 rounded-full bg-gradient-gold text-xs font-heading font-bold text-secondary-foreground">
                الأكثر طلباً
              </div>
            )}
            <h3 className={`font-heading font-bold text-2xl mb-2 ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}>{plan.title}</h3>
            <p className={`font-body text-sm mb-6 ${plan.featured ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.desc}</p>
            <ul className="space-y-3 mb-8">
              {plan.features.map(f => (
                <li key={f} className={`flex items-center gap-2 font-body text-sm ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant={plan.featured ? "hero" : "outline"} className="w-full">
              ابدأ الآن
            </Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const stats = [
  { value: "2,500+", label: "مزود خدمة مسجل" },
  { value: "15,000+", label: "تقييم ومراجعة" },
  { value: "8,200+", label: "مشروع منجز" },
  { value: "98%", label: "رضا العملاء" },
];

const StatsSection = () => (
  <section className="py-16 bg-muted/50">
    <div className="container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map(stat => (
          <div key={stat.label} className="text-center">
            <div className="font-heading font-black text-3xl md:text-4xl text-gradient-gold mb-2">{stat.value}</div>
            <div className="font-body text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = () => (
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
          <p className="font-body text-sm text-primary-foreground/50 leading-relaxed">المنصة الأولى والأشمل لأعمال الألمنيوم والحديد والزجاج والخشب في المنطقة العربية</p>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary-foreground mb-4">الأقسام</h4>
          <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
            <li><a href="#" className="hover:text-gold transition-colors">الألمنيوم</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الحديد والاستيل</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الزجاج</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الخشب والخزائن</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary-foreground mb-4">الخدمات</h4>
          <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
            <li><a href="#" className="hover:text-gold transition-colors">منصة العقود</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">التقسيط</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الضمانات</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الإعلانات</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary-foreground mb-4">تواصل معنا</h4>
          <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
            <li><a href="#" className="hover:text-gold transition-colors">الدعم الفني</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الشراكات</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">سياسة الخصوصية</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">الشروط والأحكام</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 pt-6 text-center">
        <p className="font-body text-xs text-primary-foreground/30">© 2026 فنيين Faneen. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  </footer>
);

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
