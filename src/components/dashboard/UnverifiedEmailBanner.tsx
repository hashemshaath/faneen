import React from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { isSyntheticPhoneEmail } from '@/lib/auth-email';

/**
 * AUTH-14B · Dashboard unverified-email banner.
 * UI-only — no Supabase resend call (kept out of scope until a vetted
 * resend hook is wired). We instead point the user to check their inbox.
 * Email is shown masked (`a***@domain`) to avoid leaking the full address
 * in shared screens.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? ''}***@${domain}`;
  return `${local.slice(0, 1)}***${local.slice(-1)}@${domain}`;
}

export const UnverifiedEmailBanner: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  if (!user) return null;
  // Supabase phone-only logins use a synthetic `@phone.qitaat.local` email
  // that has no real inbox — never nag the user about confirming it.
  if (!user.email || isSyntheticPhoneEmail(user.email)) return null;
  if (user.email_confirmed_at) return null;

  return (
    <div
      role="status"
      data-testid="dashboard-unverified-email-banner"
      className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 flex items-start gap-3"
    >
      <span className="mt-0.5 inline-flex w-9 h-9 rounded-xl bg-warning/10 text-warning items-center justify-center shrink-0">
        <MailWarning className="w-5 h-5" aria-hidden />
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {isRTL ? 'بريدك غير مفعّل بعد' : 'Your email is not verified yet'}
        </p>
        <p className="text-xs text-muted-foreground">
          {isRTL
            ? 'فعّل بريدك حتى تضمن استلام التنبيهات واستعادة الحساب.'
            : 'Verify your email to receive notifications and recover your account.'}{' '}
          <span className="tech-content">{maskEmail(user.email)}</span>
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          {isRTL
            ? 'تحقق من صندوق الوارد لديك أو مجلد الرسائل غير المرغوب فيها.'
            : 'Check your inbox or spam folder for the verification link.'}
        </p>
      </div>
    </div>
  );
};

export default UnverifiedEmailBanner;