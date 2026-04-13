import React, { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Mail, Smartphone, Brain, Globe, Eye, EyeOff, Save, Loader2,
  CheckCircle2, XCircle, Shield, Key, Server, Lock, Bot, Sparkles,
  Map, BarChart3, Copy, ExternalLink, ChevronDown, ChevronUp,
  BookOpen, Zap, Info, Search, X, Code2, Hash, Activity,
} from 'lucide-react';

/* ═══════════ Types ═══════════ */
interface PlatformSetting {
  id: string; setting_key: string; setting_value: string;
  setting_label_ar: string | null; setting_label_en: string | null;
  category: string; is_secret: boolean; is_active: boolean;
  description_ar: string | null; description_en: string | null;
}

/* ═══════════ Category Config ═══════════ */
interface CategoryMeta {
  icon: React.ElementType;
  gradient: string; iconColor: string;
  label: { ar: string; en: string };
  desc: { ar: string; en: string };
  docsUrl: string;
  setup: { ar: string[]; en: string[] };
  endpoints: { method: string; path: string; desc: { ar: string; en: string }; body: string }[];
  securityNotes: { ar: string[]; en: string[] };
}

const categoryConfig: Record<string, CategoryMeta> = {
  email: {
    icon: Mail, gradient: 'from-blue-500/15 to-blue-500/5', iconColor: 'text-blue-600',
    label: { ar: 'البريد الإلكتروني (SMTP)', en: 'Email (SMTP)' },
    desc: { ar: 'إعدادات خادم SMTP لإرسال رسائل البريد الإلكتروني من المنصة', en: 'SMTP server settings for sending emails from the platform' },
    docsUrl: 'https://support.google.com/mail/answer/7126229',
    setup: {
      ar: ['احصل على إعدادات SMTP من مزود البريد (Gmail, Outlook, Mailgun)', 'أدخل عنوان الخادم (Host) ورقم المنفذ (Port)', 'أدخل اسم المستخدم وكلمة المرور', 'حدد اسم وعنوان المرسل', 'فعّل الخدمة واختبر الإرسال'],
      en: ['Get SMTP settings from your provider (Gmail, Outlook, Mailgun)', 'Enter the server host and port number', 'Enter username and password', 'Set sender name and email address', 'Enable the service and test sending'],
    },
    endpoints: [
      { method: 'POST', path: '/send-transactional-email', desc: { ar: 'إرسال بريد إلكتروني مع قالب', en: 'Send email with template' }, body: `{\n  "to": "user@example.com",\n  "template": "booking-confirmation",\n  "data": { "name": "أحمد", "date": "2026-04-15" }\n}` },
    ],
    securityNotes: {
      ar: ['استخدم منفذ 587 مع TLS لتشفير الاتصال', 'لا تستخدم بريدك الشخصي — استخدم بريد مخصص للمنصة', 'فعّل App Password إذا كنت تستخدم Gmail'],
      en: ['Use port 587 with TLS for encrypted connection', 'Don\'t use personal email — use a dedicated platform email', 'Enable App Password if using Gmail'],
    },
  },
  sms: {
    icon: Smartphone, gradient: 'from-emerald-500/15 to-emerald-500/5', iconColor: 'text-emerald-600',
    label: { ar: 'الرسائل النصية (Twilio)', en: 'SMS (Twilio)' },
    desc: { ar: 'إعدادات Twilio Verify لإرسال رموز التحقق OTP عبر SMS', en: 'Twilio Verify settings for sending OTP verification codes via SMS' },
    docsUrl: 'https://www.twilio.com/docs/verify/quickstarts',
    setup: {
      ar: ['أنشئ حساب مجاني على twilio.com', 'فعّل خدمة Twilio Verify من Console', 'أنشئ Verify Service وانسخ الـ SID', 'انسخ Account SID و Auth Token من لوحة التحكم', 'اشترِ رقم هاتف (اختياري للـ Verify)', 'أدخل جميع البيانات هنا وفعّل الخدمة'],
      en: ['Create a free account on twilio.com', 'Enable Twilio Verify from Console', 'Create a Verify Service and copy the SID', 'Copy Account SID and Auth Token from dashboard', 'Purchase a phone number (optional for Verify)', 'Enter all credentials here and enable the service'],
    },
    endpoints: [
      { method: 'POST', path: '/send-otp', desc: { ar: 'إرسال رمز تحقق OTP', en: 'Send OTP code' }, body: `{\n  "phone": "+966512345678",\n  "channel": "sms"\n}` },
      { method: 'POST', path: '/verify-otp', desc: { ar: 'التحقق من رمز OTP', en: 'Verify OTP code' }, body: `{\n  "phone": "+966512345678",\n  "code": "123456"\n}` },
    ],
    securityNotes: {
      ar: ['لا تشارك Auth Token أبداً — يمنح تحكماً كاملاً بالحساب', 'فعّل قيود الـ Geo Permissions لتقليل التكاليف', 'راقب الاستهلاك بانتظام من Twilio Console'],
      en: ['Never share Auth Token — it grants full account access', 'Enable Geo Permissions to reduce costs', 'Monitor usage regularly from Twilio Console'],
    },
  },
  ai: {
    icon: Brain, gradient: 'from-purple-500/15 to-purple-500/5', iconColor: 'text-purple-600',
    label: { ar: 'الذكاء الاصطناعي', en: 'AI Services' },
    desc: { ar: 'مفاتيح API لخدمات الذكاء الاصطناعي (OpenAI و Google AI)', en: 'API keys for AI services (OpenAI & Google AI)' },
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    setup: {
      ar: ['المنصة تستخدم Lovable AI Gateway افتراضياً ولا تحتاج مفتاح', 'للتخصيص: أنشئ حساب على platform.openai.com', 'أنشئ مفتاح API من قسم API Keys', 'لـ Google AI: احصل على مفتاح من aistudio.google.com', 'أدخل المفتاح المطلوب وفعّل الخدمة'],
      en: ['Platform uses Lovable AI Gateway by default — no key needed', 'For customization: create account on platform.openai.com', 'Generate an API key from the API Keys section', 'For Google AI: get a key from aistudio.google.com', 'Enter the required key and enable the service'],
    },
    endpoints: [
      { method: 'POST', path: '/ai-center', desc: { ar: 'محادثة ذكية / ترجمة / تحسين محتوى', en: 'AI chat / translation / content improvement' }, body: `{\n  "messages": [{ "role": "user", "content": "ترجم للإنجليزية: ..." }],\n  "model": "google/gemini-2.5-flash"\n}` },
      { method: 'POST', path: '/blog-ai-tools', desc: { ar: 'أدوات AI للمدونة', en: 'Blog AI tools' }, body: `{\n  "action": "improve",\n  "content": "...",\n  "tone": "professional"\n}` },
    ],
    securityNotes: {
      ar: ['حدد حد إنفاق شهري لتجنب التكاليف الزائدة', 'استخدم مفاتيح مقيّدة بالمشروع فقط', 'المنصة تدعم Lovable AI مجاناً — لا حاجة لمفتاح خارجي للوظائف الأساسية'],
      en: ['Set a monthly spending limit to avoid overcharges', 'Use project-restricted keys only', 'Platform supports Lovable AI for free — no external key needed for basic functions'],
    },
  },
  google: {
    icon: Globe, gradient: 'from-red-500/15 to-red-500/5', iconColor: 'text-red-600',
    label: { ar: 'منصات جوجل', en: 'Google Platforms' },
    desc: { ar: 'خدمات جوجل: الخرائط، التحليلات، الإشعارات، الحماية (reCAPTCHA)', en: 'Google services: Maps, Analytics, Push Notifications, reCAPTCHA' },
    docsUrl: 'https://console.cloud.google.com/',
    setup: {
      ar: ['افتح Google Cloud Console وأنشئ مشروعاً', 'فعّل APIs المطلوبة (Maps JavaScript, Places, Geocoding)', 'أنشئ مفاتيح API مع تقييدات (HTTP Referrers)', 'لـ Analytics: أنشئ GA4 property في analytics.google.com', 'لـ reCAPTCHA: سجّل موقعك في recaptcha.google.com', 'لـ FCM: فعّل Cloud Messaging في Firebase Console'],
      en: ['Open Google Cloud Console and create a project', 'Enable required APIs (Maps JavaScript, Places, Geocoding)', 'Create API keys with restrictions (HTTP Referrers)', 'For Analytics: create GA4 property in analytics.google.com', 'For reCAPTCHA: register your site at recaptcha.google.com', 'For FCM: enable Cloud Messaging in Firebase Console'],
    },
    endpoints: [
      { method: 'GET', path: '/maps/geocode', desc: { ar: 'تحويل عنوان لإحداثيات جغرافية', en: 'Geocode address to coordinates' }, body: `{\n  "address": "الرياض، المملكة العربية السعودية"\n}` },
    ],
    securityNotes: {
      ar: ['قيّد كل مفتاح بنطاق محدد (Domain Restriction)', 'فعّل فوترة Google Cloud لتجنب التوقف المفاجئ', 'reCAPTCHA Secret يجب أن يبقى سرياً — لا تستخدمه في الكود الأمامي'],
      en: ['Restrict each key to a specific domain', 'Enable Google Cloud billing to avoid unexpected suspension', 'reCAPTCHA Secret must stay private — never use in frontend code'],
    },
  },
};

const settingIcons: Record<string, React.ElementType> = {
  SMTP_HOST: Server, SMTP_PORT: Server, SMTP_USER: Mail, SMTP_PASSWORD: Lock,
  SENDER_EMAIL: Mail, SENDER_NAME: Mail,
  TWILIO_ACCOUNT_SID: Key, TWILIO_AUTH_TOKEN: Lock, TWILIO_PHONE_NUMBER: Smartphone, TWILIO_VERIFY_SID: Shield,
  OPENAI_API_KEY: Bot, GOOGLE_AI_KEY: Sparkles,
  GOOGLE_MAPS_KEY: Map, GOOGLE_ANALYTICS_ID: BarChart3,
  GOOGLE_RECAPTCHA_KEY: Shield, GOOGLE_RECAPTCHA_SECRET: Lock, FCM_SERVER_KEY: Key,
};

/* ═══════════ Code Block ═══════════ */
const CodeBlock = ({ code }: { code: string }) => (
  <div className="relative group">
    <pre className="bg-muted/60 rounded-lg p-3 text-[11px] font-mono overflow-x-auto border border-border/30 leading-relaxed" dir="ltr">
      <code>{code}</code>
    </pre>
    <button
      onClick={() => { navigator.clipboard.writeText(code); toast.success('Copied!'); }}
      className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1.5 hover:bg-accent/10"
    >
      <Copy className="w-3 h-3" />
    </button>
  </div>
);

/* ═══════════ Setting Field ═══════════ */
const SettingField = React.memo(({ setting, editValue, isVisible, isRTL, language, onEdit, onToggleVis, onSave, onToggleActive, isSaving }: {
  setting: PlatformSetting; editValue: string | undefined; isVisible: boolean;
  isRTL: boolean; language: string;
  onEdit: (id: string, val: string) => void; onToggleVis: (id: string) => void;
  onSave: (s: PlatformSetting) => void; onToggleActive: (id: string, active: boolean) => void;
  isSaving: boolean;
}) => {
  const currentValue = editValue ?? setting.setting_value;
  const hasChanges = editValue !== undefined;
  const SettingIcon = settingIcons[setting.setting_key] || Key;
  const isConfigured = setting.is_active && !!setting.setting_value;

  return (
    <div className={`py-3.5 ${!setting.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
            <SettingIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="font-semibold text-sm">{language === 'ar' ? setting.setting_label_ar : setting.setting_label_en}</Label>
              {isConfigured ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{language === 'ar' ? setting.description_ar : setting.description_en}</p>
            <p className="text-[10px] text-muted-foreground/40 font-mono mt-0.5">{setting.setting_key}</p>
          </div>
        </div>
        <Switch
          checked={setting.is_active}
          onCheckedChange={c => onToggleActive(setting.id, c)}
        />
      </div>
      <div className="flex gap-2" style={{ paddingInlineStart: '42px' }}>
        <div className="relative flex-1">
          <Input
            type={setting.is_secret && !isVisible ? 'password' : 'text'}
            value={currentValue}
            onChange={e => onEdit(setting.id, e.target.value)}
            placeholder={isRTL ? 'أدخل القيمة...' : 'Enter value...'}
            dir="ltr"
            className="font-mono text-xs h-9 rounded-lg pe-9"
          />
          {setting.is_secret && (
            <button
              type="button"
              onClick={() => onToggleVis(setting.id)}
              className="absolute top-2 text-muted-foreground/50 hover:text-foreground transition-colors"
              style={{ [isRTL ? 'left' : 'right']: '10px' }}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {hasChanges && (
          <Button size="sm" onClick={() => onSave(setting)} disabled={isSaving} className="gap-1.5 rounded-lg h-9 px-3">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="text-xs hidden sm:inline">{isRTL ? 'حفظ' : 'Save'}</span>
          </Button>
        )}
      </div>
    </div>
  );
});
SettingField.displayName = 'SettingField';

/* ═══════════ Main Component ═══════════ */
const AdminApiSettings = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState('email');
  const [search, setSearch] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*').order('category');
      if (error) throw error;
      return data as PlatformSetting[];
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value, isActive }: { id: string; value?: string; isActive?: boolean }) => {
      const updates: { setting_value?: string; is_active?: boolean } = {};
      if (value !== undefined) updates.setting_value = value;
      if (isActive !== undefined) updates.is_active = isActive;
      const { error } = await supabase.from('platform_settings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = useCallback((setting: PlatformSetting) => {
    const newValue = editValues[setting.id];
    if (newValue !== undefined) {
      updateMutation.mutate({ id: setting.id, value: newValue, isActive: !!newValue });
      setEditValues(prev => { const next = { ...prev }; delete next[setting.id]; return next; });
    }
  }, [editValues, updateMutation]);

  const handleEdit = useCallback((id: string, val: string) => {
    setEditValues(prev => ({ ...prev, [id]: val }));
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setVisibleFields(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleActive = useCallback((id: string, active: boolean) => {
    updateMutation.mutate({ id, isActive: active });
  }, [updateMutation]);

  const toggleDocs = useCallback((cat: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  const groupedSettings = useMemo(() => {
    const acc: Record<string, PlatformSetting[]> = {};
    settings.forEach(s => { (acc[s.category] ??= []).push(s); });
    return acc;
  }, [settings]);

  const getStatus = useCallback((cat: string) => {
    const catSettings = groupedSettings[cat] || [];
    const configured = catSettings.filter(s => s.is_active && s.setting_value).length;
    const total = catSettings.length;
    return { configured, total, isConnected: configured === total && total > 0 };
  }, [groupedSettings]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return [activeCategory];
    const q = search.toLowerCase();
    return Object.keys(categoryConfig).filter(cat => {
      const cfg = categoryConfig[cat];
      const catSettings = groupedSettings[cat] || [];
      return cfg.label.ar.includes(search) || cfg.label.en.toLowerCase().includes(q) ||
        catSettings.some(s => s.setting_key.toLowerCase().includes(q) ||
          s.setting_label_ar?.includes(search) || s.setting_label_en?.toLowerCase().includes(q));
    });
  }, [search, activeCategory, groupedSettings]);

  const availableCategories = useMemo(() =>
    Object.keys(categoryConfig).filter(cat => (groupedSettings[cat]?.length || 0) > 0),
  [groupedSettings]);

  const totalConfigured = useMemo(() => settings.filter(s => s.is_active && s.setting_value).length, [settings]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (settings.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">{isRTL ? 'لا توجد إعدادات' : 'No Settings Found'}</h2>
          <p className="text-sm text-muted-foreground">{isRTL ? 'لم يتم تهيئة إعدادات API بعد' : 'API settings have not been configured yet'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-sm">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                {isRTL ? 'إعدادات API والتكاملات' : 'API Settings & Integrations'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 max-w-lg">
                {isRTL ? 'إدارة مفاتيح API وربط الخدمات الخارجية مع دليل إعداد تفصيلي لكل خدمة' : 'Manage API keys, connect external services with detailed setup guides'}
              </p>
            </div>
          </div>

          {/* ── Status Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {availableCategories.map(cat => {
              const cfg = categoryConfig[cat];
              if (!cfg) return null;
              const status = getStatus(cat);
              const Icon = cfg.icon;
              return (
                <Card
                  key={cat}
                  className={`border-border/40 cursor-pointer transition-all duration-200 hover-lift ${activeCategory === cat && !search ? 'ring-2 ring-primary/20' : ''}`}
                  onClick={() => { setActiveCategory(cat); setSearch(''); }}
                >
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{cfg.label[language as 'ar' | 'en']}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {status.isConnected ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] px-1.5 py-0 h-[16px] gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />{isRTL ? 'متصل' : 'Connected'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[16px]">
                            {status.configured}/{status.total}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Search ── */}
          <Card className="border-border/40">
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute top-2.5 text-muted-foreground/50 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث في المفاتيح والإعدادات...' : 'Search keys and settings...'}
                  className="ps-9 h-9 rounded-lg"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute top-2.5 text-muted-foreground hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Category Panels ── */}
          {filteredCategories.map(cat => {
            const cfg = categoryConfig[cat];
            if (!cfg) return null;
            const catSettings = groupedSettings[cat] || [];
            const status = getStatus(cat);
            const isDocsExpanded = expandedDocs.has(cat);

            return (
              <Card key={cat} className="border-border/40 overflow-hidden">
                {/* Category Header */}
                <CardHeader className="pb-2 border-b border-border/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                        <cfg.icon className={`w-4.5 h-4.5 ${cfg.iconColor}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{cfg.label[language as 'ar' | 'en']}</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.desc[language as 'ar' | 'en']}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status.isConnected ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />{isRTL ? 'متصل بالكامل' : 'Fully Connected'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Activity className="w-3 h-3" />{status.configured}/{status.total} {isRTL ? 'مكتمل' : 'configured'}
                        </Badge>
                      )}
                      <a href={cfg.docsUrl} target="_blank" rel="noopener noreferrer">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? 'التوثيق الرسمي' : 'Official Docs'}</TooltipContent>
                        </Tooltip>
                      </a>
                    </div>
                  </div>
                </CardHeader>

                {/* Settings Fields */}
                <CardContent className="divide-y divide-border/20 px-4">
                  {catSettings.map(setting => (
                    <SettingField
                      key={setting.id}
                      setting={setting}
                      editValue={editValues[setting.id]}
                      isVisible={!!visibleFields[setting.id]}
                      isRTL={isRTL}
                      language={language}
                      onEdit={handleEdit}
                      onToggleVis={toggleVisibility}
                      onSave={handleSave}
                      onToggleActive={toggleActive}
                      isSaving={updateMutation.isPending}
                    />
                  ))}
                </CardContent>

                {/* Inline Docs Toggle */}
                <div className="border-t border-border/30">
                  <button
                    onClick={() => toggleDocs(cat)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {isRTL ? 'دليل الإعداد والتوثيق' : 'Setup Guide & Documentation'}
                    </div>
                    {isDocsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isDocsExpanded && (
                    <div className="px-4 pb-4 space-y-4 bg-muted/[0.03]">
                      {/* Setup Steps */}
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-primary" />{isRTL ? 'خطوات الإعداد' : 'Setup Steps'}
                        </h4>
                        <ol className="space-y-2.5">
                          {cfg.setup[language as 'ar' | 'en'].map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-sm leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* API Endpoints */}
                      {cfg.endpoints.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                            <Code2 className="w-4 h-4 text-primary" />{isRTL ? 'نقاط الوصول (Endpoints)' : 'API Endpoints'}
                          </h4>
                          <div className="space-y-4">
                            {cfg.endpoints.map((ep, i) => (
                              <div key={i} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[10px] px-1.5 py-0 h-[18px] border-0 ${ep.method === 'GET' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                    {ep.method}
                                  </Badge>
                                  <code className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md" dir="ltr">{ep.path}</code>
                                </div>
                                <p className="text-xs text-muted-foreground">{ep.desc[language as 'ar' | 'en']}</p>
                                <CodeBlock code={ep.body} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Security Notes */}
                      <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-xl p-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                          <Shield className="w-4 h-4" />{isRTL ? 'ملاحظات أمنية' : 'Security Notes'}
                        </h4>
                        <ul className="space-y-1.5">
                          {cfg.securityNotes[language as 'ar' | 'en'].map((note, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-amber-500 mt-1">•</span>{note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/30 text-[11px] text-muted-foreground">
                  <span>{catSettings.length} {isRTL ? 'إعداد' : 'settings'}</span>
                  <span>{status.configured} {isRTL ? 'مكتمل' : 'configured'}</span>
                </div>
              </Card>
            );
          })}

          {filteredCategories.length === 0 && search && (
            <Card className="border-dashed border-2 border-border/40">
              <CardContent className="p-12 text-center">
                <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p>
              </CardContent>
            </Card>
          )}

          {/* ── Overview Footer ── */}
          <Card className="border-border/40 bg-gradient-to-r from-primary/[0.02] to-transparent">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{isRTL ? 'ملخص الحالة' : 'Status Summary'}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalConfigured}/{settings.length} {isRTL ? 'إعداد مكتمل عبر جميع الخدمات' : 'settings configured across all services'}
                  </p>
                </div>
              </div>
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${settings.length > 0 ? (totalConfigured / settings.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {settings.length > 0 ? Math.round((totalConfigured / settings.length) * 100) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminApiSettings;
