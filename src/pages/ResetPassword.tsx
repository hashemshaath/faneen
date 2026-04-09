import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { checkPasswordStrength } from '@/lib/password-strength';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const strength = checkPasswordStrength(password);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
  }, []);

  const handleReset = async () => {
    if (strength.score < 2) {
      toast.error(isRTL ? 'كلمة المرور ضعيفة' : 'Password is too weak');
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t('common.success'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">{isRTL ? 'رابط غير صالح' : 'Invalid link'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
            <span className="font-heading font-black text-xl text-secondary-foreground">ف</span>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <h2 className="font-heading font-bold text-2xl text-foreground text-center">{t('auth.new_password')}</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.new_password')}</Label>
              <div className="relative">
                <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 text-muted-foreground" style={{ [isRTL ? 'left' : 'right']: '12px' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${strength.percentage}%`,
                        backgroundColor: strength.score <= 1 ? 'hsl(var(--destructive))' : strength.score === 2 ? 'hsl(var(--gold))' : 'hsl(142, 76%, 36%)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('auth.password.confirm')}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <Button onClick={handleReset} disabled={loading} className="w-full" variant="hero">
              {loading ? t('common.loading') : t('auth.reset_password')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
