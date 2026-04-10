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
import { User, Lock, Bell, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useThemeMode } from '@/components/ThemeToggle';

const accentPresets = [
  { key: 'gold', label: { ar: 'ذهبي', en: 'Gold' }, hsl: '42 85% 55%', light: '42 90% 70%', dark: '42 80% 40%' },
  { key: 'blue', label: { ar: 'أزرق', en: 'Blue' }, hsl: '217 91% 60%', light: '217 91% 72%', dark: '217 91% 45%' },
  { key: 'emerald', label: { ar: 'أخضر', en: 'Emerald' }, hsl: '160 84% 39%', light: '160 84% 55%', dark: '160 84% 30%' },
  { key: 'rose', label: { ar: 'وردي', en: 'Rose' }, hsl: '350 89% 60%', light: '350 89% 72%', dark: '350 89% 45%' },
  { key: 'violet', label: { ar: 'بنفسجي', en: 'Violet' }, hsl: '270 76% 55%', light: '270 76% 68%', dark: '270 76% 42%' },
  { key: 'orange', label: { ar: 'برتقالي', en: 'Orange' }, hsl: '25 95% 53%', light: '25 95% 68%', dark: '25 95% 40%' },
];

const getStoredAccent = () => {
  try { return localStorage.getItem('faneen-accent') || 'gold'; } catch { return 'gold'; }
};

const applyAccent = (key: string) => {
  const preset = accentPresets.find(p => p.key === key) || accentPresets[0];
  const root = document.documentElement;
  root.style.setProperty('--accent', preset.hsl);
  root.style.setProperty('--ring', preset.hsl);
  root.style.setProperty('--gold', preset.hsl);
  root.style.setProperty('--gold-light', preset.light);
  root.style.setProperty('--gold-dark', preset.dark);
  // In light mode, secondary = accent
  if (!root.classList.contains('dark') && !root.querySelector('.dark')) {
    root.style.setProperty('--secondary', preset.hsl);
  }
  try { localStorage.setItem('faneen-accent', key); } catch {}
};

// Apply stored accent on load
(() => { try { applyAccent(getStoredAccent()); } catch {} })();

const DashboardSettings = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const { theme, setTheme } = useThemeMode();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accent, setAccentState] = useState(getStoredAccent);

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
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading font-bold text-2xl">{isRTL ? 'الإعدادات' : 'Settings'}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? 'إدارة حسابك وإعداداتك' : 'Manage your account and settings'}</p>
        </div>

        <Tabs defaultValue="theme">
          <TabsList className="bg-muted/50 rounded-xl p-1 flex-wrap h-auto">
            <TabsTrigger value="theme" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5" />
              {isRTL ? 'المظهر' : 'Appearance'}
            </TabsTrigger>
            <TabsTrigger value="account" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 gap-1.5 text-xs">
              <User className="w-3.5 h-3.5" />
              {isRTL ? 'الحساب' : 'Account'}
            </TabsTrigger>
            <TabsTrigger value="security" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 gap-1.5 text-xs">
              <Lock className="w-3.5 h-3.5" />
              {isRTL ? 'الأمان' : 'Security'}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 gap-1.5 text-xs">
              <Bell className="w-3.5 h-3.5" />
              {isRTL ? 'الإشعارات' : 'Notifications'}
            </TabsTrigger>
          </TabsList>

          {/* ─── Theme & Appearance ─── */}
          <TabsContent value="theme" className="space-y-4">
            {/* Dark Mode */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sun className="w-5 h-5 text-accent" />
                  {isRTL ? 'الوضع' : 'Mode'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {themeModes.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setTheme(m.value)}
                      className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                        theme === m.value
                          ? 'border-accent bg-accent/10 shadow-sm'
                          : 'border-border/50 hover:border-accent/30'
                      }`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                        theme === m.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <m.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{isRTL ? m.ar : m.en}</span>
                      {theme === m.value && <Check className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent" />
                  {isRTL ? 'اللون الرئيسي' : 'Accent Color'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {accentPresets.map(p => (
                    <button
                      key={p.key}
                      onClick={() => handleAccent(p.key)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all ${
                        accent === p.key
                          ? 'border-foreground/30 bg-muted/50 shadow-sm'
                          : 'border-border/50 hover:border-foreground/10'
                      }`}
                    >
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all"
                        style={{
                          backgroundColor: `hsl(${p.hsl})`,
                          ringColor: accent === p.key ? `hsl(${p.hsl})` : 'transparent',
                        }}
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

            {/* Preview */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{isRTL ? 'معاينة' : 'Preview'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="hero" size="sm">{isRTL ? 'زر رئيسي' : 'Primary'}</Button>
                  <Button variant="outline" size="sm">{isRTL ? 'زر ثانوي' : 'Outline'}</Button>
                  <Button variant="ghost" size="sm">{isRTL ? 'زر شفاف' : 'Ghost'}</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="w-12 h-12 rounded-xl bg-accent" />
                  <div className="w-12 h-12 rounded-xl bg-primary" />
                  <div className="w-12 h-12 rounded-xl bg-muted" />
                  <div className="w-12 h-12 rounded-xl bg-card border border-border" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'هذا نص تجريبي لمعاينة الخط والألوان المختارة.' : 'This is preview text showing the selected font and colors.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{isRTL ? 'معلومات الحساب' : 'Account Info'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-sm">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <p className="font-medium">{user?.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{isRTL ? 'رقم الجوال' : 'Phone'}</Label>
                  <p className="font-medium" dir="ltr">{user?.phone || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <Button onClick={handleUpdatePassword} disabled={loading} variant="hero">
                  {loading ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'تحديث كلمة المرور' : 'Update Password')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'إعدادات الإشعارات ستكون متاحة قريباً' : 'Notification settings coming soon'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;
