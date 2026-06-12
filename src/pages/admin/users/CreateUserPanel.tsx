import React from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pickBi } from '@/components/common/Bilingual';
import { CrQuickScanInline } from '@/components/admin/CrQuickScanInline';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import { PhoneField } from '@/components/forms/PhoneField';
import type { CreateUserForm } from './_shared';

/**
 * PR-5 of the AdminUsers refactor. Inline "Create new user" panel.
 *
 * State stays in the parent: `createForm` + `setCreateForm` are controlled
 * props so the CR scan onParsed merge logic, ?create=... URL preset, and
 * createUserMutation success/error reset all keep working unchanged.
 */
export type CreateUserPanelProps = {
  isRTL: boolean;
  panelRef: React.RefObject<HTMLDivElement>;
  form: CreateUserForm;
  setForm: React.Dispatch<React.SetStateAction<CreateUserForm>>;
  onClose: () => void;
  onSubmit: (form: CreateUserForm) => void;
  isSubmitting: boolean;
};

export const CreateUserPanel = React.memo(({
  isRTL, panelRef, form, setForm, onClose, onSubmit, isSubmitting,
}: CreateUserPanelProps) => (
  <div ref={panelRef} className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 scroll-mt-24">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-heading font-bold text-lg flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center"><UserPlus className="w-4 h-4 text-accent" /></div>
        {pickBi(isRTL, 'إنشاء مستخدم جديد', 'Create New User')}
      </h3>
      <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl" aria-label="Action"><X className="w-4 h-4" /></Button>
    </div>
    <div className="mb-4">
      <CrQuickScanInline
        onParsed={(scan) => {
          setForm((p) => ({
            ...p,
            full_name: p.full_name || scan.owner_name || scan.business_name_ar || scan.business_name_en || '',
            account_type: scan.cr_number ? 'business' : p.account_type,
          }));
        }}
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-3">
        <BilingualNameField
          value={{ full_name_ar: form.full_name_ar, full_name_en: form.full_name_en, username: form.username }}
          onChange={(v) => setForm(p => ({ ...p, full_name_ar: v.full_name_ar, full_name_en: v.full_name_en, username: v.username || '' }))}
          onFullNameChange={(f) => setForm(p => ({ ...p, full_name: f }))}
          required
        />
      </div>
      <div className="space-y-1.5"><Label className="text-xs">{pickBi(isRTL, 'البريد *', 'Email *')}</Label>
        <Input type="email" dir="ltr" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-10 rounded-xl" /></div>
      <div className="space-y-1.5"><Label className="text-xs">{pickBi(isRTL, 'كلمة المرور *', 'Password *')}</Label>
        <Input type="text" dir="ltr" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="h-10 rounded-xl tech-content" placeholder="8+ chars" /></div>
      <PhoneField
        value={{ countryCode: form.phone_country_code, national: form.phone_national }}
        onChange={(v) => setForm(p => ({ ...p, phone_country_code: v.countryCode, phone_national: v.national }))}
        onE164Change={(e164) => setForm(p => ({ ...p, phone: e164 }))}
        optional
      />
      <div className="space-y-1.5"><Label className="text-xs">{pickBi(isRTL, 'نوع الحساب', 'Account Type')}</Label>
        <Select value={form.account_type} onValueChange={v => setForm(p => ({ ...p, account_type: v }))}>
          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">{pickBi(isRTL, 'فرد', 'Individual')}</SelectItem>
            <SelectItem value="business">{pickBi(isRTL, 'مزود خدمة', 'Provider')}</SelectItem>
            <SelectItem value="company">{pickBi(isRTL, 'شركة', 'Company')}</SelectItem>
          </SelectContent>
        </Select></div>
      <div className="space-y-1.5"><Label className="text-xs">{pickBi(isRTL, 'العضوية', 'Tier')}</Label>
        <Select value={form.membership_tier} onValueChange={v => setForm(p => ({ ...p, membership_tier: v }))}>
          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="free">{pickBi(isRTL, 'مجاني', 'Free')}</SelectItem>
            <SelectItem value="basic">{pickBi(isRTL, 'أساسي', 'Basic')}</SelectItem>
            <SelectItem value="premium">{pickBi(isRTL, 'مميز', 'Premium')}</SelectItem>
            <SelectItem value="enterprise">{pickBi(isRTL, 'مؤسسات', 'Enterprise')}</SelectItem>
          </SelectContent>
        </Select></div>
      <div className="space-y-1.5"><Label className="text-xs">{pickBi(isRTL, 'الصلاحية', 'Role')}</Label>
        <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{pickBi(isRTL, 'بدون', 'None')}</SelectItem>
            <SelectItem value="moderator">{pickBi(isRTL, 'مشرف محتوى', 'Moderator')}</SelectItem>
            <SelectItem value="admin">{pickBi(isRTL, 'مشرف', 'Admin')}</SelectItem>
            <SelectItem value="super_admin">{pickBi(isRTL, 'مشرف أعلى', 'Super Admin')}</SelectItem>
          </SelectContent>
        </Select></div>
    </div>
    <Separator className="my-4" />
    <div className="flex items-center gap-2 justify-end">
      <Button variant="outline" onClick={onClose} className="rounded-xl">{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
      <Button onClick={() => onSubmit(form)} disabled={isSubmitting || !form.email || !form.password || !form.full_name} className="rounded-xl gap-2">
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}{pickBi(isRTL, 'إنشاء', 'Create')}
      </Button>
    </div>
  </div>
));
CreateUserPanel.displayName = 'CreateUserPanel';
