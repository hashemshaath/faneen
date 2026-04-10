import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ShieldAlert, Globe, Users, Lock, Bell, Database,
  Mail, Palette, Clock, Save, Loader2, RefreshCw,
  ToggleLeft, AlertTriangle, Server, FileText, Eye, EyeOff,
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  type: 'toggle' | 'text' | 'number' | 'select' | 'textarea';
  options?: { value: string; labelAr: string; labelEn: string }[];
  category: string;
  isSecret?: boolean;
}

const defaultSettings: SystemSetting[] = [
  // Registration & Auth
  { key: 'allow_registration', value: 'true', labelAr: 'السماح بالتسجيل الجديد', labelEn: 'Allow New Registrations', descAr: 'تفعيل أو تعطيل تسجيل مستخدمين جدد', descEn: 'Enable or disable new user registrations', type: 'toggle', category: 'auth' },
  { key: 'require_email_verification', value: 'true', labelAr: 'تأكيد البريد الإلكتروني', labelEn: 'Require Email Verification', descAr: 'إلزام المستخدمين بتأكيد بريدهم الإلكتروني', descEn: 'Require users to verify their email', type: 'toggle', category: 'auth' },
  { key: 'max_login_attempts', value: '5', labelAr: 'محاولات تسجيل الدخول', labelEn: 'Max Login Attempts', descAr: 'أقصى عدد محاولات قبل قفل الحساب مؤقتاً', descEn: 'Max attempts before temporary lockout', type: 'number', category: 'auth' },
  { key: 'session_timeout_hours', value: '24', labelAr: 'مدة الجلسة (ساعات)', labelEn: 'Session Timeout (hours)', descAr: 'المدة قبل انتهاء صلاحية الجلسة', descEn: 'Duration before session expires', type: 'number', category: 'auth' },

  // Platform
  { key: 'platform_name_ar', value: 'فنيين', labelAr: 'اسم المنصة (عربي)', labelEn: 'Platform Name (Arabic)', descAr: 'اسم المنصة المعروض باللغة العربية', descEn: 'Platform name displayed in Arabic', type: 'text', category: 'platform' },
  { key: 'platform_name_en', value: 'Faneen', labelAr: 'اسم المنصة (إنجليزي)', labelEn: 'Platform Name (English)', descAr: 'اسم المنصة المعروض بالإنجليزية', descEn: 'Platform name displayed in English', type: 'text', category: 'platform' },
  { key: 'maintenance_mode', value: 'false', labelAr: 'وضع الصيانة', labelEn: 'Maintenance Mode', descAr: 'تفعيل وضع الصيانة يمنع الوصول للمنصة مؤقتاً', descEn: 'Enabling maintenance mode blocks platform access', type: 'toggle', category: 'platform' },
  { key: 'default_language', value: 'ar', labelAr: 'اللغة الافتراضية', labelEn: 'Default Language', descAr: 'اللغة الافتراضية للمنصة', descEn: 'Default platform language', type: 'select', options: [{ value: 'ar', labelAr: 'العربية', labelEn: 'Arabic' }, { value: 'en', labelAr: 'الإنجليزية', labelEn: 'English' }], category: 'platform' },
  { key: 'contact_email', value: '', labelAr: 'البريد الإلكتروني للتواصل', labelEn: 'Contact Email', descAr: 'البريد الإلكتروني الرسمي للمنصة', descEn: 'Official platform contact email', type: 'text', category: 'platform' },

  // Business rules
  { key: 'max_businesses_per_user', value: '3', labelAr: 'أقصى عدد أعمال لكل مستخدم', labelEn: 'Max Businesses Per User', descAr: 'الحد الأقصى للأعمال التي يمكن لمستخدم إنشاؤها', descEn: 'Maximum businesses a user can create', type: 'number', category: 'business' },
  { key: 'auto_approve_businesses', value: 'false', labelAr: 'قبول الأعمال تلقائياً', labelEn: 'Auto-approve Businesses', descAr: 'قبول الأعمال الجديدة بدون مراجعة يدوية', descEn: 'Approve new businesses without manual review', type: 'toggle', category: 'business' },
  { key: 'free_tier_project_limit', value: '5', labelAr: 'حد المشاريع (مجاني)', labelEn: 'Free Tier Project Limit', descAr: 'أقصى عدد مشاريع للعضوية المجانية', descEn: 'Max projects for free membership', type: 'number', category: 'business' },
  { key: 'premium_tier_project_limit', value: '50', labelAr: 'حد المشاريع (مميز)', labelEn: 'Premium Tier Project Limit', descAr: 'أقصى عدد مشاريع للعضوية المميزة', descEn: 'Max projects for premium membership', type: 'number', category: 'business' },

  // Notifications
  { key: 'enable_email_notifications', value: 'true', labelAr: 'إشعارات البريد', labelEn: 'Email Notifications', descAr: 'إرسال إشعارات عبر البريد الإلكتروني', descEn: 'Send notifications via email', type: 'toggle', category: 'notifications' },
  { key: 'enable_push_notifications', value: 'false', labelAr: 'الإشعارات الفورية', labelEn: 'Push Notifications', descAr: 'تفعيل الإشعارات الفورية في المتصفح', descEn: 'Enable browser push notifications', type: 'toggle', category: 'notifications' },
  { key: 'admin_alert_email', value: '', labelAr: 'بريد تنبيهات المشرفين', labelEn: 'Admin Alert Email', descAr: 'البريد الذي تُرسل إليه تنبيهات النظام', descEn: 'Email for system alerts', type: 'text', category: 'notifications' },

  // Security
  { key: 'min_password_length', value: '8', labelAr: 'أقل طول لكلمة المرور', labelEn: 'Min Password Length', descAr: 'الحد الأدنى لطول كلمة المرور', descEn: 'Minimum password length', type: 'number', category: 'security' },
  { key: 'enable_2fa', value: 'false', labelAr: 'المصادقة الثنائية', labelEn: 'Two-Factor Auth', descAr: 'تفعيل المصادقة الثنائية للمشرفين', descEn: 'Enable 2FA for admin accounts', type: 'toggle', category: 'security' },
  { key: 'rate_limit_per_minute', value: '60', labelAr: 'حد الطلبات بالدقيقة', labelEn: 'Rate Limit Per Minute', descAr: 'أقصى عدد طلبات API لكل مستخدم بالدقيقة', descEn: 'Max API requests per user per minute', type: 'number', category: 'security' },
];

const categories = [
  { key: 'auth', icon: Lock, labelAr: 'التسجيل والمصادقة', labelEn: 'Registration & Auth', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'platform', icon: Globe, labelAr: 'إعدادات المنصة', labelEn: 'Platform Settings', color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'business', icon: Database, labelAr: 'قواعد الأعمال', labelEn: 'Business Rules', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'notifications', icon: Bell, labelAr: 'الإشعارات', labelEn: 'Notifications', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'security', icon: ShieldAlert, labelAr: 'الأمان', labelEn: 'Security', color: 'text-red-500', bg: 'bg-red-500/10' },
];

const AdminSystemSettings = () => {
  const { isRTL } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('auth');

  // Load settings from platform_settings
  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('category', 'system');
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Merge defaults with saved values
  React.useEffect(() => {
    const merged: Record<string, string> = {};
    defaultSettings.forEach(s => {
      const saved = savedSettings.find((sv: any) => sv.setting_key === s.key);
      merged[s.key] = saved ? saved.setting_value : s.value;
    });
    setValues(merged);
    setDirty(new Set());
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dirtyKeys = Array.from(dirty);
      for (const key of dirtyKeys) {
        const setting = defaultSettings.find(s => s.key === key);
        if (!setting) continue;
        const existing = savedSettings.find((s: any) => s.setting_key === key);
        if (existing) {
          await supabase.from('platform_settings').update({
            setting_value: values[key],
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('platform_settings').insert({
            setting_key: key,
            setting_value: values[key],
            category: 'system',
            setting_label_ar: setting.labelAr,
            setting_label_en: setting.labelEn,
            description_ar: setting.descAr,
            description_en: setting.descEn,
            is_secret: false,
            is_active: true,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
      setDirty(new Set());
    },
    onError: () => {
      toast.error(isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    },
  });

  const updateValue = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ShieldAlert className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">{isRTL ? 'الوصول مقيّد' : 'Access Restricted'}</p>
          <p className="text-sm">{isRTL ? 'هذه الصفحة متاحة للمشرف الأعلى فقط' : 'This page is for Super Admin only'}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  const currentSettings = defaultSettings.filter(s => s.category === activeCategory);
  const activeCat = categories.find(c => c.key === activeCategory)!;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-purple-500" />
              <h1 className="font-heading font-bold text-xl sm:text-2xl">
                {isRTL ? 'إعدادات النظام' : 'System Settings'}
              </h1>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                Super Admin
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'إعدادات حساسة تؤثر على عمل المنصة بالكامل' : 'Sensitive settings that affect the entire platform'}
            </p>
          </div>
          <Button
            variant="hero"
            size="sm"
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={dirty.size === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isRTL ? `حفظ (${dirty.size})` : `Save (${dirty.size})`}
          </Button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const CatIcon = cat.icon;
            const isActive = activeCategory === cat.key;
            const catDirty = defaultSettings.filter(s => s.category === cat.key && dirty.has(s.key)).length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? `${cat.bg} ${cat.color} ring-1 ring-current/20`
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {isRTL ? cat.labelAr : cat.labelEn}
                {catDirty > 0 && (
                  <span className="w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center">
                    {catDirty}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings cards */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <activeCat.icon className={`w-5 h-5 ${activeCat.color}`} />
              <CardTitle className="text-base sm:text-lg">{isRTL ? activeCat.labelAr : activeCat.labelEn}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {currentSettings.map((setting, idx) => (
              <React.Fragment key={setting.key}>
                {idx > 0 && <Separator />}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium text-sm">
                        {isRTL ? setting.labelAr : setting.labelEn}
                      </Label>
                      {dirty.has(setting.key) && (
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRTL ? setting.descAr : setting.descEn}
                    </p>
                  </div>

                  <div className="sm:w-52 shrink-0">
                    {setting.type === 'toggle' && (
                      <Switch
                        checked={values[setting.key] === 'true'}
                        onCheckedChange={(checked) => updateValue(setting.key, String(checked))}
                      />
                    )}
                    {setting.type === 'text' && (
                      <Input
                        value={values[setting.key] || ''}
                        onChange={(e) => updateValue(setting.key, e.target.value)}
                        className="h-9 text-sm"
                      />
                    )}
                    {setting.type === 'number' && (
                      <Input
                        type="number"
                        value={values[setting.key] || ''}
                        onChange={(e) => updateValue(setting.key, e.target.value)}
                        className="h-9 text-sm w-24"
                        min={0}
                      />
                    )}
                    {setting.type === 'select' && setting.options && (
                      <Select value={values[setting.key]} onValueChange={(v) => updateValue(setting.key, v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {setting.options.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {isRTL ? opt.labelAr : opt.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {setting.type === 'textarea' && (
                      <Textarea
                        value={values[setting.key] || ''}
                        onChange={(e) => updateValue(setting.key, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        {/* Warning card */}
        <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {isRTL ? 'تحذير: إعدادات حساسة' : 'Warning: Sensitive Settings'}
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                {isRTL
                  ? 'تغيير هذه الإعدادات يؤثر على عمل المنصة بالكامل. تأكد من مراجعة التغييرات قبل الحفظ.'
                  : 'Changing these settings affects the entire platform. Review changes before saving.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSystemSettings;
