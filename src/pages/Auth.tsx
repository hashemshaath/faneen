import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { EmailSentView } from '@/components/auth/EmailSentView';
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

  usePageMeta({
    title: mode === 'register' ? 'إنشاء حساب | فنيين' : 'تسجيل الدخول | فنيين',
    description: 'سجل دخولك أو أنشئ حساباً جديداً في منصة فنيين لدليل أعمال الألمنيوم والحديد',
  });

  // Role-based redirect for authenticated users
  useEffect(() => {
    if (loading) return;
    if (user) {
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
        <EmailSentView email={sentEmail} onBackToLogin={() => setMode('login')} />
      )}
    </AuthLayout>
  );
};

export default Auth;
