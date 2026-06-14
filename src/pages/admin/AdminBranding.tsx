import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { uploadBrandAsset } from '@/modules/files';
import { DEFAULT_BRANDING, BRANDING_KEYS, type BrandingConfig } from '@/hooks/useBranding';
import { BRAND_THEME_KEY_BY_FIELD, BRAND_THEME_FIELD_BY_KEY } from '@/hooks/useThemeColors';
import { BRAND_COLORS } from '@/config/brandTheme';
import { validateHexColor, isForbiddenBrandColor } from '@/lib/theme/brandThemeUtils';
import {
  BrandingOverviewSection,
  BrandingActionsPanel,
  BrandingLogoAssetsSection,
  BrandingSizesSection,
  BrandingColorTokensSection,
  BrandingPreviewSection,
  BrandingLivePreviewSection,
  IMAGE_FIELD_META,
  SIZE_LIMITS,
  SIZE_ROWS,
  ALL_COLOR_FIELDS,
  COLOR_SECTIONS,
} from '@/components/admin/content/branding';
import type {
  ImageFieldKey,
  AdminColorField as AdminColorFieldShared,
} from '@/components/admin/content/branding';

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

/** Local alias to preserve historical type name within this page. */
type AdminColorField = AdminColorFieldShared;
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

  const dirtyCount = dirty.size + themeDirty.size;

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandingOverviewSection isRTL={isRTL} />
          <BrandingActionsPanel
            isRTL={isRTL}
            dirtyCount={dirtyCount}
            isSaving={saveMutation.isPending}
            onSave={handleSave}
            onResetDefaults={resetDefaults}
          />
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <BrandingLogoAssetsSection
              isRTL={isRTL}
              values={values}
              meta={IMAGE_FIELD_META}
              uploadingFor={uploadingFor as ImageFieldKey | null}
              onUrlChange={(field, value) => update(field, value)}
              onUpload={(field) => onUpload(field)}
            />

            <BrandingColorTokensSection
              isRTL={isRTL}
              theme={theme}
              errors={themeErrors}
              sections={COLOR_SECTIONS}
              onChange={updateTheme}
              onResetBrand={() => resetToQitaatBrand.mutate()}
              resetPending={resetToQitaatBrand.isPending}
            />

            <BrandingPreviewSection isRTL={isRTL} theme={theme} />

            <BrandingSizesSection
              isRTL={isRTL}
              values={values}
              rows={SIZE_ROWS}
              min={SIZE_LIMITS.min}
              max={SIZE_LIMITS.max}
              onChange={(field, value) => update(field, value)}
            />

            <BrandingLivePreviewSection isRTL={isRTL} />

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