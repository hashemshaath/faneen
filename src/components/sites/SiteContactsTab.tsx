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
import { Switch } from '@/components/ui/switch';
import {
  Plus, Phone, Mail, MessageCircle, Trash2, Star, ShieldCheck,
  Hammer, HardHat, Shield, User as UserIcon, Wrench, FileText, Save,
  PhoneCall, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ContactRow {
  id: string;
  site_id: string;
  full_name: string;
  role_code: string;
  role_label: string | null;
  scope_category: string | null;
  trade: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  responsibilities: string | null;
  permissions: { can_approve?: boolean; can_view_financials?: boolean; can_receive_reports?: boolean } | null;
  contract_id: string | null;
  notes: string | null;
  sort_order: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

const ROLES: { id: string; ar: string; en: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { id: 'owner',    ar: 'المالك',         en: 'Owner',           icon: Star,       tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  { id: 'engineer', ar: 'المهندس',        en: 'Engineer',        icon: HardHat,    tone: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  { id: 'foreman',  ar: 'مشرف الموقع',     en: 'Foreman',         icon: Hammer,     tone: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' },
  { id: 'guard',    ar: 'الحارس',         en: 'Guard',           icon: Shield,     tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  { id: 'supplier', ar: 'مزود/مقاول',     en: 'Supplier',        icon: Wrench,     tone: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' },
  { id: 'other',    ar: 'أخرى',           en: 'Other',           icon: UserIcon,   tone: 'bg-muted text-muted-foreground' },
];

const TRADES = [
  { id: '', ar: '— عام —', en: '— General —' },
  { id: 'aluminum', ar: 'ألمنيوم', en: 'Aluminum' },
  { id: 'glass', ar: 'زجاج', en: 'Glass' },
  { id: 'wood', ar: 'خشب', en: 'Wood' },
  { id: 'steel', ar: 'حديد', en: 'Steel' },
  { id: 'electrical', ar: 'كهرباء', en: 'Electrical' },
  { id: 'plumbing', ar: 'سباكة', en: 'Plumbing' },
  { id: 'civil', ar: 'مدني', en: 'Civil' },
];

interface Props {
  siteId: string;
  contracts: { id: string; label: string }[];
  canManage: boolean;
}

const emptyForm = {
  full_name: '', role_code: 'engineer', role_label: '', trade: '',
  phone: '', email: '', whatsapp: '', responsibilities: '', notes: '',
  contract_id: '',
  can_approve: false, can_view_financials: false, can_receive_reports: true,
  is_primary: false,
};

export const SiteContactsTab: React.FC<Props> = ({ siteId, contracts, canManage }) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [logFor, setLogFor] = useState<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['site-contacts', siteId],
    queryFn: async (): Promise<ContactRow[]> => {
      const { data, error } = await supabase
        .from('site_contacts')
        .select('*')
        .eq('site_id', siteId)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContactRow[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error(isRTL ? 'الاسم مطلوب' : 'Name is required');
      const { error } = await supabase.from('site_contacts').insert({
        site_id: siteId,
        full_name: form.full_name.trim(),
        role_code: form.role_code,
        role_label: form.role_label.trim() || null,
        trade: form.trade || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        responsibilities: form.responsibilities.trim() || null,
        notes: form.notes.trim() || null,
        contract_id: form.contract_id || null,
        is_primary: form.is_primary,
        permissions: {
          can_approve: form.can_approve,
          can_view_financials: form.can_view_financials,
          can_receive_reports: form.can_receive_reports,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إضافة جهة الاتصال' : 'Contact added');
      setForm(emptyForm); setAdding(false);
      qc.invalidateQueries({ queryKey: ['site-contacts', siteId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('site_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-contacts', siteId] }),
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding((s) => !s)} className="hover-lift">
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="mx-2">{adding ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة جهة اتصال' : 'Add contact')}</span>
          </Button>
        </div>
      )}

      {adding && canManage && (
        <Card className="border-primary/40"><CardContent className="p-5 space-y-3">
          <h3 className="font-semibold">{isRTL ? 'جهة اتصال جديدة' : 'New contact'}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <FieldSelect label={isRTL ? 'الدور' : 'Role'} value={form.role_code}
              onChange={(v) => setForm({ ...form, role_code: v })}
              options={ROLES.map((r) => ({ value: r.id, label: isRTL ? r.ar : r.en }))} />
            <FieldSelect label={isRTL ? 'التخصص' : 'Trade'} value={form.trade}
              onChange={(v) => setForm({ ...form, trade: v })}
              options={TRADES.map((t) => ({ value: t.id, label: isRTL ? t.ar : t.en }))} />
            <FieldInput label={isRTL ? 'الاسم الكامل *' : 'Full name *'} value={form.full_name}
              onChange={(v) => setForm({ ...form, full_name: v })} />
            <FieldInput label={isRTL ? 'مسمى مخصص' : 'Custom title'} value={form.role_label}
              onChange={(v) => setForm({ ...form, role_label: v })} />
            <FieldInput label={isRTL ? 'الهاتف' : 'Phone'} value={form.phone} mono
              onChange={(v) => setForm({ ...form, phone: v })} />
            <FieldInput label={isRTL ? 'واتساب' : 'WhatsApp'} value={form.whatsapp} mono
              onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <FieldInput label={isRTL ? 'البريد' : 'Email'} value={form.email} mono
              onChange={(v) => setForm({ ...form, email: v })} />
            <FieldSelect label={isRTL ? 'عقد مرجعي' : 'Reference contract'} value={form.contract_id}
              onChange={(v) => setForm({ ...form, contract_id: v })}
              options={[{ value: '', label: isRTL ? '— لا يوجد —' : '— None —' }, ...contracts.map((c) => ({ value: c.id, label: c.label }))]} />
          </div>
          <FieldTextarea label={isRTL ? 'حدود المسؤولية / المهام' : 'Responsibilities / scope'} value={form.responsibilities}
            onChange={(v) => setForm({ ...form, responsibilities: v })} />
          <FieldTextarea label={isRTL ? 'ملاحظات' : 'Notes'} value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })} />
          <div className="rounded-xl border border-border/40 p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-semibold flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{isRTL ? 'الصلاحيات' : 'Permissions'}</div>
            <PermToggle label={isRTL ? 'يستلم البلاغات' : 'Receives reports'} checked={form.can_receive_reports}
              onChange={(v) => setForm({ ...form, can_receive_reports: v })} />
            <PermToggle label={isRTL ? 'يعتمد القرارات' : 'Can approve'} checked={form.can_approve}
              onChange={(v) => setForm({ ...form, can_approve: v })} />
            <PermToggle label={isRTL ? 'يطلع على الماليات' : 'Views financials'} checked={form.can_view_financials}
              onChange={(v) => setForm({ ...form, can_view_financials: v })} />
            <PermToggle label={isRTL ? 'جهة اتصال أساسية' : 'Primary contact'} checked={form.is_primary}
              onChange={(v) => setForm({ ...form, is_primary: v })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setForm(emptyForm); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              <Save className="h-4 w-4" /><span className="mx-2">{isRTL ? 'حفظ' : 'Save'}</span>
            </Button>
          </div>
        </CardContent></Card>
      )}

      {contacts.length === 0 && !adding ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد جهات اتصال للموقع بعد.' : 'No site contacts yet.'}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {contacts.map((c) => {
            const role = ROLES.find((r) => r.id === c.role_code) || ROLES[ROLES.length - 1];
            const Icon = role.icon;
            const trade = TRADES.find((t) => t.id === c.trade);
            return (
              <Card key={c.id} className="hover-lift overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', role.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold truncate">{c.full_name}</h4>
                        {c.is_primary && <Badge className="bg-amber-500 text-white text-[10px]">{isRTL ? 'أساسي' : 'Primary'}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{c.role_label || (isRTL ? role.ar : role.en)}</span>
                        {trade && trade.id && <span>· {isRTL ? trade.ar : trade.en}</span>}
                      </div>
                    </div>
                    {canManage && (
                      <button onClick={() => deleteMut.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {c.responsibilities && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{c.responsibilities}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {c.permissions?.can_approve && <Perm>{isRTL ? 'اعتماد' : 'Approve'}</Perm>}
                    {c.permissions?.can_view_financials && <Perm>{isRTL ? 'ماليات' : 'Financials'}</Perm>}
                    {c.permissions?.can_receive_reports && <Perm>{isRTL ? 'بلاغات' : 'Reports'}</Perm>}
                  </div>

                  <div className="flex items-center gap-2 border-t border-border/40 pt-3">
                    {c.phone && <QuickAction href={`tel:${c.phone}`} icon={Phone} label={isRTL ? 'اتصال' : 'Call'} />}
                    {c.whatsapp && <QuickAction href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} icon={MessageCircle} label="WhatsApp" external />}
                    {c.email && <QuickAction href={`mailto:${c.email}`} icon={Mail} label="Email" />}
                    {canManage && (
                      <Button size="sm" variant="ghost" className="ms-auto h-8 px-2" onClick={() => setLogFor(logFor === c.id ? null : c.id)}>
                        <PhoneCall className="h-3.5 w-3.5" />
                        <span className="mx-1 text-xs">{isRTL ? 'سجل' : 'Log'}</span>
                      </Button>
                    )}
                  </div>

                  {logFor === c.id && <CommLogInline siteId={siteId} contactId={c.id} onDone={() => setLogFor(null)} />}

                  {c.contract_id && (
                    <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {isRTL ? 'مرتبط بعقد' : 'Linked to contract'}: <a className="text-primary hover:underline" href={`/dashboard/contracts/${c.contract_id}`}>{contracts.find((cc) => cc.id === c.contract_id)?.label ?? c.contract_id.slice(0, 8)}</a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ----- helpers ----- */

const FieldInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; mono?: boolean }> = ({ label, value, onChange, mono }) => (
  <label className="space-y-1 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <Input value={value} onChange={(e) => onChange(e.target.value)} dir="auto" className={cn('h-10', mono && 'tech-content')} />
  </label>
);
const FieldTextarea: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="space-y-1 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <Textarea value={value} onChange={(e) => onChange(e.target.value)} dir="auto" rows={3} />
  </label>
);
const FieldSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }> = ({ label, value, onChange, options }) => (
  <label className="space-y-1 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);
const PermToggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between text-sm">
    <span>{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);
const Perm: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-medium">{children}</span>
);
const QuickAction: React.FC<{ href: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean }> = ({ href, icon: Icon, label, external }) => (
  <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
    className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-muted transition">
    <Icon className="h-3.5 w-3.5" /><span>{label}</span>
  </a>
);

const CommLogInline: React.FC<{ siteId: string; contactId: string; onDone: () => void }> = ({ siteId, contactId, onDone }) => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<'call' | 'whatsapp' | 'email' | 'visit' | 'note'>('call');
  const [summary, setSummary] = useState('');

  const { data: log = [] } = useQuery({
    queryKey: ['contact-comms', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_contact_communications')
        .select('id, channel, direction, summary, occurred_at')
        .eq('contact_id', contactId).order('occurred_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!summary.trim()) return;
    const { error } = await supabase.from('site_contact_communications').insert({
      site_id: siteId, contact_id: contactId, channel, summary: summary.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setSummary(''); qc.invalidateQueries({ queryKey: ['contact-comms', contactId] });
    toast.success(isRTL ? 'تم تسجيل التواصل' : 'Logged');
  };

  return (
    <div className="rounded-lg border border-border/40 bg-muted/30 p-2 space-y-2">
      <div className="flex gap-2">
        <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="call">{isRTL ? 'اتصال' : 'Call'}</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">{isRTL ? 'بريد' : 'Email'}</option>
          <option value="visit">{isRTL ? 'زيارة' : 'Visit'}</option>
          <option value="note">{isRTL ? 'ملاحظة' : 'Note'}</option>
        </select>
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} className="h-8 text-xs"
          placeholder={isRTL ? 'ملخص التواصل…' : 'Communication summary…'} />
        <Button size="sm" className="h-8" onClick={save}>{isRTL ? 'حفظ' : 'Save'}</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onDone}>{isRTL ? 'إغلاق' : 'Close'}</Button>
      </div>
      {log.length > 0 && (
        <ul className="space-y-1 text-[11px]">
          {log.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline" className="text-[9px] py-0">{l.channel}</Badge>
              <span className="truncate flex-1">{l.summary || '—'}</span>
              <span className="tech-content">{new Date(l.occurred_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SiteContactsTab;