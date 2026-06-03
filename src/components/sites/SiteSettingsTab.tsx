import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, QrCode, Eye, EyeOff, Archive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  site: {
    id: string; site_name: string | null; label: string; site_type: string | null;
    visibility: string | null; contact_name: string | null; contact_phone: string | null;
    access_notes: string | null; qr_enabled?: boolean | null;
  };
  canManage: boolean;
  onSaved?: () => void;
}

export const SiteSettingsTab: React.FC<Props> = ({ site, canManage, onSaved }) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [f, setF] = useState({
    site_name: site.site_name ?? '',
    label: site.label ?? '',
    site_type: site.site_type ?? 'other',
    visibility: site.visibility ?? 'private',
    contact_name: site.contact_name ?? '',
    contact_phone: site.contact_phone ?? '',
    access_notes: site.access_notes ?? '',
    qr_enabled: site.qr_enabled ?? false,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('client_sites').update({
        site_name: f.site_name.trim() || null,
        label: f.label.trim() || 'Site',
        site_type: f.site_type,
        visibility: f.visibility,
        contact_name: f.contact_name.trim() || null,
        contact_phone: f.contact_phone.trim() || null,
        access_notes: f.access_notes.trim() || null,
        qr_enabled: f.qr_enabled,
      }).eq('id', site.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['client-site', site.id] });
      onSaved?.();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const archiveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('client_sites')
        .update({ archived_at: new Date().toISOString() }).eq('id', site.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تم أرشفة الموقع' : 'Site archived'); onSaved?.(); },
  });

  const visIcon = f.visibility === 'public' ? Eye : EyeOff;

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-5 space-y-3">
        <h3 className="font-semibold">{isRTL ? 'البيانات الأساسية' : 'Basic info'}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={isRTL ? 'اسم الموقع' : 'Site name'} value={f.site_name}
            onChange={(v) => setF({ ...f, site_name: v })} disabled={!canManage} />
          <Field label={isRTL ? 'الوسم' : 'Label'} value={f.label}
            onChange={(v) => setF({ ...f, label: v })} disabled={!canManage} />
          <FieldSel label={isRTL ? 'النوع' : 'Type'} value={f.site_type}
            onChange={(v) => setF({ ...f, site_type: v })}
            options={[
              { v: 'villa', l: isRTL ? 'فيلا' : 'Villa' },
              { v: 'apartment', l: isRTL ? 'شقة' : 'Apartment' },
              { v: 'office', l: isRTL ? 'مكتب' : 'Office' },
              { v: 'showroom', l: isRTL ? 'صالة عرض' : 'Showroom' },
              { v: 'branch', l: isRTL ? 'فرع' : 'Branch' },
              { v: 'warehouse', l: isRTL ? 'مستودع' : 'Warehouse' },
              { v: 'project', l: isRTL ? 'مشروع' : 'Project' },
              { v: 'commercial', l: isRTL ? 'تجاري' : 'Commercial' },
              { v: 'other', l: isRTL ? 'أخرى' : 'Other' },
            ]} disabled={!canManage} />
          <FieldSel label={isRTL ? 'الظهور' : 'Visibility'} value={f.visibility}
            onChange={(v) => setF({ ...f, visibility: v })}
            options={[
              { v: 'private', l: isRTL ? 'خاص' : 'Private' },
              { v: 'limited', l: isRTL ? 'محدود' : 'Limited' },
              { v: 'public', l: isRTL ? 'عام' : 'Public' },
            ]} disabled={!canManage} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-3">
        <h3 className="font-semibold">{isRTL ? 'جهة الاتصال الافتراضية' : 'Default contact'}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={isRTL ? 'الاسم' : 'Name'} value={f.contact_name}
            onChange={(v) => setF({ ...f, contact_name: v })} disabled={!canManage} />
          <Field label={isRTL ? 'الهاتف' : 'Phone'} value={f.contact_phone} mono
            onChange={(v) => setF({ ...f, contact_phone: v })} disabled={!canManage} />
        </div>
        <label className="space-y-1 block text-xs">
          <span className="text-muted-foreground">{isRTL ? 'ملاحظات الوصول' : 'Access notes'}</span>
          <Textarea value={f.access_notes} onChange={(e) => setF({ ...f, access_notes: e.target.value })}
            disabled={!canManage} dir="auto" rows={3} />
        </label>
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" />{isRTL ? 'إعدادات QR' : 'QR settings'}</h3>
        <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
          <div className="text-sm">
            <div className="font-medium">{isRTL ? 'تفعيل QR الموقع' : 'Enable site QR'}</div>
            <div className="text-xs text-muted-foreground">{isRTL ? 'يتيح للزوار الوصول السريع لمعلومات الموقع' : 'Lets visitors quickly access site info'}</div>
          </div>
          <Switch
            checked={f.qr_enabled || f.visibility === 'shared_by_qr'}
            onCheckedChange={(v) => setF({ ...f, qr_enabled: v, visibility: v && f.visibility === 'private' ? 'shared_by_qr' : f.visibility })}
            disabled={!canManage}
          />
        </div>
        {f.visibility === 'shared_by_qr' && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-2.5">
            <QrCode className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>{isRTL ? 'الرؤية مضبوطة على «مشاركة عبر QR» — يتم تفعيل الـQR تلقائياً.' : 'Visibility is set to "Shared by QR" — QR is auto-enabled.'}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <EyeIcon visibility={f.visibility} />
            <span className="ms-1 tech-content">{f.visibility}</span>
          </Badge>
        </div>
      </CardContent></Card>

      {canManage && (
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => archiveMut.mutate()} className="text-destructive hover:text-destructive">
            <Archive className="h-4 w-4" /><span className="mx-2">{isRTL ? 'أرشفة الموقع' : 'Archive site'}</span>
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="mx-2">{isRTL ? 'حفظ التغييرات' : 'Save changes'}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; mono?: boolean; disabled?: boolean }> = ({ label, value, onChange, mono, disabled }) => (
  <label className="space-y-1 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <Input value={value} onChange={(e) => onChange(e.target.value)} dir="auto" disabled={disabled}
      className={mono ? 'tech-content h-10' : 'h-10'} />
  </label>
);
const FieldSel: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; disabled?: boolean }> = ({ label, value, onChange, options, disabled }) => (
  <label className="space-y-1 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60">
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </label>
);
const EyeIcon: React.FC<{ visibility: string }> = ({ visibility }) => visibility === 'public'
  ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />;

export default SiteSettingsTab;