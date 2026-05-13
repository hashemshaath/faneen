/**
 * Phase 3E — Presentational project-supervisor inputs (name/phone/email).
 * Pure UI: parent owns form state and validation.
 */
import React from 'react';
import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
}

export const SupervisorSection: React.FC<Props> = ({ isRTL, form, setForm }) => (
  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
    <h4 className="text-xs font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" />{isRTL ? 'مشرف المشروع' : 'Project Supervisor'}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Input placeholder={isRTL ? 'الاسم' : 'Name'} value={form.supervisor_name} onChange={e => setForm(f => ({ ...f, supervisor_name: e.target.value }))} className="h-10 text-xs" />
      <Input placeholder={isRTL ? 'الجوال' : 'Phone'} value={form.supervisor_phone} onChange={e => setForm(f => ({ ...f, supervisor_phone: e.target.value }))} dir="ltr" className="h-10 text-xs" />
      <Input placeholder={isRTL ? 'البريد' : 'Email'} value={form.supervisor_email} onChange={e => setForm(f => ({ ...f, supervisor_email: e.target.value }))} dir="ltr" className="h-10 text-xs" />
    </div>
  </div>
);

export default SupervisorSection;