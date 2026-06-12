import { Link, useLocation } from "react-router-dom";
import { ShieldX, ArrowRight, ArrowLeft, Home, LogIn, RotateCw, Copy, Check, Activity, LifeBuoy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from '@/hooks/usePageMeta';
import { readForbiddenContext } from '@/lib/forbiddenContext';

const Forbidden = () => {
  const { isRTL } = useLanguage();
  const { user, signOut, roles, isAdmin, isProvider, isSuperAdmin, profile } = useAuth();
  const location = useLocation();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const stored = readForbiddenContext();
  // Prefer live auth state; fall back to snapshot stored at the moment of denial.
  const ctx = {
    path: stored?.path ?? location.pathname,
    requiredRole: stored?.requiredRole ?? 'auth',
    roles: roles?.length ? roles : (stored?.roles ?? []),
    isAdmin: isAdmin || !!stored?.isAdmin,
    isProvider: isProvider || !!stored?.isProvider,
    isSuperAdmin: isSuperAdmin || !!stored?.isSuperAdmin,
    accountType: profile?.account_type ?? stored?.accountType ?? null,
    userId: user?.id ?? stored?.userId ?? null,
  };

  const reLogin = async () => {
    try { await signOut(); } catch { /* noop */ }
    window.location.href = `/auth?from=${encodeURIComponent(ctx.path)}`;
  };

  const buildPayload = () => ({
    path: ctx.path,
    requiredRole: ctx.requiredRole,
    roles: ctx.roles,
    isAdmin: ctx.isAdmin,
    isProvider: ctx.isProvider,
    isSuperAdmin: ctx.isSuperAdmin,
    accountType: ctx.accountType,
    user_id: ctx.userId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });

  const contactSupportHref = (() => {
    const payload = buildPayload();
    const subject = isRTL
      ? `طلب دعم: رفض الوصول إلى ${ctx.path}`
      : `Support: Access denied at ${ctx.path}`;
    const intro = isRTL
      ? 'مرحبًا فريق الدعم،\n\nتم رفض وصولي إلى الصفحة التالية. تفاصيل الرفض (JSON) أدناه:\n\n'
      : 'Hello support team,\n\nMy access to the following page was denied. Denial details (JSON) below:\n\n';
    const message = `${intro}\n\u0060\u0060\u0060json\n${JSON.stringify(payload, null, 2)}\n\u0060\u0060\u0060\n`;
    const params = new URLSearchParams({ subject, message });
    if (user?.email) params.set('email', user.email);
    return `/contact?${params.toString()}`;
  })();

  const diagnosticsHref = (() => {
    const params = new URLSearchParams({
      from: ctx.path,
      requiredRole: ctx.requiredRole,
      roles: ctx.roles.join(','),
    });
    if (ctx.userId) params.set('user_id', ctx.userId);
    if (ctx.accountType) params.set('accountType', ctx.accountType);
    return `/dashboard/diagnostics?${params.toString()}`;
  })();

  const [copied, setCopied] = useState(false);
  const copyDetails = async () => {
    const json = JSON.stringify(buildPayload(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast.success(isRTL ? 'تم نسخ التفاصيل' : 'Details copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  usePageMeta({ title: isRTL ? 'غير مصرح' : 'Access Denied', noindex: true });

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-xl w-full space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 dark:bg-destructive/15 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        {/* Error code */}
        <h1 className="font-heading font-black text-7xl sm:text-8xl text-gradient-gold">403</h1>

        {/* Title */}
        <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
          {isRTL ? "غير مصرح لك بالوصول" : "Access Denied"}
        </h2>

        {/* Description */}
        <p className="font-body text-sm sm:text-base text-muted-foreground leading-relaxed">
          {isRTL
            ? "ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مدير النظام."
            : "You don't have the required permissions to access this page. If you believe this is a mistake, please contact the administrator."}
        </p>

        {/* Denial details */}
        <div className="text-start rounded-2xl border border-border/40 bg-card/60 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isRTL ? 'تفاصيل الرفض' : 'Denial details'}
          </p>
          <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">{isRTL ? 'المسار' : 'Path'}</dt>
            <dd className="tech-content font-mono break-all">{ctx.path}</dd>

            <dt className="text-muted-foreground">{isRTL ? 'الدور المطلوب' : 'Required role'}</dt>
            <dd><span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[11px] font-semibold">{ctx.requiredRole}</span></dd>

            <dt className="text-muted-foreground">{isRTL ? 'أدواري الحالية' : 'My roles'}</dt>
            <dd className="flex flex-wrap gap-1">
              {ctx.roles.length === 0 && <span className="text-muted-foreground italic">{isRTL ? 'لا أدوار' : 'none'}</span>}
              {ctx.roles.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-semibold">{r}</span>
              ))}
            </dd>

            <dt className="text-muted-foreground">{isRTL ? 'نوع الحساب' : 'Account type'}</dt>
            <dd className="font-mono text-[11px]">{ctx.accountType ?? '—'}</dd>

            <dt className="text-muted-foreground">isAdmin</dt>
            <dd className="font-mono text-[11px]">{String(ctx.isAdmin)}</dd>
            <dt className="text-muted-foreground">isProvider</dt>
            <dd className="font-mono text-[11px]">{String(ctx.isProvider)}</dd>
            <dt className="text-muted-foreground">isSuperAdmin</dt>
            <dd className="font-mono text-[11px]">{String(ctx.isSuperAdmin)}</dd>

            {ctx.userId && (<>
              <dt className="text-muted-foreground">user_id</dt>
              <dd className="tech-content font-mono text-[10px] break-all">{ctx.userId}</dd>
            </>)}
          </dl>
          <div className="pt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto" onClick={copyDetails}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied
                ? (isRTL ? 'تم النسخ' : 'Copied')
                : (isRTL ? 'نسخ التفاصيل للدعم (JSON)' : 'Copy details for support (JSON)')}
            </Button>
            <Link to={contactSupportHref} className="w-full sm:w-auto">
              <Button size="sm" variant="default" className="gap-2 w-full sm:w-auto">
                <LifeBuoy className="w-3.5 h-3.5" />
                {isRTL ? 'تواصل مع الدعم مع التفاصيل' : 'Contact support with details'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 flex-wrap">
          <Link to="/">
            <Button variant="hero" className="gap-2 shadow-lg shadow-gold/20">
              <Home className="w-4 h-4" />
              {isRTL ? "الصفحة الرئيسية" : "Home Page"}
            </Button>
          </Link>
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="outline" className="gap-2">
                  {isRTL ? "لوحة التحكم" : "Dashboard"}
                  <Arrow className="w-4 h-4" />
                </Button>
              </Link>
              <Link to={diagnosticsHref}>
                <Button variant="outline" className="gap-2">
                  <Activity className="w-4 h-4" />
                  {isRTL ? 'تشخيص حسابي' : 'Account diagnostics'}
                </Button>
              </Link>
              <Button variant="outline" className="gap-2" onClick={reLogin}>
                <RotateCw className="w-4 h-4" />
                {isRTL ? 'إعادة تسجيل الدخول' : 'Re-login'}
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="gap-2">
                <LogIn className="w-4 h-4" />
                {isRTL ? "تسجيل الدخول" : "Sign In"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
