/**
 * ADMIN-REDESIGN PHASE 2 — Identity Center.
 *
 * Single source of truth for the platform's visual identity tokens.
 * Edits persist into `admin_identity_tokens` (scope = 'global') and
 * propagate to every open admin/dashboard tab via realtime through
 * `<IdentityTokensApplier />`.
 *
 * MVP coverage: Typography · Controls · Forms · Tables · Alerts · Layout.
 * Color palette editing already lives in `AdminBranding` /
 * `/admin/system-settings?tab=branding` — kept intact during the
 * migration period.
 */
import React from 'react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIdentityTokens, type IdentityTokenMap } from '@/hooks/useIdentityTokens';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, RotateCcw, Save, Sparkles } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────── */
/* Token catalog — UI metadata for the editor.                            */
/* ────────────────────────────────────────────────────────────────────── */

type TokenKind = 'px' | 'hsl' | 'number' | 'text';

interface TokenDef {
  key: string;
  labelAr: string;
  labelEn: string;
  kind: TokenKind;
  placeholder: string;
}

interface TokenSection {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  tokens: TokenDef[];
}

const SECTIONS: TokenSection[] = [
  {
    id: 'typography',
    titleAr: 'الخطوط والأحجام',
    titleEn: 'Typography',
    descAr: 'اضبط عائلة الخط والأوزان وأحجام النصوص الأساسية.',
    descEn: 'Tune the platform font family, weights, and base sizes.',
    tokens: [
      { key: '--font-sans',    labelAr: 'الخط الأساسي',    labelEn: 'Body font',     kind: 'text', placeholder: '"IBM Plex Sans Arabic", system-ui, sans-serif' },
      { key: '--font-heading', labelAr: 'خط العناوين',    labelEn: 'Heading font',  kind: 'text', placeholder: '"IBM Plex Sans Arabic", system-ui, sans-serif' },
      { key: '--fs-base',      labelAr: 'حجم النص الأساسي', labelEn: 'Base size',     kind: 'px',   placeholder: '16px' },
      { key: '--fs-lg',        labelAr: 'حجم نص كبير',     labelEn: 'Large size',    kind: 'px',   placeholder: '18px' },
      { key: '--fs-xl',        labelAr: 'حجم عنوان',       labelEn: 'XL size',       kind: 'px',   placeholder: '22px' },
    ],
  },
  {
    id: 'controls',
    titleAr: 'الأزرار والتحكمات',
    titleEn: 'Controls (Buttons)',
    descAr: 'ارتفاع الأزرار، الانحناء، وحلقة التركيز.',
    descEn: 'Button heights, radius, and focus ring.',
    tokens: [
      { key: '--ctrl-h-sm',          labelAr: 'زر صغير',           labelEn: 'Small height',  kind: 'px', placeholder: '32px' },
      { key: '--ctrl-h-md',          labelAr: 'زر متوسط',          labelEn: 'Medium height', kind: 'px', placeholder: '40px' },
      { key: '--ctrl-h-lg',          labelAr: 'زر كبير',           labelEn: 'Large height',  kind: 'px', placeholder: '48px' },
      { key: '--ctrl-h-xl',          labelAr: 'زر ضخم',            labelEn: 'XL height',     kind: 'px', placeholder: '56px' },
      { key: '--ctrl-radius',        labelAr: 'انحناء الأزرار',    labelEn: 'Button radius', kind: 'px', placeholder: '12px' },
      { key: '--btn-focus-ring-w',   labelAr: 'سمك حلقة التركيز',  labelEn: 'Focus ring',    kind: 'px', placeholder: '2px' },
    ],
  },
  {
    id: 'forms',
    titleAr: 'الحقول والنماذج',
    titleEn: 'Forms',
    descAr: 'ارتفاع الحقول، حوافها، وحلقة التركيز.',
    descEn: 'Input heights, radius, and focus ring.',
    tokens: [
      { key: '--field-h',       labelAr: 'ارتفاع الحقل',  labelEn: 'Field height', kind: 'px',  placeholder: '48px' },
      { key: '--field-radius',  labelAr: 'انحناء الحقل',  labelEn: 'Field radius', kind: 'px',  placeholder: '12px' },
      { key: '--field-bg',      labelAr: 'خلفية الحقل (HSL)', labelEn: 'Field bg (HSL)',     kind: 'hsl', placeholder: '0 0% 100%' },
      { key: '--field-border',  labelAr: 'إطار الحقل (HSL)',  labelEn: 'Field border (HSL)', kind: 'hsl', placeholder: '220 23% 91%' },
    ],
  },
  {
    id: 'tables',
    titleAr: 'الجداول',
    titleEn: 'Tables',
    descAr: 'كثافة الصفوف وخلفية رأس الجدول.',
    descEn: 'Row density and header background.',
    tokens: [
      { key: '--table-row-h-compact',     labelAr: 'صف مضغوط',  labelEn: 'Compact row',     kind: 'px',  placeholder: '36px' },
      { key: '--table-row-h-comfortable', labelAr: 'صف مريح',   labelEn: 'Comfortable row', kind: 'px',  placeholder: '52px' },
      { key: '--table-header-bg',         labelAr: 'خلفية الرأس (HSL)', labelEn: 'Header bg (HSL)', kind: 'hsl', placeholder: '220 17% 96%' },
      { key: '--table-border',            labelAr: 'إطار الجدول (HSL)', labelEn: 'Border (HSL)',    kind: 'hsl', placeholder: '220 23% 91%' },
    ],
  },
  {
    id: 'alerts',
    titleAr: 'التنبيهات والإشعارات',
    titleEn: 'Alerts & Toasts',
    descAr: 'انحناء وحشوة التنبيهات.',
    descEn: 'Alert radius and padding.',
    tokens: [
      { key: '--alert-radius',  labelAr: 'الانحناء', labelEn: 'Radius',  kind: 'px',   placeholder: '12px' },
      { key: '--alert-padding', labelAr: 'الحشوة',   labelEn: 'Padding', kind: 'text', placeholder: '14px 16px' },
    ],
  },
  {
    id: 'layout',
    titleAr: 'التخطيط العام',
    titleEn: 'Layout',
    descAr: 'عرض الشريط الجانبي وارتفاع الرأس وأقصى عرض للحاوية.',
    descEn: 'Sidebar width, header height, container max width.',
    tokens: [
      { key: '--sidebar-w-expanded',  labelAr: 'الشريط الجانبي (مفتوح)', labelEn: 'Sidebar expanded',  kind: 'px', placeholder: '260px' },
      { key: '--sidebar-w-collapsed', labelAr: 'الشريط الجانبي (مطوي)',  labelEn: 'Sidebar collapsed', kind: 'px', placeholder: '64px' },
      { key: '--header-h',            labelAr: 'ارتفاع الرأس',             labelEn: 'Header height',     kind: 'px', placeholder: '56px' },
      { key: '--container-max',       labelAr: 'أقصى عرض للحاوية',         labelEn: 'Container max',     kind: 'px', placeholder: '1440px' },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────── */

const AdminIdentityCenter: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { tokens, id, isLoading, refetch } = useIdentityTokens();
  const { toast } = useToast();

  const [draft, setDraft] = React.useState<IdentityTokenMap>({});
  const [saving, setSaving] = React.useState(false);

  // Hydrate the local draft when tokens load / change from realtime.
  React.useEffect(() => {
    setDraft(tokens);
  }, [tokens]);

  const dirty = React.useMemo(() => {
    const keys = new Set([...Object.keys(draft), ...Object.keys(tokens)]);
    for (const k of keys) {
      if ((draft[k] ?? '') !== (tokens[k] ?? '')) return true;
    }
    return false;
  }, [draft, tokens]);

  const setValue = (key: string, value: string) => {
    setDraft((d) => {
      const next = { ...d };
      if (value.trim() === '') delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const handleReset = () => setDraft(tokens);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        scope: 'global',
        tokens: draft as unknown as Record<string, string>,
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      };
      const query = id
        ? supabase.from('admin_identity_tokens').update(payload).eq('id', id)
        : supabase.from('admin_identity_tokens').upsert(payload, { onConflict: 'scope' });
      const { error } = await query;
      if (error) throw error;
      toast({
        title: isRTL ? 'تم الحفظ' : 'Saved',
        description: isRTL ? 'تم تطبيق الهوية على جميع الجلسات.' : 'Identity applied to all sessions.',
      });
      await refetch();
    } catch (err) {
      toast({
        title: isRTL ? 'تعذّر الحفظ' : 'Save failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {isRTL ? 'مركز الهوية' : 'Identity Center'}
            </span>
          </div>
          <h1 className="text-2xl font-bold">
            {isRTL ? 'الهوية البصرية الموحّدة' : 'Unified Visual Identity'}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isRTL
              ? 'مصدر الحقيقة الوحيد لتوكنات الواجهة. أي تعديل هنا ينتشر فورًا إلى لوحة الأدمن، الداشبورد، وكل الصفحات العامة دون إعادة تحميل.'
              : 'Single source of truth for UI tokens. Any change here propagates instantly to admin, dashboard, and public surfaces — no reload needed.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!dirty || saving}
          >
            <RotateCcw className="h-4 w-4 me-2" aria-hidden />
            {isRTL ? 'تراجع' : 'Reset'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving
              ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden />
              : <Save className="h-4 w-4 me-2" aria-hidden />}
            {isRTL ? 'حفظ ونشر' : 'Save & publish'}
          </Button>
        </div>
      </header>

      {dirty && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-sm text-primary">
          {isRTL
            ? 'لديك تغييرات غير محفوظة. اضغط "حفظ ونشر" لتطبيقها على جميع الجلسات الحيّة.'
            : 'You have unsaved changes. Click "Save & publish" to apply to all live sessions.'}
        </div>
      )}

      {/* Sections */}
      <div className="grid grid-cols-1 gap-5">
        {SECTIONS.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <CardTitle>{isRTL ? section.titleAr : section.titleEn}</CardTitle>
              <CardDescription>{isRTL ? section.descAr : section.descEn}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.tokens.map((t) => (
                  <div key={t.key} className="space-y-1.5">
                    <Label htmlFor={`token-${t.key}`} className="flex items-center justify-between">
                      <span>{isRTL ? t.labelAr : t.labelEn}</span>
                      <code className="text-[10px] text-muted-foreground tech-content">{t.key}</code>
                    </Label>
                    <Input
                      id={`token-${t.key}`}
                      dir="ltr"
                      className="tech-content"
                      placeholder={t.placeholder}
                      value={draft[t.key] ?? ''}
                      onChange={(e) => setValue(t.key, e.target.value)}
                    />
                    {t.kind === 'hsl' && (
                      <p className="text-[11px] text-muted-foreground">
                        {isRTL ? 'صيغة HSL بدون hsl(). مثال: 159 76% 34%' : 'HSL triplet, no hsl(). e.g. 159 76% 34%'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Live preview */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'معاينة حيّة' : 'Live preview'}</CardTitle>
          <CardDescription>
            {isRTL
              ? 'تستخدم نفس التوكنات المطبّقة حاليًا — أي تعديل محفوظ ينعكس فورًا.'
              : 'Uses currently applied tokens — saved edits reflect instantly.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">{isRTL ? 'زر أساسي' : 'Primary'}</Button>
            <Button variant="secondary">{isRTL ? 'ثانوي' : 'Secondary'}</Button>
            <Button variant="outline">{isRTL ? 'إطار' : 'Outline'}</Button>
            <Button variant="ghost">{isRTL ? 'شفاف' : 'Ghost'}</Button>
            <Button variant="destructive">{isRTL ? 'حذف' : 'Destructive'}</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={isRTL ? 'حقل إدخال' : 'Input field'} />
            <Input placeholder={isRTL ? 'بحث…' : 'Search…'} />
          </div>
          <div
            className="rounded-lg border bg-card p-4 text-sm"
            style={{ borderRadius: 'var(--alert-radius)' }}
          >
            {isRTL
              ? 'تنبيه عيّنة — يستخدم --alert-radius و--alert-padding.'
              : 'Sample alert — uses --alert-radius and --alert-padding.'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIdentityCenter;
