import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { IdentitySignInForm } from '@/components/auth/IdentitySignInForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { RegistrationSuccessView } from '@/components/auth/RegistrationSuccessView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { AuthMode } from '@/services/auth/types';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { redirectByRole } = useRoleRedirect();

  // 'identity' = new unified entry (default). 'login' / 'register' kept as
  // advanced fallbacks for password-based flows and business multi-step signup.
  const initialMode = (searchParams.get('mode') as AuthMode | 'identity') || 'identity';
  const [mode, setMode] = useState<AuthMode | 'identity'>(
    (['identity', 'login', 'register', 'forgot-password'] as const).includes(initialMode as never)
      ? (initialMode as AuthMode | 'identity')
      : 'identity',
  );
  const [sentEmail, setSentEmail] = useState('');
  const redirectedRef = useRef(false);

  usePageMeta({
    title: mode === 'register' ? 'إنشاء حساب | قِطاعات' : 'تسجيل الدخول | قِطاعات',
    description: 'سجل دخولك أو أنشئ حساباً جديداً في منصة قِطاعات لدليل أعمال الألمنيوم والحديد',
  });

  // Role-based redirect for authenticated users
  useEffect(() => {
    if (loading) return;
    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      // CT4C.4 — honor pending invite token captured before auth
      try {
        const pending = sessionStorage.getItem('qitaat_pending_invite_token');
        if (pending) {
          sessionStorage.removeItem('qitaat_pending_invite_token');
          window.location.replace(`/invite/${encodeURIComponent(pending)}`);
          return;
        }
      } catch { /* ignore storage errors */ }
      redirectByRole();
    }
  }, [user, loading, redirectByRole]);

  const handleEmailSent = (email: string) => {
    setSentEmail(email);
    setMode('email-sent');
  };

  if (loading) return null;
  if (user) return null;

  return (
    <ErrorBoundary>
      <AuthLayout>
      {mode === 'identity' && (
        <IdentitySignInForm
          onForgotPassword={() => setMode('forgot-password')}
          onAdvancedRegister={() => setMode('register')}
        />
      )}
      {mode === 'login' && (
        <LoginForm
          onSwitchToRegister={() => setMode('register')}
          onForgotPassword={() => setMode('forgot-password')}
        />
      )}
      {mode === 'register' && (
        <RegisterForm
          onSwitchToLogin={() => setMode('identity')}
          onEmailSent={handleEmailSent}
        />
      )}
      {mode === 'forgot-password' && (
        <ForgotPasswordForm onBack={() => setMode('identity')} />
      )}
      {mode === 'email-sent' && (
        <RegistrationSuccessView email={sentEmail} onBackToLogin={() => setMode('identity')} />
      )}
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default Auth;
