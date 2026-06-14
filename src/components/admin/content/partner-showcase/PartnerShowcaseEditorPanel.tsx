import React from 'react';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBi } from '@/components/common/Bilingual';

export interface PartnerShowcaseSettingsDraft {
  id: string;
  is_enabled: boolean;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  display_mode: 'marquee' | 'grid' | 'static';
  speed: number;
  direction: 'ltr' | 'rtl';
  pause_on_hover: boolean;
  show_arrows: boolean;
  logo_size: 'sm' | 'md' | 'lg';
  gap_size: 'sm' | 'md' | 'lg';
  grayscale: boolean;
  open_in_new_tab: boolean;
  style_variant: 'default' | 'muted' | 'bordered' | 'glass';
}

/**
 * PartnerShowcaseEditorPanel — fully controlled settings form. All save
 * logic remains in the parent page; this component only emits change
 * intents and renders the inline editor (no popups, no DB access).
 */
export interface PartnerShowcaseEditorPanelProps {
  current: PartnerShowcaseSettingsDraft | null;
  loading: boolean;
  dirty: boolean;
  saving: boolean;
  onChange: (next: PartnerShowcaseSettingsDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label, checked, onChange,
}) => (
  <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
    <Label className="text-sm">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export const PartnerShowcaseEditorPanel: React.FC<PartnerShowcaseEditorPanelProps> = ({
  current, loading, dirty, saving, onChange, onCancel, onSave,
}) => {
  const bi = useBi();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{bi('إعدادات القسم', 'Section Settings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading || !current ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                {current.is_enabled
                  ? <Eye className="w-4 h-4 text-emerald-600" />
                  : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <Label className="font-medium">{bi('تفعيل القسم', 'Enable section')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {bi('عند الإيقاف لن يظهر القسم للزوار.', 'When disabled the section is hidden from visitors.')}
                  </p>
                </div>
              </div>
              <Switch
                checked={current.is_enabled}
                onCheckedChange={(v) => onChange({ ...current, is_enabled: v })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{bi('العنوان (عربي)', 'Title (Arabic)')}</Label>
                <Input dir="auto" value={current.title_ar} onChange={(e) => onChange({ ...current, title_ar: e.target.value })} />
              </div>
              <div>
                <Label>{bi('العنوان (إنجليزي)', 'Title (English)')}</Label>
                <Input dir="auto" value={current.title_en} onChange={(e) => onChange({ ...current, title_en: e.target.value })} />
              </div>
              <div>
                <Label>{bi('الوصف (عربي)', 'Description (Arabic)')}</Label>
                <Textarea dir="auto" rows={2} value={current.description_ar} onChange={(e) => onChange({ ...current, description_ar: e.target.value })} />
              </div>
              <div>
                <Label>{bi('الوصف (إنجليزي)', 'Description (English)')}</Label>
                <Textarea dir="auto" rows={2} value={current.description_en} onChange={(e) => onChange({ ...current, description_en: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>{bi('السرعة (ثوانٍ/دورة)', 'Speed (s/loop)')}</Label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  value={current.speed}
                  onChange={(e) => onChange({ ...current, speed: Math.max(10, Math.min(200, Number(e.target.value) || 40)) })}
                />
              </div>
              <div>
                <Label>{bi('اتجاه الحركة', 'Direction')}</Label>
                <Select value={current.direction} onValueChange={(v) => onChange({ ...current, direction: v as PartnerShowcaseSettingsDraft['direction'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rtl">RTL ←</SelectItem>
                    <SelectItem value="ltr">LTR →</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bi('حجم الشعار', 'Logo size')}</Label>
                <Select value={current.logo_size} onValueChange={(v) => onChange({ ...current, logo_size: v as PartnerShowcaseSettingsDraft['logo_size'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">SM</SelectItem>
                    <SelectItem value="md">MD</SelectItem>
                    <SelectItem value="lg">LG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bi('المسافة بين الشعارات', 'Gap')}</Label>
                <Select value={current.gap_size} onValueChange={(v) => onChange({ ...current, gap_size: v as PartnerShowcaseSettingsDraft['gap_size'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">SM</SelectItem>
                    <SelectItem value="md">MD</SelectItem>
                    <SelectItem value="lg">LG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bi('نمط الخلفية', 'Style variant')}</Label>
                <Select value={current.style_variant} onValueChange={(v) => onChange({ ...current, style_variant: v as PartnerShowcaseSettingsDraft['style_variant'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="muted">Muted</SelectItem>
                    <SelectItem value="bordered">Bordered</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToggleRow label={bi('إيقاف عند المرور', 'Pause on hover')} checked={current.pause_on_hover}
                onChange={(v) => onChange({ ...current, pause_on_hover: v })} />
              <ToggleRow label={bi('إظهار الأسهم', 'Show arrows')} checked={current.show_arrows}
                onChange={(v) => onChange({ ...current, show_arrows: v })} />
              <ToggleRow label={bi('Grayscale', 'Grayscale')} checked={current.grayscale}
                onChange={(v) => onChange({ ...current, grayscale: v })} />
              <ToggleRow label={bi('فتح بتبويب جديد', 'Open in new tab')} checked={current.open_in_new_tab}
                onChange={(v) => onChange({ ...current, open_in_new_tab: v })} />
            </div>

            <div className="flex items-center justify-end gap-2">
              {dirty && (
                <Button variant="ghost" onClick={onCancel}>
                  {bi('إلغاء', 'Cancel')}
                </Button>
              )}
              <Button
                disabled={!dirty || saving}
                onClick={onSave}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                {bi('حفظ الإعدادات', 'Save settings')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PartnerShowcaseEditorPanel;