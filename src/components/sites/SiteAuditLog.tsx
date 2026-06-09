import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { History, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';
import { listProfilesByUserIds } from '@/modules/users';

interface Row {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  site_name:     { ar: 'اسم الموقع', en: 'Site name' },
  label:         { ar: 'الوسم',       en: 'Label' },
  site_type:     { ar: 'النوع',       en: 'Type' },
  visibility:    { ar: 'الظهور',      en: 'Visibility' },
  qr_enabled:    { ar: 'تفعيل QR',    en: 'QR enabled' },
  contact_name:  { ar: 'اسم جهة الاتصال', en: 'Contact name' },
  contact_phone: { ar: 'هاتف جهة الاتصال', en: 'Contact phone' },
  address_line1: { ar: 'العنوان',     en: 'Address line' },
  short_address: { ar: 'العنوان الوطني', en: 'National address' },
  city_name:     { ar: 'المدينة',     en: 'City' },
  district:      { ar: 'الحي',        en: 'District' },
  access_notes:  { ar: 'ملاحظات الوصول', en: 'Access notes' },
};

function displayVal(v: string | null, isRTL: boolean): string {
  if (v == null || v === '') return isRTL ? '— فارغ —' : '— empty —';
  if (v === 'true') return isRTL ? 'مُفعّل' : 'On';
  if (v === 'false') return isRTL ? 'مُعطّل' : 'Off';
  return v;
}

export const SiteAuditLog: React.FC<{ siteId: string }> = ({ siteId }) => {
  const { isRTL } = useLanguage();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['site-settings-audit', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings_audit')
        .select('id, field, old_value, new_value, changed_by, changed_at')
        .eq('site_id', siteId)
        .order('changed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const userIds = Array.from(new Set(rows.map((r) => r.changed_by).filter((x): x is string => !!x)));
  const { data: actorMap = {} } = useQuery({
    queryKey: ['site-audit-actors', userIds.sort().join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await listProfilesByUserIds<{ user_id: string; full_name: string | null; ref_id: string | null }>({
        userIds,
        select: 'user_id, full_name, ref_id',
      });
      const map: Record<string, { name: string; ref: string | null }> = {};
      for (const p of data ?? []) {
        map[p.user_id] = { name: p.full_name ?? (isRTL ? 'مستخدم' : 'User'), ref: p.ref_id };
      }
      return map;
    },
  });

  const Arrow = isRTL ? ArrowLeftIcon : ArrowRight;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2 pb-2 border-b border-border/40">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">{isRTL ? 'سجل تغييرات الإعدادات' : 'Settings change log'}</h3>
          <Badge variant="outline" className="ms-auto tech-content">{rows.length}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isRTL ? 'لا توجد تغييرات مسجّلة بعد.' : 'No changes recorded yet.'}
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r) => {
              const actor = r.changed_by ? actorMap[r.changed_by] : null;
              const fl = FIELD_LABELS[r.field];
              return (
                <li key={r.id} className="rounded-xl border border-border/40 p-3 hover-lift">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[11px]">{fl ? (isRTL ? fl.ar : fl.en) : r.field}</Badge>
                    <span className="text-[11px] text-muted-foreground tech-content" dir="ltr">
                      {new Date(r.changed_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
                    <span dir="auto" className="rounded-md bg-muted/60 px-2 py-0.5 text-[12px] text-muted-foreground line-through break-all">
                      {displayVal(r.old_value, isRTL)}
                    </span>
                    <Arrow className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span dir="auto" className="rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary break-all">
                      {displayVal(r.new_value, isRTL)}
                    </span>
                  </div>
                  {actor && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {isRTL ? 'بواسطة' : 'by'}{' '}
                      <span className="font-medium text-foreground" dir="auto">{actor.name}</span>
                      {actor.ref && <span className="ms-1 tech-content" dir="ltr">· {actor.ref}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default SiteAuditLog;