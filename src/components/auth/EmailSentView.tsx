import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface EmailSentViewProps {
  email: string;
  onBackToLogin: () => void;
}

export const EmailSentView: React.FC<EmailSentViewProps> = ({ email, onBackToLogin }) => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
        <Mail className="w-8 h-8 text-accent" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-2xl text-foreground">
          {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {isRTL
            ? `أرسلنا رابط التحقق إلى ${email}. يرجى فتح بريدك والنقر على الرابط لتأكيد حسابك.`
            : `We sent a verification link to ${email}. Please open your email and click the link.`}
        </p>
      </div>
      <Button onClick={onBackToLogin} className="w-full h-11" variant="hero">
        {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
      </Button>
      <p className="text-xs text-muted-foreground">
        {isRTL ? 'لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها' : "Didn't receive it? Check your spam folder"}
      </p>
    </div>
  );
};
