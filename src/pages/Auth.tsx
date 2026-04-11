import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { EmailSentView } from '@/components/auth/EmailSentView';
import type { AuthMode } from '@/services/auth/types';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const initialMode = (searchParams.get('mode') as AuthMode) || 'login';
  const [mode, setMode] = useState<AuthMode>(
    ['login', 'register', 'forgot-password'].includes(initialMode) ? initialMode : 'login'
  );
  const [sentEmail, setSentEmail] = useState('');

  // Redirect authenticated users
  useEffect(() => {
    if (loading) return;
    if (user) {
      if (profile && !profile.is_onboarded) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

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
