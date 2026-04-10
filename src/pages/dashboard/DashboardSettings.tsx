import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Lock, Bell, Palette, Sun, Moon, Monitor, Check, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BnplProvidersManager } from '@/components/bnpl/BnplProvidersManager';
import { useThemeMode } from '@/components/ThemeToggle';
import { accentPresets, getStoredAccent, applyAccent } from '@/lib/accent-colors';

const DashboardSettings = () => {
  const { isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const { theme, setTheme } = useThemeMode();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accent, setAccentState] = useState(getStoredAccent);

  const { data: business } = useQuery({
    queryKey: ['my-business-for-bnpl'],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(isRTL ? 'كلمة المرور قصيرة جداً' : 'Password too short');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(isRTL ? 'تم تحديث كلمة المرور' : 'Password updated');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccent = (key: string) => {
    setAccentState(key);
    applyAccent(key);
    toast.success(isRTL ? 'تم تغيير اللون' : 'Accent color updated');
  };

  const themeModes = [
    { value: 'light' as const, icon: Sun, ar: 'فاتح', en: 'Light' },
    { value: 'dark' as const, icon: Moon, ar: 'داكن', en: 'Dark' },
    { value: 'system' as const, icon: Monitor, ar: 'تلقائي', en: 'System' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl">{isRTL ? 'الإعدادات' : 'Settings'}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{isRTL ? 'إدارة حسابك وإعداداتك' : 'Manage your account and settings'}</p>
        </div>

        <Tabs defaultValue="theme">
          {/* Scrollable tabs on mobile */}
          <div className="overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 dark:bg-muted/30 rounded-xl p-1 inline-flex w-auto min-w-full sm:min-w-0 sm:flex-wrap h-auto">
              <TabsTrigger value="theme" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs whitespace-nowrap">
                <Palette className="w-3.5 h-3.5" />
                {isRTL ? 'المظهر' : 'Appearance'}
              </TabsTrigger>
              <TabsTrigger value="account" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs whitespace-nowrap">
                <User className="w-3.5 h-3.5" />
                {isRTL ? 'الحساب' : 'Account'}
              </TabsTrigger>
              <TabsTrigger value="security" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs whitespace-nowrap">
                <Lock className="w-3.5 h-3.5" />
                {isRTL ? 'الأمان' : 'Security'}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs whitespace-nowrap">
                <Bell className="w-3.5 h-3.5" />
                {isRTL ? 'الإشعارات' : 'Notifications'}
              </TabsTrigger>
              {business && (
                <TabsTrigger value="bnpl" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs whitespace-nowrap">
                  <CreditCard className="w-3.5 h-3.5" />
                  {isRTL ? 'التقسيط' : 'BNPL'}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ─── Theme & Appearance ─── */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  {isRTL ? 'الوضع' : 'Mode'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {themeModes.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setTheme(m.value)}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        theme === m.value
                          ? 'border-accent bg-accent/10 dark:bg-accent/15 shadow-sm'
                          : 'border-border/50 dark:border-border/30 hover:border-accent/30'
                      }`}
                    >
                      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                        theme === m.value ? 'bg-accent text-accent-foreground' : 'bg-muted dark:bg-muted/50 text-muted-foreground'
                      }`}>
                        <m.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[10px] sm:text-sm font-medium">{isRTL ? m.ar : m.en}</span>
                      {theme === m.value && <Check className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  {isRTL ? 'اللون الرئيسي' : 'Accent Color'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {accentPresets.map(p => (
                    <button
                      key={p.key}
                      onClick={() => handleAccent(p.key)}
                      className={`flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl border-2 transition-all active:scale-[0.95] ${
                        accent === p.key
                          ? 'border-foreground/30 bg-muted/50 dark:bg-muted/30 shadow-sm'
                          : 'border-border/50 dark:border-border/30 hover:border-foreground/10'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all ${accent === p.key ? 'ring-foreground/30 scale-110' : 'ring-transparent'}`}
                        style={{ backgroundColor: `hsl(${p.hsl})` }}
                      >
                        {accent === p.key && (
                          <div className="w-full h-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium">{isRTL ? p.label.ar : p.label.en}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-base sm:text-lg">{isRTL ? 'معاينة' : 'Preview'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="hero" size="sm">{isRTL ? 'زر رئيسي' : 'Primary'}</Button>
                  <Button variant="outline" size="sm">{isRTL ? 'زر ثانوي' : 'Outline'}</Button>
                  <Button variant="ghost" size="sm">{isRTL ? 'زر شفاف' : 'Ghost'}</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent" />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary" />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted" />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card border border-border" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isRTL ? 'هذا نص تجريبي لمعاينة الخط والألوان المختارة.' : 'This is preview text showing the selected font and colors.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-4">
            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-base sm:text-lg">{isRTL ? 'معلومات الحساب' : 'Account Info'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div className="p-3 rounded-xl bg-muted/30 dark:bg-muted/20">
                  <Label className="text-muted-foreground text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <p className="font-medium text-sm mt-0.5">{user?.email || '-'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 dark:bg-muted/20">
                  <Label className="text-muted-foreground text-xs">{isRTL ? 'رقم الجوال' : 'Phone'}</Label>
                  <p className="font-medium text-sm mt-0.5" dir="ltr">{user?.phone || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-base sm:text-lg">{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="dark:bg-muted/30" />
                </div>
                <Button onClick={handleUpdatePassword} disabled={loading} variant="hero" className="w-full sm:w-auto">
                  {loading ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'تحديث كلمة المرور' : 'Update Password')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
                <CardTitle className="text-base sm:text-lg">{isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex flex-col items-center py-6 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'إعدادات الإشعارات ستكون متاحة قريباً' : 'Notification settings coming soon'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {business && (
            <TabsContent value="bnpl" className="mt-4">
              <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
                <CardContent className="p-4 sm:p-6">
                  <BnplProvidersManager businessId={business.id} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;
