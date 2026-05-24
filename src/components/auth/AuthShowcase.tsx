import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Shield, Users, Award } from 'lucide-react';

/**
 * Industrial showcase panel for the auth split layout.
 * No raster images — pure SVG + CSS so it's lightweight, themable, and crisp.
 * Uses brand tokens: primary (industrial green), secondary (structural blue),
 * accent (industrial orange).
 */
const SECTORS = [
  { ar: 'الألمنيوم', en: 'Aluminum', token: 'primary' },
  { ar: 'الزجاج', en: 'Glass', token: 'secondary' },
  { ar: 'الحديد', en: 'Steel', token: 'accent' },
  { ar: 'الأخشاب', en: 'Wood', token: 'gold' },
] as const;

const STATS = [
  { icon: Users, ar: '+5,000 مزوّد معتمد', en: '5,000+ verified providers' },
  { icon: Award, ar: '+10,000 مشروع منفّذ', en: '10,000+ projects delivered' },
  { icon: Shield, ar: 'حماية وضمان جودة', en: 'Quality & escrow guarantee' },
];

export const AuthShowcase: React.FC = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="relative w-full h-full overflow-hidden bg-[hsl(var(--navy))] text-white">
      {/* Blueprint grid backdrop */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern id="blueprint" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="hsl(var(--brand-blue-light))" strokeWidth="0.6" />
          </pattern>
          <pattern id="blueprintMajor" width="240" height="240" patternUnits="userSpaceOnUse">
            <path d="M240 0H0V240" fill="none" stroke="hsl(var(--brand-blue-light))" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprint)" />
        <rect width="100%" height="100%" fill="url(#blueprintMajor)" />
      </svg>

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 30% 20%, hsl(var(--primary) / 0.25) 0%, transparent 55%), radial-gradient(80% 60% at 80% 90%, hsl(var(--secondary) / 0.30) 0%, transparent 60%)',
        }}
      />

      {/* Animated orange accent bar (industrial caution stripe) */}
      <div className="absolute top-0 inset-x-0 h-1 overflow-hidden">
        <div
          className="h-full w-[200%] animate-[stripe_8s_linear_infinite]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, hsl(var(--accent)) 0 14px, transparent 14px 28px)',
          }}
        />
      </div>

      <div className="relative h-full flex flex-col p-10 lg:p-14">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity self-start">
          <BrandLogo variant="full" tone="dark" size="auth" priority alt="قِطاعات — Qitaat" />
        </Link>

        {/* Headline + sector blueprint */}
        <div className="flex-1 flex flex-col justify-center gap-10 max-w-xl">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-[hsl(var(--accent))]">
              <span className="w-6 h-px bg-[hsl(var(--accent))]" />
              {isRTL ? 'منصة القطاعات الصناعية' : 'Industrial Sectors Platform'}
            </p>
            <h2 className="font-heading font-bold leading-[1.1] tracking-tight text-[clamp(2rem,3.5vw,3rem)]">
              {isRTL ? (
                <>
                  دليلك الموحّد لكل <br />
                  <span className="text-[hsl(var(--primary))]">قطاع صناعي</span>
                </>
              ) : (
                <>
                  Your unified directory for every <br />
                  <span className="text-[hsl(var(--primary))]">industrial sector</span>
                </>
              )}
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed max-w-md">
              {isRTL
                ? 'موردون، مقاولون، عقود رقمية، ومدفوعات آمنة — كل ما يحتاجه مشروعك في مكان واحد.'
                : 'Suppliers, contractors, digital contracts and secure payments — everything your project needs, in one place.'}
            </p>
          </div>

          {/* Sector blueprint card */}
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                QTAT · BLUEPRINT · v1.0
              </span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--secondary))]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SECTORS.map((s, i) => (
                <div
                  key={s.en}
                  className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-4 overflow-hidden transition-all duration-500 hover:bg-white/[0.06] hover:border-white/20"
                  style={{ animation: `auth-rise 700ms ${i * 80}ms both` }}
                >
                  <div
                    className="absolute -inset-px rounded-xl opacity-30 blur-xl"
                    style={{ background: `hsl(var(--${s.token}) / 0.35)` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div
                        className="w-2 h-2 rounded-full mb-3"
                        style={{ background: `hsl(var(--${s.token}))` }}
                      />
                      <p className="text-sm font-semibold text-white">
                        {isRTL ? s.ar : s.en}
                      </p>
                      <p className="text-[10px] text-white/40 font-mono mt-0.5">
                        SECTOR · 0{i + 1}
                      </p>
                    </div>
                    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="opacity-60">
                      <rect
                        x="6" y="6" width="30" height="30" rx="4"
                        stroke={`hsl(var(--${s.token}))`} strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />
                      <rect
                        x="14" y="14" width="14" height="14" rx="2"
                        fill={`hsl(var(--${s.token}) / 0.25)`}
                        stroke={`hsl(var(--${s.token}))`} strokeWidth="1"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats footer */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
          {STATS.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-[hsl(var(--primary))]" strokeWidth={2} />
              </div>
              <p className="text-[11px] text-white/65 leading-tight pt-1">
                {isRTL ? s.ar : s.en}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};