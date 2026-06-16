import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Sparkles, X, ArrowRight, ArrowLeft, ListChecks } from 'lucide-react';

/**
 * ENTITY REGISTRATION SIMPLIFICATION — welcome card.
 *
 * Rendered on top of the dashboard the first time the entity manager
 * lands after registration. Activation flag is `qitaat_entity_welcome`
 * (sessionStorage); the user can dismiss it ("Later") or proceed to the
 * onboarding wizard ("Complete entity details").
 *
 * Pure presentation — no backend writes, no membership/credits side
 * effects. The card disappears once dismissed or once onboarding starts.
 */
const STORAGE_KEY = 'qitaat_entity_welcome';

export const EntityWelcomeCard: React.FC = () => {
  const { isRTL } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') setVisible(true);
    } catch { /* sessionStorage may be unavailable */ }
  }, []);

  if (!visible) return null;

  const ChevronEnd = isRTL ? ArrowLeft : ArrowRight;
  const bi = (ar: string, en: string) => (isRTL ? ar : en);

  const dismiss = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    setVisible(false);
  };

  const steps: Array<{ ar: string; en: string }> = [
    { ar: 'أكمل معلومات الجهة', en: 'Complete the entity information' },
    { ar: 'أضف الخدمات والقطاعات', en: 'Add services and sectors' },
    { ar: 'أضف صور الأعمال أو الشعار', en: 'Add work images or a logo' },
    { ar: 'حدد المدينة ومناطق الخدمة', en: 'Set the city and service areas' },
    { ar: 'أرسل الملف للمراجعة', en: 'Submit the profile for review' },
  ];

  return (
    <section
      data-feature="entity-welcome-card"
      className="relative mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 overflow-hidden"
      aria-labelledby="entity-welcome-title"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={bi('إغلاق', 'Dismiss')}
        className="absolute top-3 end-3 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <h2 id="entity-welcome-title" className="font-heading font-bold text-lg text-foreground">
            {bi('مرحبًا بك في قِطاعات', 'Welcome to Qitaat')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {bi(
              'تم إنشاء حساب الجهة بنجاح. أكمل البيانات الأساسية حتى يتمكن فريق قطاعات من مراجعتها وتجهيز ظهورها للعملاء.',
              'Your entity account was created successfully. Complete the basic details so the Qitaat team can review them and prepare your visibility to clients.',
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {bi('خطوات اكتمال الملف', 'Profile completion steps')}
          </span>
        </div>
        <ol className="space-y-1.5 text-sm" data-feature="entity-welcome-steps">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="inline-flex w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground/85">{bi(s.ar, s.en)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild className="h-11 rounded-xl px-5" onClick={dismiss}>
          <Link to="/onboarding" data-cta="complete-entity">
            {bi('إكمال بيانات الجهة', 'Complete entity details')}
            <ChevronEnd className="w-4 h-4 ms-1" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss} data-cta="later">
          {bi('لاحقًا', 'Later')}
        </Button>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground/80">
        {bi(
          'لن تظهر الجهة للعملاء إلا بعد اكتمال البيانات والمراجعة.',
          'The entity will not appear to clients until details are complete and reviewed.',
        )}
      </p>
    </section>
  );
};

export default EntityWelcomeCard;