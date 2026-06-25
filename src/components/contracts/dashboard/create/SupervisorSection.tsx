/**
 * Project Supervisor picker.
 *  - When a site is selected, lists existing site_contacts as choices.
 *  - "Add new" toggles an inline form (name/phone/email + optional save to
 *    site contacts when a site is selected).
 *  - When no site is selected, only the manual inline form is available.
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Plus, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
  /** Optional: when provided, supervisors can be picked from / saved to this site. */
  selectedSiteId?: string | null;
}

interface SupervisorOption {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

export const SupervisorSection: React.FC<Props> = ({ isRTL, form, setForm, selectedSiteId }) => {
  const qc = useQueryClient();
  const [adding, setAdding] = React.useState(false);
  const [newSup, setNewSup] = React.useState({ name: '', phone: '', email: '', save: true });

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['supervisor-options', selectedSiteId ?? null],
    queryFn: async () => {
      if (!selectedSiteId) return [] as SupervisorOption[];
      const { data, error } = await supabase
        .from('site_contacts')
        .select('id, full_name, phone, email')
        .eq('site_id', selectedSiteId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) return [];
      return (data ?? []) as SupervisorOption[];
    },
    enabled: !!selectedSiteId,
  });

  const pick = (opt: SupervisorOption) => {
    setForm(f => ({
      ...f,
      supervisor_name: opt.full_name ?? '',
      supervisor_phone: opt.phone ?? '',
      supervisor_email: opt.email ?? '',
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const name = newSup.name.trim();
      if (!name) throw new Error('NAME_REQUIRED');
      const phone = newSup.phone.trim();
      const email = newSup.email.trim();
      // Duplicate guard — match by name/phone/email (case-insensitive).
      const dup = options.find(o =>
        (o.full_name && o.full_name.trim().toLowerCase() === name.toLowerCase()) ||
        (phone && o.phone && o.phone.trim() === phone) ||
        (email && o.email && o.email.trim().toLowerCase() === email.toLowerCase())
      );
      if (dup) throw new Error('DUPLICATE');
      // Always fill the form fields locally.
      setForm(f => ({
        ...f,
        supervisor_name: name,
        supervisor_phone: phone,
        supervisor_email: email,
      }));
      // Optionally persist as a site contact when a site is selected.
      if (newSup.save && selectedSiteId) {
        const { data: auth } = await getCurrentUser();
        const uid = auth?.user?.id;
        if (!uid) throw new Error('NOT_AUTHENTICATED');
        const { error } = await supabase
          .from('site_contacts')
          .insert({
            site_id: selectedSiteId,
            created_by: uid,
            full_name: name,
            phone: phone || null,
            email: email || null,
            role_code: 'supervisor',
            role_label: isRTL ? 'مشرف المشروع' : 'Project Supervisor',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تمت إضافة المشرف' : 'Supervisor added');
      setAdding(false);
      setNewSup({ name: '', phone: '', email: '', save: true });
      if (selectedSiteId) qc.invalidateQueries({ queryKey: ['supervisor-options', selectedSiteId] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'NAME_REQUIRED') return toast.error(isRTL ? 'الاسم مطلوب' : 'Name is required');
      if (msg === 'DUPLICATE') return toast.error(isRTL ? 'هذا المشرف مسجّل مسبقاً' : 'This supervisor already exists');
      toast.error(isRTL ? `تعذرت الإضافة: ${msg}` : `Could not add: ${msg}`);
    },
  });

  const currentName = form.supervisor_name?.trim() ?? '';

  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          {isRTL ? 'مشرف المشروع' : 'Project Supervisor'}
        </h4>
        {!adding && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3" />
            {isRTL ? 'إضافة مشرف جديد' : 'Add new supervisor'}
          </Button>
        )}
      </div>

      {/* Picker (only when a site is selected and options exist) */}
      {selectedSiteId && !isLoading && options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map(opt => {
            const selected = currentName && opt.full_name === currentName;
            return (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className="h-7 text-[11px] gap-1"
                onClick={() => pick(opt)}
              >
                {selected && <Check className="w-3 h-3" />}
                {opt.full_name}
              </Button>
            );
          })}
        </div>
      )}

      {selectedSiteId && !isLoading && options.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground">
          {isRTL ? 'لا يوجد مشرفون محفوظون لهذا الموقع — أضف مشرفاً جديداً.' : 'No saved supervisors for this site — add one.'}
        </p>
      )}

      {/* Inline add form */}
      {adding && (
        <div className="space-y-2 rounded-lg border border-border/40 p-3 bg-background/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder={isRTL ? 'الاسم' : 'Name'} value={newSup.name} onChange={e => setNewSup(s => ({ ...s, name: e.target.value }))} className="h-9 text-xs" />
            <Input placeholder={isRTL ? 'الجوال' : 'Phone'} value={newSup.phone} onChange={e => setNewSup(s => ({ ...s, phone: e.target.value }))} dir="ltr" className="h-9 text-xs" />
            <Input placeholder={isRTL ? 'البريد' : 'Email'} value={newSup.email} onChange={e => setNewSup(s => ({ ...s, email: e.target.value }))} dir="ltr" className="h-9 text-xs" />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {selectedSiteId ? (
              <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <Checkbox checked={newSup.save} onCheckedChange={(v) => setNewSup(s => ({ ...s, save: !!v }))} />
                {isRTL ? 'حفظ كجهة اتصال للموقع' : 'Save as a site contact'}
              </Label>
            ) : <span className="text-[11px] text-muted-foreground">{isRTL ? 'لن يُحفظ إلا بعد اختيار موقع' : 'Will not be saved until a site is selected'}</span>}
            <div className="flex items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setAdding(false); setNewSup({ name: '', phone: '', email: '', save: true }); }}>
                <X className="w-3 h-3" />
              </Button>
              <Button type="button" size="sm" className="h-7 text-[11px] gap-1" disabled={save.isPending || !newSup.name.trim()} onClick={() => save.mutate()}>
                {save.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {isRTL ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only summary of the chosen supervisor */}
      {!adding && currentName && (
        <div className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{currentName}</span>
          {form.supervisor_phone ? ` • ${form.supervisor_phone}` : ''}
          {form.supervisor_email ? ` • ${form.supervisor_email}` : ''}
        </div>
      )}
    </div>
  );
};

export default SupervisorSection;