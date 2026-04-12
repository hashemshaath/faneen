import React, { useState, useMemo, useCallback, useTransition } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ShieldAlert, Globe, Users, Lock, Bell, Database, Mail, Clock, Save,
  Loader2, RefreshCw, AlertTriangle, Server, Eye, EyeOff, Search, X,
  CheckCircle2, XCircle, Settings, Sparkles, Download, Upload, Shield,
  Smartphone, CreditCard, BarChart3, Brain, Key, Palette, FileText,
  Zap, Activity, ChevronDown, RotateCcw, Hash, ExternalLink, Info, Layers,
} from 'lucide-react';

/* ═══════════ Types ═══════════ */
interface SystemSetting {
  key: string; value: string;
  labelAr: string; labelEn: string;
  descAr: string; descEn: string;
  type: 'toggle' | 'text' | 'number' | 'select' | 'textarea' | 'secret';
  options?: { value: string; labelAr: string; labelEn: string }[];
  category: string;
  isSecret?: boolean;
  importance?: 'critical' | 'normal';
}

/* ═══════════ Default Settings ═══════════ */
const defaultSettings: SystemSetting[] = [
  // ── Auth ──
  { key: 'allow_registration', value: 'true', labelAr: 'السماح بالتسجيل الجديد', labelEn: 'Allow New Registrations', descAr: 'تفعيل أو تعطيل تسجيل مستخدمين جدد', descEn: 'Enable or disable new user registrations', type: 'toggle', category: 'auth', importance: 'critical' },
  { key: 'require_email_verification', value: 'true', labelAr: 'تأكيد البريد الإلكتروني', labelEn: 'Require Email Verification', descAr: 'إلزام المستخدمين بتأكيد بريدهم الإلكتروني', descEn: 'Require users to verify their email', type: 'toggle', category: 'auth' },
  { key: 'max_login_attempts', value: '5', labelAr: 'محاولات تسجيل الدخول', labelEn: 'Max Login Attempts', descAr: 'أقصى عدد محاولات قبل قفل الحساب مؤقتاً', descEn: 'Max attempts before temporary lockout', type: 'number', category: 'auth' },
  { key: 'session_timeout_hours', value: '24', labelAr: 'مدة الجلسة (ساعات)', labelEn: 'Session Timeout (hours)', descAr: 'المدة قبل انتهاء صلاحية الجلسة', descEn: 'Duration before session expires', type: 'number', category: 'auth' },
  { key: 'enable_google_auth', value: 'true', labelAr: 'تسجيل الدخول بـ Google', labelEn: 'Google OAuth Login', descAr: 'السماح بتسجيل الدخول عبر حساب جوجل', descEn: 'Allow login via Google account', type: 'toggle', category: 'auth' },
  { key: 'enable_phone_auth', value: 'true', labelAr: 'تسجيل الدخول بالهاتف', labelEn: 'Phone OTP Login', descAr: 'السماح بتسجيل الدخول عبر رقم الهاتف (OTP)', descEn: 'Allow login via phone OTP', type: 'toggle', category: 'auth' },

  // ── Platform ──
  { key: 'platform_name_ar', value: 'فنيين', labelAr: 'اسم المنصة (عربي)', labelEn: 'Platform Name (Arabic)', descAr: 'اسم المنصة المعروض باللغة العربية', descEn: 'Platform name displayed in Arabic', type: 'text', category: 'platform' },
  { key: 'platform_name_en', value: 'Faneen', labelAr: 'اسم المنصة (إنجليزي)', labelEn: 'Platform Name (English)', descAr: 'اسم المنصة المعروض بالإنجليزية', descEn: 'Platform name displayed in English', type: 'text', category: 'platform' },
  { key: 'maintenance_mode', value: 'false', labelAr: 'وضع الصيانة', labelEn: 'Maintenance Mode', descAr: 'تفعيل وضع الصيانة يمنع الوصول للمنصة مؤقتاً', descEn: 'Enabling maintenance mode blocks platform access', type: 'toggle', category: 'platform', importance: 'critical' },
  { key: 'default_language', value: 'ar', labelAr: 'اللغة الافتراضية', labelEn: 'Default Language', descAr: 'اللغة الافتراضية للمنصة', descEn: 'Default platform language', type: 'select', options: [{ value: 'ar', labelAr: 'العربية', labelEn: 'Arabic' }, { value: 'en', labelAr: 'الإنجليزية', labelEn: 'English' }], category: 'platform' },
  { key: 'contact_email', value: '', labelAr: 'البريد الإلكتروني للتواصل', labelEn: 'Contact Email', descAr: 'البريد الإلكتروني الرسمي للمنصة', descEn: 'Official platform contact email', type: 'text', category: 'platform' },
  { key: 'support_phone', value: '', labelAr: 'رقم الدعم الفني', labelEn: 'Support Phone', descAr: 'رقم هاتف الدعم الفني للعملاء', descEn: 'Technical support phone number', type: 'text', category: 'platform' },
  { key: 'platform_description_ar', value: '', labelAr: 'وصف المنصة (عربي)', labelEn: 'Platform Description (AR)', descAr: 'الوصف المختصر المعروض في محركات البحث', descEn: 'Short description for SEO', type: 'textarea', category: 'platform' },

  // ── Business ──
  { key: 'max_businesses_per_user', value: '3', labelAr: 'أقصى عدد أعمال لكل مستخدم', labelEn: 'Max Businesses Per User', descAr: 'الحد الأقصى للأعمال التي يمكن لمستخدم إنشاؤها', descEn: 'Maximum businesses a user can create', type: 'number', category: 'business' },
  { key: 'auto_approve_businesses', value: 'false', labelAr: 'قبول الأعمال تلقائياً', labelEn: 'Auto-approve Businesses', descAr: 'قبول الأعمال الجديدة بدون مراجعة يدوية', descEn: 'Approve new businesses without manual review', type: 'toggle', category: 'business' },
  { key: 'free_tier_project_limit', value: '5', labelAr: 'حد المشاريع (مجاني)', labelEn: 'Free Tier Project Limit', descAr: 'أقصى عدد مشاريع للعضوية المجانية', descEn: 'Max projects for free membership', type: 'number', category: 'business' },
  { key: 'premium_tier_project_limit', value: '50', labelAr: 'حد المشاريع (مميز)', labelEn: 'Premium Project Limit', descAr: 'أقصى عدد مشاريع للعضوية المميزة', descEn: 'Max projects for premium membership', type: 'number', category: 'business' },
  { key: 'require_cr_number', value: 'false', labelAr: 'إلزام السجل التجاري', labelEn: 'Require CR Number', descAr: 'إلزام المنشآت بإدخال رقم السجل التجاري', descEn: 'Require businesses to provide CR number', type: 'toggle', category: 'business' },
  { key: 'enable_booking_system', value: 'true', labelAr: 'نظام الحجوزات', labelEn: 'Booking System', descAr: 'تفعيل أو تعطيل نظام حجز المواعيد', descEn: 'Enable or disable appointment booking', type: 'toggle', category: 'business' },

  // ── Notifications ──
  { key: 'enable_email_notifications', value: 'true', labelAr: 'إشعارات البريد', labelEn: 'Email Notifications', descAr: 'إرسال إشعارات عبر البريد الإلكتروني', descEn: 'Send notifications via email', type: 'toggle', category: 'notifications' },
  { key: 'enable_push_notifications', value: 'false', labelAr: 'الإشعارات الفورية', labelEn: 'Push Notifications', descAr: 'تفعيل الإشعارات الفورية في المتصفح', descEn: 'Enable browser push notifications', type: 'toggle', category: 'notifications' },
  { key: 'admin_alert_email', value: '', labelAr: 'بريد تنبيهات المشرفين', labelEn: 'Admin Alert Email', descAr: 'البريد الذي تُرسل إليه تنبيهات النظام', descEn: 'Email for system alerts', type: 'text', category: 'notifications' },
  { key: 'enable_sms_notifications', value: 'false', labelAr: 'إشعارات SMS', labelEn: 'SMS Notifications', descAr: 'إرسال إشعارات عبر الرسائل النصية', descEn: 'Send notifications via SMS', type: 'toggle', category: 'notifications' },
  { key: 'digest_frequency', value: 'daily', labelAr: 'تكرار الملخص', labelEn: 'Digest Frequency', descAr: 'تكرار إرسال ملخص الإشعارات', descEn: 'How often to send notification digest', type: 'select', options: [
    { value: 'realtime', labelAr: 'فوري', labelEn: 'Realtime' },
    { value: 'daily', labelAr: 'يومي', labelEn: 'Daily' },
    { value: 'weekly', labelAr: 'أسبوعي', labelEn: 'Weekly' },
  ], category: 'notifications' },

  // ── Security ──
  { key: 'min_password_length', value: '8', labelAr: 'أقل طول لكلمة المرور', labelEn: 'Min Password Length', descAr: 'الحد الأدنى لطول كلمة المرور', descEn: 'Minimum password length', type: 'number', category: 'security' },
  { key: 'enable_2fa', value: 'false', labelAr: 'المصادقة الثنائية', labelEn: 'Two-Factor Auth', descAr: 'تفعيل المصادقة الثنائية للمشرفين', descEn: 'Enable 2FA for admin accounts', type: 'toggle', category: 'security' },
  { key: 'rate_limit_per_minute', value: '60', labelAr: 'حد الطلبات بالدقيقة', labelEn: 'Rate Limit / Min', descAr: 'أقصى عدد طلبات API لكل مستخدم بالدقيقة', descEn: 'Max API requests per user per minute', type: 'number', category: 'security' },
  { key: 'block_duration_minutes', value: '30', labelAr: 'مدة الحظر (دقائق)', labelEn: 'Block Duration (min)', descAr: 'مدة حظر الحساب بعد تجاوز المحاولات', descEn: 'Account block duration after exceeding attempts', type: 'number', category: 'security' },
  { key: 'enable_ip_logging', value: 'true', labelAr: 'تسجيل عناوين IP', labelEn: 'IP Logging', descAr: 'تسجيل عناوين IP لمحاولات الدخول', descEn: 'Log IP addresses for login attempts', type: 'toggle', category: 'security' },
  { key: 'cors_allowed_origins', value: '*', labelAr: 'النطاقات المسموحة (CORS)', labelEn: 'CORS Allowed Origins', descAr: 'النطاقات المسموح لها بالوصول للـ API', descEn: 'Domains allowed to access the API', type: 'text', category: 'security' },

  // ── Content ──
  { key: 'enable_blog', value: 'true', labelAr: 'نظام المدونة', labelEn: 'Blog System', descAr: 'تفعيل أو تعطيل نظام المدونة', descEn: 'Enable or disable the blog', type: 'toggle', category: 'content' },
  { key: 'blog_comments_enabled', value: 'true', labelAr: 'التعليقات على المقالات', labelEn: 'Blog Comments', descAr: 'السماح للمستخدمين بالتعليق على المقالات', descEn: 'Allow users to comment on blog posts', type: 'toggle', category: 'content' },
  { key: 'max_upload_size_mb', value: '10', labelAr: 'حجم الملف الأقصى (MB)', labelEn: 'Max Upload Size (MB)', descAr: 'أقصى حجم لرفع الملفات بالميجابايت', descEn: 'Maximum file upload size in MB', type: 'number', category: 'content' },
  { key: 'allowed_image_types', value: 'jpg,png,webp,svg', labelAr: 'أنواع الصور المسموحة', labelEn: 'Allowed Image Types', descAr: 'أنواع الصور المسموح برفعها (مفصولة بفاصلة)', descEn: 'Allowed image types (comma separated)', type: 'text', category: 'content' },
  { key: 'enable_reviews', value: 'true', labelAr: 'نظام التقييمات', labelEn: 'Review System', descAr: 'تفعيل أو تعطيل نظام تقييم المنشآت', descEn: 'Enable or disable business reviews', type: 'toggle', category: 'content' },

  // ── SEO ──
  { key: 'google_analytics_id', value: '', labelAr: 'معرّف Google Analytics', labelEn: 'Google Analytics ID', descAr: 'معرّف GA4 للتتبع (G-XXXXXXXXXX)', descEn: 'GA4 tracking ID (G-XXXXXXXXXX)', type: 'text', category: 'seo' },
  { key: 'meta_title_suffix', value: ' | فنيين', labelAr: 'لاحقة عنوان الصفحة', labelEn: 'Meta Title Suffix', descAr: 'النص المضاف بعد عنوان كل صفحة', descEn: 'Text appended to each page title', type: 'text', category: 'seo' },
  { key: 'enable_sitemap', value: 'true', labelAr: 'خريطة الموقع (Sitemap)', labelEn: 'Enable Sitemap', descAr: 'إنشاء خريطة موقع XML تلقائياً', descEn: 'Auto-generate XML sitemap', type: 'toggle', category: 'seo' },
  { key: 'robots_txt_custom', value: '', labelAr: 'ملف Robots.txt مخصص', labelEn: 'Custom Robots.txt', descAr: 'محتوى مخصص لملف robots.txt', descEn: 'Custom robots.txt content', type: 'textarea', category: 'seo' },
];

/* ═══════════ Categories ═══════════ */
const settingCategories = [
  { key: 'platform', icon: Globe, labelAr: 'المنصة', labelEn: 'Platform', gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary' },
  { key: 'auth', icon: Lock, labelAr: 'المصادقة', labelEn: 'Auth', gradient: 'from-blue-500/15 to-blue-500/5', iconColor: 'text-blue-600' },
  { key: 'business', icon: Database, labelAr: 'الأعمال', labelEn: 'Business', gradient: 'from-emerald-500/15 to-emerald-500/5', iconColor: 'text-emerald-600' },
  { key: 'notifications', icon: Bell, labelAr: 'الإشعارات', labelEn: 'Notifications', gradient: 'from-amber-500/15 to-amber-500/5', iconColor: 'text-amber-600' },
  { key: 'security', icon: Shield, labelAr: 'الأمان', labelEn: 'Security', gradient: 'from-red-500/15 to-red-500/5', iconColor: 'text-red-600' },
  { key: 'content', icon: FileText, labelAr: 'المحتوى', labelEn: 'Content', gradient: 'from-purple-500/15 to-purple-500/5', iconColor: 'text-purple-600' },
  { key: 'seo', icon: BarChart3, labelAr: 'SEO', labelEn: 'SEO', gradient: 'from-cyan-500/15 to-cyan-500/5', iconColor: 'text-cyan-600' },
];

/* ═══════════ Setting Row ═══════════ */
const SettingRow = React.memo(({ setting, value, isDirty, isRTL, onUpdate }: {
  setting: SystemSetting; value: string; isDirty: boolean; isRTL: boolean;
  onUpdate: (key: string, val: string) => void;
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const isCritical = setting.importance === 'critical';

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 py-4 ${isCritical ? 'bg-destructive/[0.02] -mx-4 px-4 rounded-xl border border-destructive/10' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="font-semibold text-sm">{isRTL ? setting.labelAr : setting.labelEn}</Label>
          {isDirty && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          {isCritical && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[16px] text-destructive/70 border-destructive/30 gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />{isRTL ? 'حساس' : 'Critical'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{isRTL ? setting.descAr : setting.descEn}</p>
        <p className="text-[10px] text-muted-foreground/40 font-mono mt-0.5">{setting.key}</p>
      </div>
      <div className="sm:w-56 shrink-0">
        {setting.type === 'toggle' && (
          <div className="flex items-center gap-2.5">
            <Switch
              checked={value === 'true'}
              onCheckedChange={c => onUpdate(setting.key, String(c))}
            />
            <span className={`text-xs font-medium ${value === 'true' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {value === 'true' ? (isRTL ? 'مفعّل' : 'On') : (isRTL ? 'معطّل' : 'Off')}
            </span>
          </div>
        )}
        {(setting.type === 'text' || setting.type === 'secret') && (
          <div className="relative">
            <Input
              type={setting.isSecret && !showSecret ? 'password' : 'text'}
              value={value || ''}
              onChange={e => onUpdate(setting.key, e.target.value)}
              className="h-9 text-sm rounded-lg pe-8"
              placeholder={isRTL ? 'أدخل القيمة...' : 'Enter value...'}
            />
            {setting.isSecret && (
              <button
                className="absolute top-2 text-muted-foreground/50 hover:text-foreground transition-colors"
                style={{ [isRTL ? 'left' : 'right']: '8px' }}
                onClick={() => setShowSecret(p => !p)}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
        {setting.type === 'number' && (
          <Input
            type="number"
            value={value || ''}
            onChange={e => onUpdate(setting.key, e.target.value)}
            className="h-9 text-sm w-28 rounded-lg tabular-nums"
            min={0}
          />
        )}
        {setting.type === 'select' && setting.options && (
          <Select value={value} onValueChange={v => onUpdate(setting.key, v)}>
            <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {setting.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{isRTL ? opt.labelAr : opt.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {setting.type === 'textarea' && (
          <Textarea
            value={value || ''}
            onChange={e => onUpdate(setting.key, e.target.value)}
            rows={2}
            className="text-sm rounded-lg"
            placeholder={isRTL ? 'أدخل القيمة...' : 'Enter value...'}
          />
        )}
      </div>
    </div>
  );
});
SettingRow.displayName = 'SettingRow';

/* ═══════════ Main Component ═══════════ */
const AdminSystemSettings = () => {
  const { isRTL } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('platform');
  const [search, setSearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*').eq('category', 'system');
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

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
            setting_key: key, setting_value: values[key], category: 'system',
            setting_label_ar: setting.labelAr, setting_label_en: setting.labelEn,
            description_ar: setting.descAr, description_en: setting.descEn,
            is_secret: false, is_active: true,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
      setDirty(new Set());
    },
    onError: () => toast.error(isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings'),
  });

  const updateValue = useCallback((key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  }, []);

  const resetCategory = useCallback(() => {
    const catSettings = defaultSettings.filter(s => s.category === activeCategory);
    const next = { ...values };
    catSettings.forEach(s => { next[s.key] = s.value; });
    setValues(next);
    catSettings.forEach(s => dirty.delete(s.key));
    setDirty(new Set(dirty));
    toast.info(isRTL ? 'تم إعادة التعيين للقيم الافتراضية' : 'Reset to defaults');
  }, [activeCategory, values, dirty, isRTL]);

  const exportSettings = useCallback(() => {
    const data: Record<string, string> = {};
    defaultSettings.forEach(s => { if (!s.isSecret) data[s.key] = values[s.key] || s.value; });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `system-settings_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم التصدير' : 'Exported');
  }, [values, isRTL]);

  const importSettings = useCallback(() => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          const next = { ...values };
          const newDirty = new Set(dirty);
          Object.entries(data).forEach(([k, v]) => {
            if (defaultSettings.find(s => s.key === k)) {
              next[k] = v as string;
              newDirty.add(k);
            }
          });
          setValues(next);
          setDirty(newDirty);
          toast.success(isRTL ? 'تم استيراد الإعدادات — اضغط حفظ للتطبيق' : 'Settings imported — click Save to apply');
        } catch { toast.error(isRTL ? 'ملف غير صالح' : 'Invalid file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [values, dirty, isRTL]);

  const stats = useMemo(() => {
    const toggles = defaultSettings.filter(s => s.type === 'toggle');
    const enabled = toggles.filter(s => values[s.key] === 'true');
    const configured = defaultSettings.filter(s => s.type === 'text' && values[s.key] && values[s.key].trim() !== '');
    const textFields = defaultSettings.filter(s => s.type === 'text');
    return {
      total: defaultSettings.length,
      toggles: toggles.length,
      enabled: enabled.length,
      configured: configured.length,
      textFields: textFields.length,
      categories: settingCategories.length,
    };
  }, [values]);

  const filteredSettings = useMemo(() => {
    if (!search.trim()) return defaultSettings.filter(s => s.category === activeCategory);
    const q = search.toLowerCase();
    return defaultSettings.filter(s =>
      s.labelAr.includes(search) || s.labelEn.toLowerCase().includes(q) ||
      s.key.includes(q) || s.descEn.toLowerCase().includes(q)
    );
  }, [search, activeCategory]);

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center mb-4">
            <ShieldAlert className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-lg font-semibold">{isRTL ? 'الوصول مقيّد' : 'Access Restricted'}</p>
          <p className="text-sm mt-1">{isRTL ? 'هذه الصفحة متاحة للمشرف الأعلى فقط' : 'This page is for Super Admin only'}</p>
        </div>
      </DashboardLayout>
    );
  }

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

  const activeCat = settingCategories.find(c => c.key === activeCategory)!;

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                {isRTL ? 'إعدادات النظام' : 'System Settings'}
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-2 py-0.5">Super Admin</Badge>
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 max-w-lg">
                {isRTL ? 'تحكم كامل في إعدادات المنصة والأمان والإشعارات ومحركات البحث' : 'Full control over platform, security, notifications & SEO settings'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={importSettings} className="gap-2 rounded-xl h-9">
                    <Upload className="w-4 h-4" /><span className="hidden sm:inline">{isRTL ? 'استيراد' : 'Import'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? 'استيراد من ملف JSON' : 'Import from JSON'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={exportSettings} className="gap-2 rounded-xl h-9">
                    <Download className="w-4 h-4" /><span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? 'تصدير JSON' : 'Export JSON'}</TooltipContent>
              </Tooltip>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={dirty.size === 0 || saveMutation.isPending}
                className="gap-2 rounded-xl h-9 shadow-sm"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? `حفظ` : `Save`}
                {dirty.size > 0 && <Badge className="bg-background/20 text-current border-0 text-[10px] px-1.5 py-0 h-[16px]">{dirty.size}</Badge>}
              </Button>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'إجمالي الإعدادات' : 'Total Settings', value: stats.total, icon: Hash, gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary' },
              { label: isRTL ? 'مفاتيح مفعّلة' : 'Toggles Enabled', value: `${stats.enabled}/${stats.toggles}`, icon: Zap, gradient: 'from-emerald-500/15 to-emerald-500/5', iconColor: 'text-emerald-600' },
              { label: isRTL ? 'حقول معبّأة' : 'Fields Configured', value: `${stats.configured}/${stats.textFields}`, icon: CheckCircle2, gradient: 'from-blue-500/15 to-blue-500/5', iconColor: 'text-blue-600' },
              { label: isRTL ? 'أقسام الإعدادات' : 'Setting Groups', value: stats.categories, icon: Layers, gradient: 'from-amber-500/15 to-amber-500/5', iconColor: 'text-amber-600' },
            ].map((s, i) => (
              <Card key={i} className="border-border/40 hover-lift transition-all duration-200">
                <CardContent className="p-4 flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Search + Category Tabs ── */}
          <Card className="border-border/40">
            <CardContent className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute top-2.5 text-muted-foreground/50 w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث في الإعدادات...' : 'Search settings...'}
                  className="ps-9 h-9 rounded-lg"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute top-2.5 text-muted-foreground hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!search && (
                <div className="flex flex-wrap gap-1.5">
                  {settingCategories.map(cat => {
                    const CatIcon = cat.icon;
                    const isActive = activeCategory === cat.key;
                    const catDirtyCount = defaultSettings.filter(s => s.category === cat.key && dirty.has(s.key)).length;
                    const catCount = defaultSettings.filter(s => s.category === cat.key).length;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? `bg-gradient-to-br ${cat.gradient} ${cat.iconColor} ring-1 ring-current/10 shadow-sm`
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        {isRTL ? cat.labelAr : cat.labelEn}
                        <span className="text-[10px] text-muted-foreground/50">({catCount})</span>
                        {catDirtyCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center animate-pulse">
                            {catDirtyCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Settings Panel ── */}
          <Card className="border-border/40 overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {!search && (
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeCat.gradient} flex items-center justify-center`}>
                      <activeCat.icon className={`w-4.5 h-4.5 ${activeCat.iconColor}`} />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">
                      {search
                        ? (isRTL ? `نتائج البحث (${filteredSettings.length})` : `Search Results (${filteredSettings.length})`)
                        : (isRTL ? activeCat.labelAr : activeCat.labelEn)}
                    </CardTitle>
                    {!search && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {filteredSettings.length} {isRTL ? 'إعداد' : 'settings'}
                        {dirty.size > 0 && ` · ${Array.from(dirty).filter(k => defaultSettings.find(s => s.key === k)?.category === activeCategory).length} ${isRTL ? 'معدّل' : 'modified'}`}
                      </p>
                    )}
                  </div>
                </div>
                {!search && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={resetCategory} className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground">
                        <RotateCcw className="w-3.5 h-3.5" />{isRTL ? 'إعادة تعيين' : 'Reset'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRTL ? 'إعادة تعيين هذا القسم للقيم الافتراضية' : 'Reset this section to defaults'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/30 p-4">
              {filteredSettings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{isRTL ? 'لا توجد إعدادات مطابقة' : 'No matching settings'}</p>
                </div>
              ) : (
                filteredSettings.map(setting => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    value={values[setting.key] || setting.value}
                    isDirty={dirty.has(setting.key)}
                    isRTL={isRTL}
                    onUpdate={updateValue}
                  />
                ))
              )}
            </CardContent>
            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/30 text-[11px] text-muted-foreground">
              <span>{filteredSettings.length} {isRTL ? 'إعداد' : 'settings'}</span>
              {dirty.size > 0 && (
                <span className="flex items-center gap-1.5 text-primary font-medium">
                  <Activity className="w-3 h-3" />
                  {dirty.size} {isRTL ? 'تغيير غير محفوظ' : 'unsaved changes'}
                </span>
              )}
            </div>
          </Card>

          {/* ── Warning ── */}
          <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10">
            <CardContent className="p-4 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {isRTL ? 'تحذير: إعدادات حساسة' : 'Warning: Sensitive Settings'}
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5 leading-relaxed">
                  {isRTL
                    ? 'تغيير هذه الإعدادات يؤثر على عمل المنصة بالكامل. تأكد من مراجعة التغييرات قبل الحفظ. يتم تسجيل جميع التغييرات في سجل النشاط.'
                    : 'Changing these settings affects the entire platform. Review changes before saving. All changes are logged in the activity log.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminSystemSettings;
