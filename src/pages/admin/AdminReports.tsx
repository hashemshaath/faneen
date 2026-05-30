import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { buildCsv, downloadCsv, defaultRange, type DateRange } from '@/lib/admin-reports-csv';
import { Download, FileSpreadsheet, Loader2, FileText, Users, Building2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type ReportKey = 'contracts' | 'users' | 'businesses' | 'revenue';

interface ReportDef {
  key: ReportKey;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: typeof FileText;
  fetch: (range: DateRange) => Promise<{ rows: Record<string, unknown>[]; headers: readonly string[] }>;
}

const REPORTS: ReportDef[] = [
  {
    key: 'contracts',
    titleAr: 'تقرير العقود',
    titleEn: 'Contracts Report',
    descAr: 'كل العقود في الفترة المختارة (الرقم، الأطراف، الحالة، المبلغ، التواريخ)',
    descEn: 'All contracts in the selected period (number, parties, status, amount, dates)',
    icon: FileText,
    async fetch(range) {
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_number, status, total_amount, currency_code, start_date, end_date, created_at, client_id, provider_id, business_id')
        .gte('created_at', `${range.from}T00:00:00Z`)
        .lte('created_at', `${range.to}T23:59:59Z`)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const headers = ['contract_number','status','total_amount','currency_code','start_date','end_date','created_at','client_id','provider_id','business_id'] as const;
      return { rows: (data ?? []) as Record<string, unknown>[], headers };
    },
  },
  {
    key: 'users',
    titleAr: 'تقرير المستخدمين',
    titleEn: 'Users Report',
    descAr: 'المستخدمون الذين تم إنشاؤهم خلال الفترة (المعرف، الإيميل، الاسم، تاريخ الإنشاء)',
    descEn: 'Users created in the selected period (id, email, name, created)',
    icon: Users,
    async fetch(range) {
      const { data, error } = await supabase
        .from('profiles')
        .select('ref_id, email, full_name, account_type, created_at, country_id')
        .gte('created_at', `${range.from}T00:00:00Z`)
        .lte('created_at', `${range.to}T23:59:59Z`)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const headers = ['ref_id','email','full_name','account_type','created_at','country_id'] as const;
      return { rows: (data ?? []) as Record<string, unknown>[], headers };
    },
  },
  {
    key: 'businesses',
    titleAr: 'تقرير المنشآت',
    titleEn: 'Businesses Report',
    descAr: 'المنشآت المسجلة في الفترة (الاسم، النوع، التحقق، تاريخ الإنشاء)',
    descEn: 'Businesses registered in the selected period (name, type, verified, created)',
    icon: Building2,
    async fetch(range) {
      const { data, error } = await supabase
        .from('businesses')
        .select('ref_id, name_ar, name_en, approval_status, created_at, user_id')
        .gte('created_at', `${range.from}T00:00:00Z`)
        .lte('created_at', `${range.to}T23:59:59Z`)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const headers = ['ref_id','name_ar','name_en','approval_status','created_at','user_id'] as const;
      return { rows: (data ?? []) as Record<string, unknown>[], headers };
    },
  },
  {
    key: 'revenue',
    titleAr: 'تقرير الإيرادات (عقود نشطة/مكتملة)',
    titleEn: 'Revenue Report (active/completed contracts)',
    descAr: 'إجمالي قيمة العقود النشطة والمكتملة في الفترة المختارة',
    descEn: 'Aggregate value of active/completed contracts in the selected period',
    icon: DollarSign,
    async fetch(range) {
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_number, status, total_amount, currency_code, completed_at, created_at, business_id')
        .in('status', ['active', 'completed'])
        .gte('created_at', `${range.from}T00:00:00Z`)
        .lte('created_at', `${range.to}T23:59:59Z`)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const headers = ['contract_number','status','total_amount','currency_code','completed_at','created_at','business_id'] as const;
      return { rows: (data ?? []) as Record<string, unknown>[], headers };
    },
  },
];

export default function AdminReports() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [busy, setBusy] = useState<ReportKey | null>(null);
  const [counts, setCounts] = useState<Partial<Record<ReportKey, number>>>({});

  const handleExport = async (def: ReportDef, format: 'csv' | 'xlsx' = 'csv') => {
    setBusy(def.key);
    try {
      const { rows, headers } = await def.fetch(range);
      if (rows.length === 0) {
        toast.info(isRTL ? 'لا توجد بيانات في الفترة المختارة' : 'No data in selected period');
        setCounts((c) => ({ ...c, [def.key]: 0 }));
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        const csv = buildCsv(rows, headers);
        downloadCsv(`${def.key}_${range.from}_${range.to}_${stamp}.csv`, csv);
      } else {
        const ws = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, def.key.slice(0, 30));
        XLSX.writeFile(wb, `${def.key}_${range.from}_${range.to}_${stamp}.xlsx`);
      }
      setCounts((c) => ({ ...c, [def.key]: rows.length }));
      toast.success(
        isRTL ? `تم تصدير ${rows.length} سجل` : `Exported ${rows.length} rows`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold">
              <Bi ar="مركز التقارير" en="Reports Center" />
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            <Bi
              ar="صدّر تقارير CSV جاهزة (متوافقة مع Excel العربي) عن العقود والمستخدمين والمنشآت والإيرادات."
              en="Export ready CSV reports (Arabic-Excel compatible) for contracts, users, businesses, and revenue."
            />
          </p>
        </header>

        <Card className="p-4 surface-card">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground"><Bi ar="من" en="From" /></label>
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="h-11 rounded-xl tech-content w-44"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground"><Bi ar="إلى" en="To" /></label>
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="h-11 rounded-xl tech-content w-44"
              />
            </div>
            <div className="flex gap-2 ms-auto">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant="outline"
                  size="sm"
                  onClick={() => setRange(defaultRange(d))}
                  className="h-9 rounded-lg"
                >
                  {isRTL ? `آخر ${d} يوم` : `Last ${d}d`}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          {REPORTS.map((def) => {
            const Icon = def.icon;
            const count = counts[def.key];
            const isBusy = busy === def.key;
            return (
              <Card key={def.key} className="p-5 surface-card hover-lift">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold">
                      {isRTL ? def.titleAr : def.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isRTL ? def.descAr : def.descEn}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground tech-content">
                    {count !== undefined ? (
                      isRTL ? `آخر تصدير: ${count} سجل` : `Last export: ${count} rows`
                    ) : ''}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExport(def, 'csv')}
                      disabled={isBusy}
                      variant="outline"
                      className="h-10 rounded-xl"
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 mx-2 animate-spin" /> : <Download className="w-4 h-4 mx-2" />}
                      CSV
                    </Button>
                    <Button
                      onClick={() => handleExport(def, 'xlsx')}
                      disabled={isBusy}
                      className="h-10 rounded-xl"
                    >
                      <FileSpreadsheet className="w-4 h-4 mx-2" />
                      XLSX
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}