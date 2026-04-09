import React, { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Mail, MessageSquare, Brain, Globe, Eye, EyeOff, Save,
  CheckCircle2, XCircle, Shield, Key, Server, Smartphone,
  Sparkles, Map, BarChart3, Bot, Lock,
} from 'lucide-react';

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_label_ar: string | null;
  setting_label_en: string | null;
  category: string;
  is_secret: boolean;
  is_active: boolean;
  description_ar: string | null;
  description_en: string | null;
}

const categoryConfig = {
  email: {
    icon: Mail,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: { ar: 'البريد الإلكتروني', en: 'Email' },
    desc: { ar: 'إعدادات SMTP لإرسال رسائل البريد الإلكتروني', en: 'SMTP settings for sending emails' },
    docsUrl: 'https://support.google.com/mail/answer/7126229',
  },
  sms: {
    icon: Smartphone,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: { ar: 'الرسائل النصية (Twilio)', en: 'SMS (Twilio)' },
    desc: { ar: 'إعدادات Twilio لإرسال رسائل OTP والتحقق', en: 'Twilio settings for OTP and verification messages' },
    docsUrl: 'https://www.twilio.com/docs/verify/quickstarts',
  },
  ai: {
    icon: Brain,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    label: { ar: 'الذكاء الاصطناعي', en: 'Artificial Intelligence' },
    desc: { ar: 'مفاتيح API لخدمات الذكاء الاصطناعي', en: 'API keys for AI services' },
    docsUrl: 'https://platform.openai.com/docs',
  },
  google: {
    icon: Globe,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: { ar: 'منصات جوجل', en: 'Google Platforms' },
    desc: { ar: 'خدمات جوجل: الخرائط، التحليلات، الإشعارات، الحماية', en: 'Google services: Maps, Analytics, Notifications, Protection' },
    docsUrl: 'https://console.cloud.google.com/',
  },
};

const settingIcons: Record<string, React.ElementType> = {
  SMTP_HOST: Server,
  SMTP_PORT: Server,
  SMTP_USER: Mail,
  SMTP_PASSWORD: Lock,
  SENDER_EMAIL: Mail,
  SENDER_NAME: Mail,
  TWILIO_ACCOUNT_SID: Key,
  TWILIO_AUTH_TOKEN: Lock,
  TWILIO_PHONE_NUMBER: Smartphone,
  TWILIO_VERIFY_SID: Shield,
  OPENAI_API_KEY: Bot,
  GOOGLE_AI_KEY: Sparkles,
  GOOGLE_MAPS_KEY: Map,
  GOOGLE_ANALYTICS_ID: BarChart3,
  GOOGLE_RECAPTCHA_KEY: Shield,
  GOOGLE_RECAPTCHA_SECRET: Lock,
  FCM_SERVER_KEY: Key,
};

const AdminApiSettings = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as PlatformSetting[];
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value, isActive }: { id: string; value?: string; isActive?: boolean }) => {
      const updates: Record<string, any> = {};
      if (value !== undefined) updates.setting_value = value;
      if (isActive !== undefined) updates.is_active = isActive;
      const { error } = await supabase
        .from('platform_settings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = (setting: PlatformSetting) => {
    const newValue = editValues[setting.id];
    if (newValue !== undefined) {
      updateMutation.mutate({ id: setting.id, value: newValue, isActive: !!newValue });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[setting.id];
        return next;
      });
    }
  };

  const toggleVisibility = (id: string) =>
    setVisibleFields((prev) => ({ ...prev, [id]: !prev[id] }));

  const groupedSettings = settings.reduce<Record<string, PlatformSetting[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const getConnectionStatus = (category: string) => {
    const catSettings = groupedSettings[category] || [];
    const configured = catSettings.filter((s) => s.is_active && s.setting_value).length;
    const total = catSettings.length;
    return { configured, total, isConnected: configured === total && total > 0 };
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (settings.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="font-heading font-bold text-xl mb-2">
            {isRTL ? 'الوصول مقيّد' : 'Access Restricted'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL ? 'هذه الصفحة متاحة فقط للمسؤولين' : 'This page is only available to admins'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Key className="w-6 h-6 text-gold" />
            {isRTL ? 'إعدادات API والتكاملات' : 'API Settings & Integrations'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? 'إدارة مفاتيح API وربط الخدمات الخارجية بالمنصة'
              : 'Manage API keys and connect external services to the platform'}
          </p>
        </div>

        {/* Status overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((cat) => {
            const cfg = categoryConfig[cat];
            const status = getConnectionStatus(cat);
            const Icon = cfg.icon;
            return (
              <Card key={cat} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <p className="text-xs font-medium mb-1">{cfg.label[language]}</p>
                  {status.isConnected ? (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 me-1" />
                      {isRTL ? 'متصل' : 'Connected'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {status.configured}/{status.total}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Settings tabs */}
        <Tabs defaultValue="email">
          <TabsList className="bg-muted/50 rounded-xl p-1 flex-wrap h-auto">
            {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((cat) => {
              const cfg = categoryConfig[cat];
              const Icon = cfg.icon;
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 gap-1.5 text-xs"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label[language]}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((cat) => {
            const cfg = categoryConfig[cat];
            const catSettings = groupedSettings[cat] || [];

            return (
              <TabsContent key={cat} value={cat}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                      {cfg.label[language]}
                    </CardTitle>
                    <CardDescription>{cfg.desc[language]}</CardDescription>
                    <a
                      href={cfg.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gold hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      📄 {isRTL ? 'التوثيق الرسمي' : 'Official Documentation'}
                    </a>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {catSettings.map((setting) => {
                      const currentValue = editValues[setting.id] ?? setting.setting_value;
                      const isVisible = visibleFields[setting.id];
                      const hasChanges = editValues[setting.id] !== undefined;
                      const SettingIcon = settingIcons[setting.setting_key] || Key;

                      return (
                        <div key={setting.id} className="space-y-2 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <SettingIcon className="w-4 h-4 text-muted-foreground" />
                              <Label className="font-medium">
                                {language === 'ar' ? setting.setting_label_ar : setting.setting_label_en}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              {setting.is_active && setting.setting_value ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground/40" />
                              )}
                              <Switch
                                checked={setting.is_active}
                                onCheckedChange={(checked) =>
                                  updateMutation.mutate({ id: setting.id, isActive: checked })
                                }
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? setting.description_ar : setting.description_en}
                          </p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={setting.is_secret && !isVisible ? 'password' : 'text'}
                                value={currentValue}
                                onChange={(e) =>
                                  setEditValues((prev) => ({ ...prev, [setting.id]: e.target.value }))
                                }
                                placeholder={setting.setting_key}
                                dir="ltr"
                                className="font-mono text-sm"
                              />
                              {setting.is_secret && (
                                <button
                                  type="button"
                                  onClick={() => toggleVisibility(setting.id)}
                                  className="absolute top-2.5 text-muted-foreground"
                                  style={{ [isRTL ? 'left' : 'right']: '10px' }}
                                >
                                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                            {hasChanges && (
                              <Button
                                size="sm"
                                variant="hero"
                                onClick={() => handleSave(setting)}
                                disabled={updateMutation.isPending}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminApiSettings;
