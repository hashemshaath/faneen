/**
 * Client Sites Phase 2.5A — Owner section visibility settings (inline card).
 *
 * Hard rules:
 *  - No popups/dialogs (inline only).
 *  - Only managers can change visibility (DB also enforces via RPC).
 *  - Sensitive sections cannot be set to public_limited (DB CHECK enforces).
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type VisibilityLevel =
  | 'hidden'
  | 'public_limited'
  | 'visible_after_request'
  | 'visible_after_approval'
  | 'visible_to_approved_provider'
  | 'admin_only';

interface VisibilityRow {
  section_key: string;
  visibility_level: VisibilityLevel;
}

interface Props {
  isRTL: boolean;
  siteId: string;
  siteRef: string;
  /** Sections that the DB forbids from public_limited. */
}

const SECTIONS: { key: string; ar: string; en: string; sensitive?: boolean }[] = [
  { key: 'basic_summary', ar: 'الملخص الأساسي', en: 'Basic summary' },
  { key: 'site_ref', ar: 'معرف الموقع', en: 'Site reference' },
  { key: 'site_type', ar: 'نوع الموقع', en: 'Site type' },
  { key: 'city', ar: 'المدينة', en: 'City' },
  { key: 'district', ar: 'الحي', en: 'District' },
  { key: 'full_address', ar: 'العنوان الكامل', en: 'Full address', sensitive: true },
  { key: 'map_location', ar: 'الموقع على الخريطة', en: 'Map location', sensitive: true },
  { key: 'contact_person', ar: 'جهة الاتصال', en: 'Contact person', sensitive: true },
  { key: 'contact_phone', ar: 'هاتف التواصل', en: 'Contact phone', sensitive: true },
  { key: 'project_description', ar: 'وصف المشروع', en: 'Project description' },
  { key: 'required_services', ar: 'الخدمات المطلوبة', en: 'Required services' },
  { key: 'specifications', ar: 'المواصفات', en: 'Specifications' },
  { key: 'measurements', ar: 'القياسات', en: 'Measurements' },
  { key: 'photos', ar: 'الصور', en: 'Photos' },
  { key: 'attachments', ar: 'المرفقات', en: 'Attachments', sensitive: true },
  { key: 'budget_range', ar: 'نطاق الميزانية', en: 'Budget range' },
  { key: 'preferred_timeline', ar: 'الجدول الزمني', en: 'Preferred timeline' },
  { key: 'contracts', ar: 'العقود', en: 'Contracts', sensitive: true },
  { key: 'previous_visits', ar: 'الزيارات السابقة', en: 'Previous visits', sensitive: true },
  { key: 'notes', ar: 'ملاحظات', en: 'Notes', sensitive: true },
];

const LEVELS: { v: VisibilityLevel; ar: string; en: string }[] = [
  { v: 'hidden', ar: 'مخفي', en: 'Hidden' },
  { v: 'public_limited', ar: 'عام محدود', en: 'Public (limited)' },
  { v: 'visible_after_request', ar: 'بعد الطلب', en: 'After request' },
  { v: 'visible_after_approval', ar: 'بعد الموافقة', en: 'After approval' },
  { v: 'visible_to_approved_provider', ar: 'لمزود معتمد', en: 'Approved provider only' },
  { v: 'admin_only', ar: 'للإدارة فقط', en: 'Admin only' },
];

export const ClientSiteVisibilitySettingsCard: React.FC<Props> = ({ isRTL, siteId, siteRef }) => {
  const qc = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['client-site-visibility', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_site_visibility_settings')
        .select('section_key, visibility_level')
        .eq('site_id', siteId);
      if (error) throw error;
      return (data ?? []) as VisibilityRow[];
    },
  });

  const update = useMutation({
    mutationFn: async (p: { section_key: string; visibility_level: VisibilityLevel }) => {
      const { data, error } = await supabase.rpc('update_site_section_visibility', {
        _site_id: siteId,
        _section_key: p.section_key,
        _visibility_level: p.visibility_level,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-site-visibility', siteId] });
      toast.success(isRTL ? 'تم تحديث الخصوصية' : 'Visibility updated');
    },
    onError: (e: Error) => {
      const msg = e.message || '';
      const friendly = /sensitive_chk|public_limited/i.test(msg)
        ? (isRTL ? 'لا يمكن جعل هذا القسم عاماً' : 'This section cannot be made public')
        : msg;
      toast.error(isRTL ? `تعذر التحديث: ${friendly}` : `Update failed: ${friendly}`);
    },
    onSettled: () => setSavingKey(null),
  });

  const levelOf = (k: string): VisibilityLevel =>
    (rows.find((r) => r.section_key === k)?.visibility_level ?? 'hidden') as VisibilityLevel;

  return (
    <section
      className="space-y-3 p-4 rounded-xl border border-border/40 bg-muted/10"
      aria-labelledby="site-visibility-heading"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Lock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <h3 id="site-visibility-heading" className="text-sm font-semibold">
            {isRTL ? 'إعدادات الخصوصية للموقع' : 'Site visibility settings'}
          </h3>
          <Badge variant="outline" size="sm" className="text-[9px] tech-content" dir="ltr">
            {siteRef}
          </Badge>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {isRTL
          ? 'الأقسام الحساسة (العنوان، الهاتف، الخريطة، المرفقات، العقود) لا يمكن جعلها عامة. الافتراضي مغلق.'
          : 'Sensitive sections (address, phone, map, attachments, contracts) cannot be made public. Default is locked.'}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {isRTL ? 'جارٍ تحميل الإعدادات…' : 'Loading settings…'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SECTIONS.map((s) => {
            const current = levelOf(s.key);
            const isPublic = current === 'public_limited';
            const Icon = current === 'hidden' || current === 'admin_only' ? EyeOff : Eye;
            return (
              <li
                key={s.key}
                className="p-2.5 rounded-lg border border-border/40 bg-background/60 flex items-center gap-2"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`vis-${s.key}`} className="text-[11px] font-semibold truncate flex items-center gap-1">
                    {isRTL ? s.ar : s.en}
                    {s.sensitive && (
                      <AlertTriangle className="w-3 h-3 text-amber-500" aria-label={isRTL ? 'حساس' : 'sensitive'} />
                    )}
                  </Label>
                  <select
                    id={`vis-${s.key}`}
                    value={current}
                    disabled={savingKey === s.key || update.isPending}
                    onChange={(e) => {
                      const v = e.target.value as VisibilityLevel;
                      setSavingKey(s.key);
                      update.mutate({ section_key: s.key, visibility_level: v });
                    }}
                    className="mt-1 w-full h-8 text-[11px] rounded-md border border-border/40 bg-background px-2"
                    aria-label={isRTL ? `مستوى الظهور: ${s.ar}` : `Visibility: ${s.en}`}
                  >
                    {LEVELS.map((l) => (
                      <option
                        key={l.v}
                        value={l.v}
                        disabled={s.sensitive && l.v === 'public_limited'}
                      >
                        {isRTL ? l.ar : l.en}
                      </option>
                    ))}
                  </select>
                </div>
                {isPublic && (
                  <Badge variant="secondary" size="sm" className="text-[9px]">
                    {isRTL ? 'عام' : 'Public'}
                  </Badge>
                )}
                {savingKey === s.key && update.isPending && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ClientSiteVisibilitySettingsCard;