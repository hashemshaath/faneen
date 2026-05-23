import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Upload, Image as ImageIcon, Palette, Eye, Sparkles } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { BrandLogo } from '@/components/common/BrandLogo';
import { DEFAULT_BRANDING, BRANDING_KEYS, type BrandingConfig } from '@/hooks/useBranding';
import { BRAND_THEME_KEY_BY_FIELD, BRAND_THEME_FIELD_BY_KEY } from '@/hooks/useThemeColors';
import { BRAND_COLORS, type BrandColorTokens } from '@/config/brandTheme';
import { validateHexColor, isForbiddenBrandColor } from '@/lib/theme/brandThemeUtils';

type FieldKey =
  | 'fullLightUrl' | 'fullDarkUrl' | 'markUrl'
  | 'sizeNavbar' | 'sizeFooter' | 'sizeAuth' | 'sizeLoader' | 'sizeMark';

const SETTING_BY_FIELD: Record<FieldKey, string> = {
  fullLightUrl: 'brand_logo_full_light',
  fullDarkUrl: 'brand_logo_full_dark',
  markUrl: 'brand_logo_mark',
  sizeNavbar: 'brand_size_navbar',
  sizeFooter: 'brand_size_footer',
  sizeAuth: 'brand_size_auth',
  sizeLoader: 'brand_size_loader',
  sizeMark: 'brand_size_mark',
};

const FIELD_BY_SETTING = Object.fromEntries(
  Object.entries(SETTING_BY_FIELD).map(([k, v]) => [v, k as FieldKey]),
) as Record<string, FieldKey>;

const META = {
  fullLightUrl: { ar: 'الشعار الكامل (خلفية فاتحة)', en: 'Full Logo (light bg)', desc: 'يظهر على الخلفيات الفاتحة' },
  fullDarkUrl:  { ar: 'الشعار الكامل (خلفية معتمة)', en: 'Full Logo (dark bg)', desc: 'يظهر على الشريط العلوي والتذييل' },
  markUrl:      { ar: 'الرمز فقط (Icon)', en: 'Mark / Icon only', desc: 'يستخدم لشاشات التحميل والمصغرات' },
} as const;

const SIZE_LIMITS = { min: 24, max: 96 };

/** Color fields exposed in the admin UI, organised into 3 visible groups. */
type AdminColorField = Extract<keyof BrandColorTokens,
  | 'primary' | 'primaryHover' | 'primaryDark'
  | 'secondary' | 'secondaryDark'
  | 'accent' | 'accentHover'
  | 'background' | 'surface' | 'text' | 'textMuted' | 'border'
  | 'success' | 'warning' | 'error' | 'info'>;

interface ColorFieldDef { key: AdminColorField; ar: string; en: string; desc: string; }

const BRAND_GROUP: ColorFieldDef[] = [
  { key: 'primary',      ar: 'الأساسي (Primary)',          en: 'Primary',         desc: 'أزرار، روابط، تأكيدات' },
  { key: 'primaryHover', ar: 'الأساسي عند Hover',          en: 'Primary hover',   desc: 'حالة التحويم على الأزرار' },
  { key: 'primaryDark',  ar: 'الأساسي الداكن',             en: 'Primary dark',    desc: 'تدرجات وعمق' },
  { key: 'secondary',    ar: 'الثانوي (Secondary)',        en: 'Secondary',       desc: 'الأزرق الصناعي' },
  { key: 'secondaryDark',ar: 'الثانوي الداكن',             en: 'Secondary dark',  desc: 'تدرجات' },
  { key: 'accent',       ar: 'التمييز (Accent)',           en: 'Accent',          desc: 'CTA عاجل أو مميّز' },
  { key: 'accentHover',  ar: 'التمييز عند Hover',          en: 'Accent hover',    desc: 'حالة التحويم للـ accent' },
];

const NEUTRAL_GROUP: ColorFieldDef[] = [
  { key: 'background', ar: 'خلفية الصفحة',     en: 'Background',  desc: 'خلفية body العامة' },
  { key: 'surface',    ar: 'سطح البطاقات',     en: 'Surface',     desc: 'بطاقات، Inputs' },
  { key: 'text',       ar: 'النص الأساسي',     en: 'Text',        desc: 'العناوين والمتن' },
  { key: 'textMuted',  ar: 'النص الباهت',      en: 'Muted text',  desc: 'الأوصاف والنصوص الثانوية' },
  { key: 'border',     ar: 'الحدود',           en: 'Border',      desc: 'حدود البطاقات والـ Inputs' },
];

const STATUS_GROUP: ColorFieldDef[] = [
  { key: 'success', ar: 'نجاح',  en: 'Success', desc: 'حالات النجاح' },
  { key: 'warning', ar: 'تنبيه', en: 'Warning', desc: 'حالات التحذير' },
  { key: 'error',   ar: 'خطأ',   en: 'Error',   desc: 'حالات الخطأ' },
  { key: 'info',    ar: 'معلومة',en: 'Info',    desc: 'حالات إعلامية' },
];

const ALL_COLOR_FIELDS: ColorFieldDef[] = [...BRAND_GROUP, ...NEUTRAL_GROUP, ...STATUS_GROUP];

/** Subset of `BrandColorTokens` covering only the fields exposed in admin. */
type AdminColorState = Record<AdminColorField, string>;

const ADMIN_DEFAULTS: AdminColorState = ALL_COLOR_FIELDS.reduce((acc, f) => {
  acc[f.key] = BRAND_COLORS[f.key];
  return acc;
}, {} as AdminColorState);

const AdminBranding: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [dirty, setDirty] = useState<Set<FieldKey>>(new Set());
  const [theme, setTheme] = useState<AdminColorState>(ADMIN_DEFAULTS);
  const [themeDirty, setThemeDirty] = useState<Set<AdminColorField>>(new Set());
  const [themeErrors, setThemeErrors] = useState<Partial<Record<AdminColorField, string>>>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<FieldKey | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['branding-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('id, setting_key, setting_value')
        .eq('category', 'branding');
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: themeRows = [] } = useQuery({
    queryKey: ['theme-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('id, setting_key, setting_value')
        .eq('category', 'theme');
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    const next: BrandingConfig = { ...DEFAULT_BRANDING };
    for (const r of rows) {
      const f = FIELD_BY_SETTING[r.setting_key];
      if (!f || !r.setting_value) continue;
      if (f.startsWith('size')) {
        const n = parseInt(r.setting_value, 10);
        if (!Number.isNaN(n)) (next as unknown as Record<string, number | string>)[f] = n;
      } else {
        (next as unknown as Record<string, number | string>)[f] = r.setting_value;
      }
    }
    setValues(next);
    setDirty(new Set());
  }, [rows]);

  useEffect(() => {
    const next: AdminColorState = { ...ADMIN_DEFAULTS };
    for (const r of themeRows) {
      const field = BRAND_THEME_FIELD_BY_KEY[r.setting_key];
      if (!field || !r.setting_value) continue;
      // Only apply if (a) the field is one we expose and (b) value is valid + allowed.
      if (!(field in next)) continue;
      const v = r.setting_value.trim();
      if (!validateHexColor(v) || isForbiddenBrandColor(v)) continue;
      next[field as AdminColorField] = v.toUpperCase();
    }
    setTheme(next);
    setThemeDirty(new Set());
    setThemeErrors({});
  }, [themeRows]);

  const update = useCallback((field: FieldKey, value: string | number) => {
    setValues(prev => ({ ...prev, [field]: value } as BrandingConfig));
    setDirty(prev => { const n = new Set(prev); n.add(field); return n; });
  }, []);

  const updateTheme = useCallback((field: AdminColorField, value: string) => {
    const v = value.toUpperCase();
    setTheme(prev => ({ ...prev, [field]: v }));
    setThemeDirty(prev => { const n = new Set(prev); n.add(field); return n; });
    setThemeErrors(prev => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const field of dirty) {
        const settingKey = SETTING_BY_FIELD[field];
        const newValue = String(values[field]);
        const existing = rows.find(r => r.setting_key === settingKey);
        if (existing) {
          const { error } = await supabase.from('platform_settings').update({
            setting_value: newValue,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('platform_settings').insert({
            setting_key: settingKey,
            setting_value: newValue,
            category: 'branding',
            setting_label_ar: 'إعداد العلامة التجارية',
            setting_label_en: 'Branding setting',
            description_ar: 'يحدد شعار وحجوم العلامة التجارية',
            description_en: 'Controls brand logos and sizes',
            is_secret: false,
            is_active: true,
          });
          if (error) throw error;
        }
      }
      for (const field of themeDirty) {
        const settingKey = BRAND_THEME_KEY_BY_FIELD[field];
        if (!settingKey) continue;
        const newValue = theme[field];
        const existing = themeRows.find(r => r.setting_key === settingKey);
        if (existing) {
          const { error } = await supabase.from('platform_settings').update({
            setting_value: newValue,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('platform_settings').insert({
            setting_key: settingKey,
            setting_value: newValue,
            category: 'theme',
            setting_label_ar: 'لون العلامة التجارية',
            setting_label_en: 'Brand color',
            description_ar: 'يتحكم بألوان نظام التصميم',
            description_en: 'Controls design system colors',
            is_secret: false,
            is_active: true,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['branding-config'] });
      queryClient.invalidateQueries({ queryKey: ['theme-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['theme-colors'] });
      toast.success(isRTL ? 'تم حفظ إعدادات العلامة التجارية' : 'Branding saved');
      setDirty(new Set());
      setThemeDirty(new Set());
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'unknown';
      toast.error((isRTL ? 'فشل الحفظ: ' : 'Save failed: ') + msg);
    },
  });

  const resetDefaults = useCallback(() => {
    setValues(DEFAULT_BRANDING);
    setDirty(new Set(BRANDING_KEYS.map(k => FIELD_BY_SETTING[k])));
    setTheme(ADMIN_DEFAULTS);
    setThemeDirty(new Set(ALL_COLOR_FIELDS.map(f => f.key)));
    setThemeErrors({});
    toast.info(isRTL ? 'تم استعادة الإعدادات الافتراضية — اضغط حفظ للتطبيق' : 'Defaults restored — click Save to apply');
  }, [isRTL]);

  /**
   * Reset to Qitaat Brand v1.0 — wipes ALL `category='theme'` rows so the
   * runtime falls back to the central `BRAND_THEME` defaults. Other
   * categories (branding, etc.) are untouched.
   */
  const resetToQitaatBrand = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('platform_settings')
        .delete()
        .eq('category', 'theme');
      if (error) throw error;
    },
    onSuccess: () => {
      setTheme(ADMIN_DEFAULTS);
      setThemeDirty(new Set());
      setThemeErrors({});
      queryClient.invalidateQueries({ queryKey: ['theme-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['theme-colors'] });
      toast.success(isRTL ? 'تم استعادة هوية قطاعات v1.0' : 'Reset to Qitaat Brand v1.0');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'unknown';
      toast.error((isRTL ? 'فشل الاستعادة: ' : 'Reset failed: ') + msg);
    },
  });

  /** Validate every dirty color before saving. Returns true when all good. */
  const runThemeValidation = useCallback((): boolean => {
    const errs: Partial<Record<AdminColorField, string>> = {};
    for (const field of themeDirty) {
      const v = (theme[field] ?? '').trim();
      if (!v) {
        errs[field] = isRTL ? 'القيمة فارغة' : 'Empty value';
      } else if (!validateHexColor(v)) {
        errs[field] = isRTL ? 'صيغة HEX غير صحيحة' : 'Invalid HEX';
      } else if (isForbiddenBrandColor(v)) {
        errs[field] = isRTL ? 'لون ممنوع — مخصص للوغو أو من الإصدار القديم' : 'Forbidden color (logo-only or legacy)';
      }
    }
    setThemeErrors(errs);
    return Object.keys(errs).length === 0;
  }, [theme, themeDirty, isRTL]);

  const handleSave = () => {
    if (!runThemeValidation()) {
      toast.error(isRTL ? 'هناك ألوان غير صالحة' : 'Some colors are invalid');
      return;
    }
    saveMutation.mutate();
  };

  const onUpload = (field: FieldKey) => {
    setUploadingFor(field);
    uploadInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadingFor) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الملف يجب ألا يتجاوز 2MB' : 'File must be ≤ 2MB');
      setUploadingFor(null);
      return;
    }
    // Admin-only branding bucket. Phase 5.1: SVG is blocked at the storage
    // layer until SVG sanitization (DOMPurify) ships, so reject it here too
    // to give a clean error instead of a server-side rejection.
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast.error(isRTL ? 'نوع الملف غير مدعوم (PNG/JPG/WEBP)' : 'Unsupported type (PNG/JPG/WEBP)');
      setUploadingFor(null);
      return;
    }
    const { validateImageFile, getImageRejectionMessage, ALLOWED_PUBLIC_IMAGE_MIMES } = await import('@/lib/image-validate');
    const { compressImage } = await import('@/lib/image-compress');
    const check = await validateImageFile(file, {
      allowed: [...ALLOWED_PUBLIC_IMAGE_MIMES],
      maxBytes: 2 * 1024 * 1024,
    });
    if (!check.ok) {
      toast.error(getImageRejectionMessage(check.reason ?? 'unsupported_type', isRTL));
      setUploadingFor(null);
      return;
    }
    const toUpload: File = await compressImage(file);
    try {
      const { publicUrl, error: upErr } = await uploadBrandAsset({ slot: uploadingFor, file: toUpload });
      if (upErr) throw upErr;
      update(uploadingFor, publicUrl);
      toast.success(isRTL ? 'تم الرفع — اضغط حفظ للتطبيق' : 'Uploaded — click Save to apply');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      toast.error((isRTL ? 'فشل الرفع: ' : 'Upload failed: ') + msg);
    } finally {
      setUploadingFor(null);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">
          {isRTL ? 'الوصول مقصور على المشرفين' : 'Admins only'}
        </div>
      </DashboardLayout>
    );
  }

  const renderImageField = (field: 'fullLightUrl' | 'fullDarkUrl' | 'markUrl', previewBg: 'light' | 'dark') => {
    const meta = META[field];
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-accent" />
            {isRTL ? meta.ar : meta.en}
          </CardTitle>
          <CardDescription className="text-xs">{meta.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`flex items-center justify-center rounded-xl border border-border h-28 ${
              previewBg === 'dark' ? 'bg-surface-nav' : 'bg-muted/40'
            }`}
          >
            {values[field] ? (
              <img
                src={values[field]}
                alt="preview"
                className="max-h-20 max-w-[80%] object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">{isRTL ? 'لا يوجد' : 'None'}</span>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? 'رابط الصورة' : 'Image URL'}</Label>
            <Input
              value={values[field]}
              dir="ltr"
              onChange={(e) => update(field, e.target.value)}
              className="h-10 tech-content text-xs"
              placeholder="https://..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-10"
            onClick={() => onUpload(field)}
            disabled={uploadingFor === field}
          >
            {uploadingFor === field ? (
              <Loader2 className="w-4 h-4 animate-spin me-2" />
            ) : (
              <Upload className="w-4 h-4 me-2" />
            )}
            {isRTL ? 'رفع صورة جديدة' : 'Upload new image'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderSizeField = (
    field: 'sizeNavbar' | 'sizeFooter' | 'sizeAuth' | 'sizeLoader' | 'sizeMark',
    label: { ar: string; en: string },
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{isRTL ? label.ar : label.en}</Label>
        <span className="text-xs text-muted-foreground tech-content">
          {values[field]}px
        </span>
      </div>
      <Slider
        min={SIZE_LIMITS.min}
        max={SIZE_LIMITS.max}
        step={2}
        value={[values[field] as number]}
        onValueChange={([v]) => update(field, v)}
      />
    </div>
  );

  return (
    <DashboardLayout>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelected}
      />
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6 text-accent" />
              {isRTL ? 'العلامة التجارية والشعار' : 'Branding & Logo'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'تحكم بصور الشعار وحجم ظهوره في كل قسم من المنصة'
                : 'Control logo images and their size across every section'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetDefaults} disabled={saveMutation.isPending}>
              <RotateCcw className="w-4 h-4 me-2" />
              {isRTL ? 'افتراضي' : 'Defaults'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={(dirty.size === 0 && themeDirty.size === 0) || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Save className="w-4 h-4 me-2" />
              )}
              {isRTL ? `حفظ (${dirty.size + themeDirty.size})` : `Save (${dirty.size + themeDirty.size})`}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Logos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderImageField('fullLightUrl', 'light')}
              {renderImageField('fullDarkUrl', 'dark')}
              {renderImageField('markUrl', 'light')}
            </div>

            {/* Colors — Brand / Neutral / Status */}
            {[
              { title_ar: 'ألوان الهوية',   title_en: 'Brand colors',   group: BRAND_GROUP },
              { title_ar: 'الألوان المحايدة', title_en: 'Neutral colors', group: NEUTRAL_GROUP },
              { title_ar: 'ألوان الحالات',   title_en: 'Status colors',  group: STATUS_GROUP },
            ].map((section) => (
              <Card key={section.title_en}>
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="w-4 h-4 text-accent" />
                      {isRTL ? section.title_ar : section.title_en}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isRTL
                        ? 'تُطبَّق فوراً بعد الحفظ. الافتراضي من قطاعات v1.0.'
                        : 'Applied right after Save. Defaults from Qitaat v1.0.'}
                    </CardDescription>
                  </div>
                  {section.group === BRAND_GROUP && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetToQitaatBrand.mutate()}
                      disabled={resetToQitaatBrand.isPending}
                    >
                      {resetToQitaatBrand.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 me-2" />
                      )}
                      {isRTL ? 'استعادة هوية قطاعات v1.0' : 'Reset to Qitaat Brand v1.0'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.group.map((f) => {
                    const value = theme[f.key];
                    const valid = validateHexColor(value);
                    const error = themeErrors[f.key];
                    return (
                      <div key={f.key} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <Label className="text-sm block truncate">{isRTL ? f.ar : f.en}</Label>
                            <p className="text-[11px] text-muted-foreground truncate">{f.desc}</p>
                          </div>
                          <div
                            className="w-9 h-9 rounded-lg border border-border shrink-0"
                            style={{ background: valid ? value : 'transparent' }}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={valid ? value : '#000000'}
                            onChange={(e) => updateTheme(f.key, e.target.value)}
                            className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-background"
                            aria-label={f.en}
                          />
                          <Input
                            value={value}
                            dir="ltr"
                            onChange={(e) => updateTheme(f.key, e.target.value)}
                            className="h-10 tech-content text-xs uppercase"
                            placeholder={BRAND_COLORS.primary}
                          />
                        </div>
                        {error && (
                          <p className="text-[11px] text-destructive">{error}</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {/* Live theme preview — uses current FORM values, not saved DB. */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-accent" />
                  {isRTL ? 'معاينة الهوية' : 'Theme preview'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRTL
                    ? 'تعكس قيم الفورم الحالية مباشرةً قبل الحفظ.'
                    : 'Reflects current form values live, before saving.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-xl p-4 sm:p-6 space-y-4 border"
                  style={{
                    background: validateHexColor(theme.background) ? theme.background : undefined,
                    borderColor: validateHexColor(theme.border) ? theme.border : undefined,
                    color: validateHexColor(theme.text) ? theme.text : undefined,
                  }}
                >
                  {/* Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="h-10 px-4 rounded-lg text-sm font-semibold text-white"
                      style={{ background: theme.primary }}
                    >
                      {isRTL ? 'زر أساسي' : 'Primary button'}
                    </button>
                    <button
                      type="button"
                      className="h-10 px-4 rounded-lg text-sm font-semibold text-white"
                      style={{ background: theme.secondary }}
                    >
                      {isRTL ? 'زر ثانوي' : 'Secondary button'}
                    </button>
                    <button
                      type="button"
                      className="h-10 px-4 rounded-lg text-sm font-semibold text-white"
                      style={{ background: theme.accent }}
                    >
                      {isRTL ? 'زر مميز' : 'Accent button'}
                    </button>
                  </div>
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'success', label_ar: 'نجاح',  label_en: 'Success' },
                      { key: 'warning', label_ar: 'تنبيه', label_en: 'Warning' },
                      { key: 'error',   label_ar: 'خطأ',   label_en: 'Error' },
                      { key: 'info',    label_ar: 'معلومة', label_en: 'Info' },
                    ] as const).map((s) => (
                      <span
                        key={s.key}
                        className="inline-flex items-center h-7 px-3 rounded-full text-xs font-semibold text-white"
                        style={{ background: theme[s.key] }}
                      >
                        {isRTL ? s.label_ar : s.label_en}
                      </span>
                    ))}
                  </div>
                  {/* Card sample */}
                  <div
                    className="rounded-xl p-4 border"
                    style={{
                      background: validateHexColor(theme.surface) ? theme.surface : undefined,
                      borderColor: validateHexColor(theme.border) ? theme.border : undefined,
                      color: validateHexColor(theme.text) ? theme.text : undefined,
                    }}
                  >
                    <div className="text-sm font-bold mb-1">
                      {isRTL ? 'عنوان البطاقة' : 'Card title'}
                    </div>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {isRTL
                        ? 'هذه فقرة تجريبية تستخدم لون النص الباهت لمعاينة التباين.'
                        : 'Sample paragraph using muted text to preview contrast.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sizes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isRTL ? 'أحجام الشعار في المنصة' : 'Logo sizes across the platform'}</CardTitle>
                <CardDescription className="text-xs">
                  {isRTL ? 'يتم تطبيق التغييرات فوراً بعد الحفظ' : 'Changes apply immediately after Save'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {renderSizeField('sizeNavbar', { ar: 'الشريط العلوي', en: 'Top navbar' })}
                {renderSizeField('sizeFooter', { ar: 'التذييل', en: 'Footer' })}
                {renderSizeField('sizeAuth', { ar: 'صفحة الدخول', en: 'Auth page' })}
                {renderSizeField('sizeLoader', { ar: 'شاشة التحميل', en: 'Loading screen' })}
                {renderSizeField('sizeMark', { ar: 'الرمز (افتراضي)', en: 'Mark (default)' })}
              </CardContent>
            </Card>

            {/* Live preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-accent" />
                  {isRTL ? 'معاينة مباشرة' : 'Live preview'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRTL ? 'تعكس الإعدادات المحفوظة حالياً (يجب الحفظ لرؤية التعديلات الجديدة).' : 'Reflects currently saved settings.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-surface-nav p-6 flex items-center justify-center">
                  <BrandLogo variant="full" tone="dark" size="navbar" />
                </div>
                <div className="rounded-xl border border-border bg-background p-6 flex items-center justify-center">
                  <BrandLogo variant="full" tone="light" size="navbar" />
                </div>
                <div className="rounded-xl border border-border bg-surface-nav p-6 flex items-center justify-center">
                  <BrandLogo variant="full" tone="dark" size="footer" />
                </div>
                <div className="rounded-xl border border-border bg-background p-6 flex items-center justify-center">
                  <BrandLogo variant="mark" size="mark" />
                </div>
              </CardContent>
            </Card>

            <Separator />

            <p className="text-xs text-muted-foreground">
              {isRTL
                ? '💡 تظهر الشعارات لجميع الزوار. يحتاج المتصفح أحياناً إلى تحديث (Ctrl+R) لمسح الكاش بعد التغيير.'
                : '💡 Logos render for all visitors. Hard refresh may be needed to clear browser cache.'}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBranding;