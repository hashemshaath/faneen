import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, X, AlertTriangle, CheckCircle2, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SEVERITY_TONE: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};
const STATUS_TONE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  closed: 'bg-muted text-muted-foreground',
};

interface ReportRow {
  id: string; site_id: string; contact_id: string | null; contract_id: string | null;
  report_type: string; severity: string; title: string; description: string | null;
  status: string; created_at: string; resolved_at: string | null;
}

interface Props {
  siteId: string;
  contacts: { id: string; full_name: string; role_code: string }[];
  contracts: { id: string; label: string }[];
  canManage: boolean;
}

const emptyForm = {
  title: '', description: '', report_type: 'issue', severity: 'medium',
  contact_id: '', contract_id: '',
};

export const SiteReportsTab: React.FC<Props> = ({ siteId, contacts, contracts, canManage }) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<string>('all');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['site-reports', siteId],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from('site_reports').select('*')
        .eq('site_id', siteId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error(isRTL ? 'العنوان مطلوب' : 'Title required');
      const { error } = await supabase.from('site_reports').insert({
        site_id: siteId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        report_type: form.report_type,
        severity: form.severity,
        contact_id: form.contact_id || null,
        contract_id: form.contract_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم رفع البلاغ' : 'Report filed');
      setForm(emptyForm); setAdding(false);
      qc.invalidateQueries({ queryKey: ['site-reports', siteId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('site_reports').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-reports', siteId] }),
  });

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('rounded-full border px-3 py-1 text-xs transition',
                filter === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border/60 hover:bg-muted')}>
              {s === 'all' ? (isRTL ? 'الكل' : 'All') : s}
            </button>
          ))}
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="mx-2">{adding ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'بلاغ جديد' : 'New report')}</span>
          </Button>
        )}
      </div>

      {adding && (
        <Card className="border-primary/40"><CardContent className="p-5 space-y-3">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={isRTL ? 'عنوان البلاغ *' : 'Report title *'} dir="auto" className="h-11" />
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={isRTL ? 'الوصف…' : 'Description…'} dir="auto" rows={3} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Sel value={form.report_type} onChange={(v) => setForm({ ...form, report_type: v })}
              options={[
                { v: 'issue', l: isRTL ? 'مشكلة' : 'Issue' },
                { v: 'complaint', l: isRTL ? 'شكوى' : 'Complaint' },
                { v: 'delay', l: isRTL ? 'تأخير' : 'Delay' },
                { v: 'quality', l: isRTL ? 'جودة' : 'Quality' },
                { v: 'safety', l: isRTL ? 'سلامة' : 'Safety' },
                { v: 'other', l: isRTL ? 'أخرى' : 'Other' },
              ]} />
            <Sel value={form.severity} onChange={(v) => setForm({ ...form, severity: v })}
              options={[
                { v: 'low', l: isRTL ? 'منخفضة' : 'Low' },
                { v: 'medium', l: isRTL ? 'متوسطة' : 'Medium' },
                { v: 'high', l: isRTL ? 'عالية' : 'High' },
                { v: 'urgent', l: isRTL ? 'عاجلة' : 'Urgent' },
              ]} />
            <Sel value={form.contact_id} onChange={(v) => setForm({ ...form, contact_id: v })}
              options={[{ v: '', l: isRTL ? '— عام —' : '— General —' },
                ...contacts.map((c) => ({ v: c.id, l: c.full_name }))]} />
            <Sel value={form.contract_id} onChange={(v) => setForm({ ...form, contract_id: v })}
              options={[{ v: '', l: isRTL ? '— لا عقد —' : '— No contract —' },
                ...contracts.map((c) => ({ v: c.id, l: c.label }))]} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              <Save className="h-4 w-4" /><span className="mx-2">{isRTL ? 'حفظ البلاغ' : 'File report'}</span>
            </Button>
          </div>
        </CardContent></Card>
      )}

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد بلاغات.' : 'No reports.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const contact = contacts.find((c) => c.id === r.contact_id);
            return (
              <Card key={r.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', SEVERITY_TONE[r.severity])}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold truncate">{r.title}</h4>
                        <Badge className={cn('text-[10px]', STATUS_TONE[r.status])}>{r.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.report_type}</Badge>
                        <Badge className={cn('text-[10px]', SEVERITY_TONE[r.severity])}>{r.severity}</Badge>
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.description}</p>}
                      <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span className="tech-content">{new Date(r.created_at).toLocaleString()}</span>
                        {contact && <span>· {isRTL ? 'بخصوص' : 'About'}: <b>{contact.full_name}</b></span>}
                      </div>
                    </div>
                    {canManage && r.status !== 'resolved' && r.status !== 'closed' && (
                      <div className="flex flex-col gap-1">
                        {r.status === 'open' && (
                          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setStatus.mutate({ id: r.id, status: 'in_progress' })}>
                            {isRTL ? 'قيد المعالجة' : 'In progress'}
                          </Button>
                        )}
                        <Button size="sm" className="h-7 text-xs" onClick={() => setStatus.mutate({ id: r.id, status: 'resolved' })}>
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="mx-1">{isRTL ? 'حُلّ' : 'Resolve'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sel: React.FC<{ value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }> = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="h-10 rounded-md border border-input bg-background px-2 text-sm">
    {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

export default SiteReportsTab;