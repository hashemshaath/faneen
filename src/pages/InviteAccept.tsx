/**
 * CT4C.4 — Public client invitation acceptance page.
 *
 * Flow:
 *  - Reads `:token` from the URL.
 *  - If unauthenticated → shows secure landing with Login / Register CTAs.
 *    Stashes the raw token in sessionStorage so /auth can redirect back.
 *  - If authenticated → calls `accept_client_invitation(_token)` RPC.
 *  - Maps Postgres errors to friendly bilingual messages.
 *  - Never displays the raw token, draft_payload, or contract amounts.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { acceptClientInvitation, signOutCurrentUser } from '@/modules/identity';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/common/BrandLogo';

type AcceptResult = {
  accepted: boolean;
  invite_id: string;
  ref_id: string;
  draft_payload_ready: boolean;
  bound_contract_id: string | null;
};

type ErrorKey =
  | 'invalid_token'
  | 'not_found'
  | 'expired'
  | 'already_accepted'
  | 'cancelled'
  | 'email_mismatch'
  | 'auth_required'
  | 'unknown';

const PENDING_KEY = 'qitaat_pending_invite_token';

function classifyError(message: string): ErrorKey {
  const m = (message || '').toLowerCase();
  if (m.includes('auth_required')) return 'auth_required';
  if (m.includes('invalid_token')) return 'invalid_token';
  if (m.includes('not_found')) return 'not_found';
  if (m.includes('expired')) return 'expired';
  if (m.includes('email_mismatch')) return 'email_mismatch';
  if (m.includes('invalid_status')) return 'already_accepted';
  return 'unknown';
}

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [errorKey, setErrorKey] = useState<ErrorKey>('unknown');
  const attemptedRef = useRef(false);

  usePageMeta({
    title: bi('قبول دعوة العقد | قِطاعات', 'Accept Contract Invitation | Qitaat'),
    description: bi(
      'صفحة قبول دعوة عقد آمنة من منصة قِطاعات.',
      'Securely accept your contract invitation on Qitaat.',
    ),
  });
  useNoIndex();

  // Auto-attempt acceptance once authenticated.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    setStatus('accepting');
    (async () => {
      const { data, error } = await acceptClientInvitation({ _token: token });
      if (error) {
        setErrorKey(classifyError(error.message));
        setStatus('error');
        return;
      }
      try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
      setResult(data as unknown as AcceptResult);
      setStatus('success');
    })();
  }, [user, authLoading, token]);

  const stashAndGo = (mode: 'login' | 'register') => {
    try { if (token) sessionStorage.setItem(PENDING_KEY, token); } catch { /* ignore */ }
    navigate(`/auth?mode=${mode}`);
  };

  if (!token) {
    return (
      <Shell isRTL={isRTL}>
        <ErrorCard
          title={bi('رابط غير صالح', 'Invalid link')}
          message={bi('رابط الدعوة غير صالح.', 'This invitation link is invalid.')}
        />
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell isRTL={isRTL}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  // Unauthenticated → landing
  if (!user) {
    return (
      <Shell isRTL={isRTL}>
        <Card className="border-border/60">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">
              {bi('لقد تلقيت دعوة عقد', 'You have a contract invitation')}
            </CardTitle>
            <CardDescription>
              {bi(
                'للمتابعة، سجّل الدخول أو أنشئ حسابًا بنفس البريد الذي استلم الدعوة.',
                'To continue, sign in or create an account using the same email that received the invitation.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full h-12" onClick={() => stashAndGo('login')}>
              <LogIn className="h-4 w-4 me-2" />
              {bi('تسجيل الدخول', 'Sign in')}
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => stashAndGo('register')}>
              <UserPlus className="h-4 w-4 me-2" />
              {bi('إنشاء حساب', 'Create account')}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              {bi(
                'لن يتم عرض تفاصيل العقد قبل قبول الدعوة.',
                'Contract details remain private until the invitation is accepted.',
              )}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Authenticated states
  if (status === 'accepting' || status === 'idle') {
    return (
      <Shell isRTL={isRTL}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {bi('جارٍ قبول الدعوة...', 'Accepting invitation...')}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (status === 'success' && result) {
    return (
      <Shell isRTL={isRTL}>
        <Card className="border-emerald-500/30">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">
              {bi('تم قبول الدعوة بنجاح', 'Invitation accepted')}
            </CardTitle>
            {result.ref_id ? (
              <CardDescription className="tech-content">
                {bi('رقم الدعوة', 'Invitation ref')}: {result.ref_id}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {result.bound_contract_id ? (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  {bi('تم ربط العقد بحسابك.', 'The contract is now linked to your account.')}
                </p>
                <Button asChild className="w-full h-12">
                  <Link to={`/contracts/${result.bound_contract_id}`}>
                    {bi('عرض العقد', 'View contract')}
                  </Link>
                </Button>
              </>
            ) : result.draft_payload_ready ? (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  {bi(
                    'تم قبول الدعوة بنجاح. سيتمكن المزود من إكمال إصدار العقد.',
                    'Invitation accepted. The provider can now finalise and issue the contract.',
                  )}
                </p>
                <Button asChild variant="outline" className="w-full h-12">
                  <Link to="/dashboard">{bi('الذهاب إلى لوحة التحكم', 'Go to dashboard')}</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  {bi('تم قبول الدعوة بنجاح.', 'Invitation accepted successfully.')}
                </p>
                <Button asChild variant="outline" className="w-full h-12">
                  <Link to="/dashboard">{bi('الذهاب إلى لوحة التحكم', 'Go to dashboard')}</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Error
  const errMsg = (() => {
    switch (errorKey) {
      case 'invalid_token':
      case 'not_found':
        return bi('رابط الدعوة غير صالح.', 'This invitation link is invalid.');
      case 'expired':
        return bi('انتهت صلاحية الدعوة. يرجى طلب دعوة جديدة.', 'This invitation has expired. Please request a new one.');
      case 'already_accepted':
        return bi('تم قبول هذه الدعوة مسبقًا أو لم تعد متاحة.', 'This invitation has already been used or is no longer available.');
      case 'cancelled':
        return bi('لم تعد هذه الدعوة متاحة.', 'This invitation is no longer available.');
      case 'email_mismatch':
        return bi(
          'يجب تسجيل الدخول بنفس البريد الذي استلم الدعوة.',
          'You must sign in using the same email that received the invitation.',
        );
      case 'auth_required':
        return bi('يرجى تسجيل الدخول للمتابعة.', 'Please sign in to continue.');
      default:
        return bi('تعذر قبول الدعوة. حاول مرة أخرى لاحقًا.', 'Could not accept the invitation. Please try again later.');
    }
  })();

  return (
    <Shell isRTL={isRTL}>
      <ErrorCard title={bi('تعذر قبول الدعوة', 'Unable to accept invitation')} message={errMsg}>
        {errorKey === 'email_mismatch' ? (
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={async () => {
              await signOutCurrentUser();
              try { if (token) sessionStorage.setItem(PENDING_KEY, token); } catch { /* ignore */ }
              navigate('/auth?mode=login');
            }}
          >
            {bi('تسجيل الخروج وتسجيل الدخول بحساب آخر', 'Sign out and use another account')}
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full h-12">
            <Link to="/">{bi('العودة للرئيسية', 'Back to home')}</Link>
          </Button>
        )}
      </ErrorCard>
    </Shell>
  );
}

function Shell({ children, isRTL }: { children: React.ReactNode; isRTL: boolean }) {
  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex flex-col items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo variant="mark" tone="auto" size="auth" alt="قِطاعات" />
        </div>
        {children}
      </div>
    </main>
  );
}

function ErrorCard({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-destructive/30">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {children ? <CardContent className="space-y-3">{children}</CardContent> : null}
    </Card>
  );
}