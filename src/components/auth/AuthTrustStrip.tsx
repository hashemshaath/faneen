import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ShieldCheck, Lock, LifeBuoy, BookOpen } from 'lucide-react';

/**
 * IDENTITY-UX-REDESIGN-2 — Part K (Trust & Conversion) + Part J (Help).
 *
 * Inline, non-marketing trust signals + help anchors. Rendered under
 * auth forms; no popups, no enumeration oracles, no PII surfaces.
 * Copy is intentionally short and bilingual.
 */
export const AuthTrustStrip: React.FC<{ context?: 'login' | 'register' | 'recovery' | 'invite' }> = ({
  context = 'login',
}) => {
  const { isRTL } = useLanguage();

  const trust = [
    {
      icon: ShieldCheck,
      label: isRTL ? 'تشفير 256-bit' : '256-bit encrypted',
    },
    {
      icon: Lock,
      label: isRTL ? 'خصوصيتك محفوظة' : 'Privacy protected',
    },
  ];

  const help: { href: string; label: string; icon: typeof BookOpen }[] = [];
  if (context === 'login' || context === 'recovery') {
    help.push({
      href: '/help/login-issues',
      label: isRTL ? 'مشاكل تسجيل الدخول' : 'Login issues',
      icon: BookOpen,
    });
  }
  if (context === 'register') {
    help.push({
      href: '/help/creating-a-business',
      label: isRTL ? 'كيف أنشئ نشاطاً تجارياً؟' : 'Creating a business',
      icon: BookOpen,
    });
    help.push({
      href: '/help/joining-a-business',
      label: isRTL ? 'الانضمام لنشاط قائم' : 'Joining a business',
      icon: BookOpen,
    });
  }
  if (context === 'invite') {
    help.push({
      href: '/help/invitations',
      label: isRTL ? 'كيف تعمل الدعوات' : 'How invitations work',
      icon: BookOpen,
    });
  }
  help.push({
    href: '/contact',
    label: isRTL ? 'تواصل مع الدعم' : 'Contact support',
    icon: LifeBuoy,
  });

  return (
    <div className="mt-6 space-y-3" data-testid="auth-trust-strip">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {trust.map((t, i) => {
          const Icon = t.icon;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70"
            >
              <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
              {t.label}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {help.map((h, i) => {
          const Icon = h.icon;
          return (
            <a
              key={i}
              href={h.href}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent transition-colors"
            >
              <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
              {h.label}
            </a>
          );
        })}
      </div>
    </div>
  );
};