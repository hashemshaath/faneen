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
import { User, Lock, Bell } from 'lucide-react';

const DashboardSettings = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading font-bold text-2xl">{isRTL ? 'الإعدادات' : 'Settings'}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? 'إدارة حسابك وإعداداتك' : 'Manage your account and settings'}</p>
        </div>

        <Tabs defaultValue="account">
          <TabsList className="bg-muted/50 rounded-xl p-1">
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
