import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, MapPin, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBi } from '@/components/common/Bilingual';
import { ROUTES } from './_shared';

const FinalCTASection = () => {
  const bi = useBi();
  return (
    <section className="py-14 sm:py-20">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary to-primary text-white shadow-2xl">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div aria-hidden="true" className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />

          <div className="relative px-6 sm:px-12 py-14 sm:py-20 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {bi('ابدأ الآن', 'Get started')}
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-5 leading-[1.1] tracking-tight">
              {bi('ابدأ من المكان الصحيح', 'Start in the right place')}
            </h2>
            <p className="font-body text-base sm:text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-9 leading-relaxed">
              {bi(
                'سواء كنت تبحث عن مزود خدمة، أو تريد إضافة منشأتك، قطاعات تساعدك على الوصول، الظهور، والمقارنة بطريقة أوضح.',
                'Whether you are looking for a provider or adding your business, Qitaat helps you reach, appear and compare more clearly.',
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={ROUTES.quote}>
                <Button size="appLg" className="bg-white text-secondary hover:bg-white/90 gap-2 font-semibold shadow-xl">
                  {bi('اطلب عرض سعر', 'Request a quote')}
                </Button>
              </Link>
              <Link to={ROUTES.signupProvider}>
                <Button size="appLg" variant="outline" className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-secondary gap-2">
                  {bi('أضف منشأتك', 'Add your business')}
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] sm:text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> {bi('مزودون موثّقون', 'Verified providers')}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-300" /> {bi('تغطية متعددة المدن السعودية', 'Coverage across multiple Saudi cities')}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-300" /> {bi('بدون عمولة على العميل', 'No fees for customers')}</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-white/75">
              <Link to="/sectors" className="hover:text-white underline-offset-4 hover:underline">{bi('تصفح القطاعات', 'Browse sectors')}</Link>
              <span className="opacity-40">·</span>
              <Link to="/services" className="hover:text-white underline-offset-4 hover:underline">{bi('استكشف الخدمات', 'Explore services')}</Link>
              <span className="opacity-40">·</span>
              <Link to="/brands" className="hover:text-white underline-offset-4 hover:underline">{bi('العلامات المعتمدة', 'Approved brands')}</Link>
              <span className="opacity-40">·</span>
              <Link to="/showcase" className="hover:text-white underline-offset-4 hover:underline">{bi('معرض الأعمال', 'Showcase')}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { FinalCTASection };
export default FinalCTASection;