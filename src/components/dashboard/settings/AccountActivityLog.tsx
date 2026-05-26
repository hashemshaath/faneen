import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { Download, History, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';

interface Row {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  full_name: { ar: 'الاسم الكامل', en: 'Full name' },
  full_name_ar: { ar: 'الاسم بالعربية', en: 'Arabic name' },
  full_name_en: { ar: 'الاسم بالإنجليزية', en: 'English name' },
  username: { ar: 'اسم المستخدم', en: 'Username' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  phone: { ar: 'رقم الجوال', en: 'Phone' },
  avatar_url: { ar: 'الصورة الشخصية', en: 'Avatar' },
  preferred_language: { ar: 'اللغة المفضلة', en: 'Preferred language' },
  country_id: { ar: 'الدولة', en: 'Country' },
  city_id: { ar: 'المدينة', en: 'City' },
  national_id: { ar: 'رقم الهوية/الإقامة', en: 'National ID / Iqama' },
  national_id_type: { ar: 'نوع الهوية', en: 'ID type' },
  vat_number: { ar: 'الرقم الضريبي', en: 'VAT number' },
  short_national_address: { ar: 'العنوان الوطني', en: 'Short national address' },
  region_name: { ar: 'المنطقة', en: 'Region' },
  district: { ar: 'الحي', en: 'District' },
  street: { ar: 'الشارع', en: 'Street' },
  building_number: { ar: 'رقم المبنى', en: 'Building number' },
  additional_number: { ar: 'الرقم الإضافي', en: 'Additional number' },
  postal_code: { ar: 'الرمز البريدي', en: 'Postal code' },
  address_line: { ar: 'العنوان التفصيلي', en: 'Address line' },
};

const mask = (field: string, value: string | null): string => {
  if (!value) return '—';
  if (field === 'avatar_url') return value.length > 28 ? `${value.slice(0, 28)}…` : value;
  if (field === 'national_id' || field === 'vat_number') {
    return value.length > 4 ? `••••${value.slice(-4)}` : '••••';
  }
  return value;
};

export const AccountActivityLog: React.FC = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const locale = language === 'ar' ? arLocale : enUS;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['profile-activity-log', user?.id],
    queryFn: async () => {
      if (!user) return [] as Row[];
      const { data, error } = await supabase
        .from('profile_activity_log')
        .select('id, field, old_value, new_value, changed_at')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const csv = useMemo(() => {
    const header = ['changed_at', 'field', 'old_value', 'new_value'];
    const escape = (v: string | null) =>
      v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([r.changed_at, r.field, escape(r.old_value), escape(r.new_value)].join(','));
    }
    return lines.join('\n');
  }, [rows]);

  const downloadCsv = () => {
    if (!rows.length) {
      toast.info(isRTL ? 'لا توجد تغييرات لتنزيلها' : 'No changes to download');
      return;
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تنزيل التقرير' : 'Report downloaded');
  };

  return (
    <Card className="border-border/40">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <h3 className="font-heading font-bold text-sm">
              {isRTL ? 'سجل التغييرات' : 'Activity log'}
            </h3>
            <Badge variant="outline" className="text-[10px] h-5">
              {rows.length}
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={downloadCsv}>
            <Download className="w-3.5 h-3.5" />
            {isRTL ? 'تنزيل CSV' : 'Download CSV'}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin me-2" />
            <span className="text-xs">{isRTL ? 'جارٍ التحميل…' : 'Loading…'}</span>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            {isRTL ? 'لم يتم تسجيل أي تغييرات على حسابك بعد.' : 'No changes recorded on your account yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {rows.map((r) => {
              const label = FIELD_LABELS[r.field]?.[isRTL ? 'ar' : 'en'] ?? r.field;
              return (
                <li key={r.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">{label}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="line-through opacity-70 truncate max-w-[160px] inline-block align-middle">
                        {mask(r.field, r.old_value)}
                      </span>
                      <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                      <span className="text-foreground truncate max-w-[200px] inline-block align-middle">
                        {mask(r.field, r.new_value)}
                      </span>
                    </div>
                  </div>
                  <time className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(r.changed_at), { addSuffix: true, locale })}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountActivityLog;