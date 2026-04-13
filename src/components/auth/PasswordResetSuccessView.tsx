import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { CheckCircle } from 'lucide-react';

export const PasswordResetSuccessView: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/auth?mode=login', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 animate-fade-in max-w-md">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          {isRTL ? 'تم تغيير كلمة المرور بنجاح ✅' : 'Password changed successfully ✅'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isRTL
            ? `سيتم توجيهك لتسجيل الدخول خلال ${countdown} ثوانٍ...`
            : `Redirecting to login in ${countdown} seconds...`
          }
        </p>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
