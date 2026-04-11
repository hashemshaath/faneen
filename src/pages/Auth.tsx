import React, { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { EmailSentView } from '@/components/auth/EmailSentView';
import type { AuthMode } from '@/services/auth/types';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [sentEmail, setSentEmail] = useState('');

  const handleEmailSent = (email: string) => {
    setSentEmail(email);
    setMode('email-sent');
  };

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
