import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AuthLayout } from '@/components/auth/AuthLayout';
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

  const initialMode = (searchParams.get('mode') as AuthMode) || 'login';
  const [mode, setMode] = useState<AuthMode>(
    ['login', 'register', 'forgot-password'].includes(initialMode) ? initialMode : 'login'
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
      {mode === 'login' && (
        <LoginForm
          onSwitchToRegister={() => setMode('register')}
          onForgotPassword={() => setMode('forgot-password')}
        />
      )}
      {mode === 'register' && (
        <RegisterForm
          onSwitchToLogin={() => setMode('login')}
          onEmailSent={handleEmailSent}
        />
      )}
      {mode === 'forgot-password' && (
        <ForgotPasswordForm onBack={() => setMode('login')} />
      )}
      {mode === 'email-sent' && (
        <RegistrationSuccessView email={sentEmail} onBackToLogin={() => setMode('login')} />
      )}
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default Auth;
