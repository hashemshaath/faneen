import React from 'react';
import { Edit, Languages, Loader2, Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pickBi } from '@/components/common/Bilingual';
import { PhoneField, parsePhoneValue, toE164 } from '@/components/forms/PhoneField';
import { NationalAddressForm, type NationalAddressValue } from '@/modules/addresses';
import type {
  BranchCountryOption,
  BranchFormSetter,
  BranchFormState,
  BranchMainContact,
  BranchRow,
  BranchTypeId,
} from './types';

/** Phase 5D — inline branch add/edit form. State/handlers/mutations live in the parent. */
export interface BusinessBranchFormProps {
  isRTL: boolean;
  language: 'ar' | 'en';
  branchForm: BranchFormState;
  setBranchForm: BranchFormSetter;
  editingBranchId: string | null;
  setEditingBranchId: (id: string | null) => void;
  branchTranslating: 'ar' | 'en' | null;
  onTranslate: (from: 'ar' | 'en') => void;
  branches: BranchRow[];
  countries: BranchCountryOption[];
  onSave: () => void;
  saving: boolean;
  /** Main-business contact values used to power the "use main" shortcuts. */
  mainContact?: BranchMainContact;
}

export const BusinessBranchForm: React.FC<BusinessBranchFormProps> = ({
  isRTL,
  language,
  branchForm,
  setBranchForm,
  editingBranchId,
  setEditingBranchId,
  branchTranslating,
  onTranslate,
  branches,
  countries,
  onSave,
  saving,
  mainContact,
}) => {
  /** Inline "use main" pill: copies a value from the parent business
   *  into the branch form so admins don't re-type customer service /
   *  unified number / email / website per branch. Hidden when the
   *  branch IS the main one, when no main value exists, or when the
   *  branch already mirrors the main value. */
  const UseMainBtn: React.FC<{
    mainValue: string | null | undefined;
    currentValue: string;
    onApply: (v: string) => void;
  }> = ({ mainValue, currentValue, onApply }) => {
    const trimmed = (mainValue ?? '').trim();
    if (!trimmed) return null;
    if (branchForm.is_main) return null;
    if (currentValue.trim() === trimmed) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-primary"
        onClick={() => onApply(trimmed)}
        title={pickBi(isRTL, 'استخدام بيانات المركز الرئيسي', 'Use main location value')}
      >
        {pickBi(isRTL, 'استخدم الرئيسي', 'Use main')}
      </Button>
    );
  };

  return (
    <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/[0.03]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
          {editingBranchId ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {editingBranchId
            ? pickBi(isRTL, 'تعديل الفرع', 'Edit Branch')
            : pickBi(isRTL, 'إضافة فرع جديد', 'Add New Branch')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => {
            setBranchForm(null);
            setEditingBranchId(null);
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {pickBi(isRTL, 'اسم الفرع (عربي)', 'Branch Name (AR)')} *
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
            disabled={branchTranslating !== null}
            onClick={() => onTranslate('ar')}
            title={pickBi(isRTL, 'ترجمة من العربي إلى الإنجليزي', 'Translate Arabic → English')}
          >
            {branchTranslating === 'ar' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Languages className="w-3 h-3" />
            )}
            <span>→ EN</span>
          </Button>
        </div>
        <Input
          value={branchForm.name_ar}
          onChange={(e) =>
            setBranchForm((f) => (f ? { ...f, name_ar: e.target.value } : f))
          }
          className="mt-1"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {pickBi(isRTL, 'اسم الفرع (إنجليزي)', 'Branch Name (EN)')}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
            disabled={branchTranslating !== null}
            onClick={() => onTranslate('en')}
            title={pickBi(isRTL, 'ترجمة من الإنجليزي إلى العربي', 'Translate English → Arabic')}
          >
            {branchTranslating === 'en' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Languages className="w-3 h-3" />
            )}
            <span>→ AR</span>
          </Button>
        </div>
        <Input
          value={branchForm.name_en}
          onChange={(e) =>
            setBranchForm((f) => (f ? { ...f, name_en: e.target.value } : f))
          }
          dir="ltr"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">{pickBi(isRTL, 'نوع الموقع', 'Location type')} *</Label>
        <Select
          value={branchForm.branch_type || 'branch'}
          onValueChange={(v) => {
            const nextIsMain = v === 'main';
            if (nextIsMain) {
              const currentMain = branches.find(
                (b) => b.is_main && b.id !== editingBranchId,
              );
              if (
                currentMain &&
                !confirm(
                  isRTL
                    ? `سيتم إلغاء "${currentMain.name_ar}" كمركز رئيسي وتعيين هذا الموقع بدلاً منه. متابعة؟`
                    : `"${currentMain.name_ar}" will be unset as headquarters and this location will replace it. Continue?`,
                )
              ) {
                return;
              }
            }
            setBranchForm((f) =>
              f ? { ...f, branch_type: v as BranchTypeId, is_main: nextIsMain } : f,
            );
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="main">{pickBi(isRTL, 'المركز الرئيسي', 'Headquarters (main)')}</SelectItem>
            <SelectItem value="branch">{pickBi(isRTL, 'فرع', 'Branch')}</SelectItem>
            <SelectItem value="warehouse">{pickBi(isRTL, 'مستودع', 'Warehouse')}</SelectItem>
            <SelectItem value="admin_office">{pickBi(isRTL, 'مكتب إداري', 'Admin office')}</SelectItem>
            <SelectItem value="regional_office">{pickBi(isRTL, 'إدارة إقليمية', 'Regional office')}</SelectItem>
            <SelectItem value="head_office">{pickBi(isRTL, 'الإدارة العامة', 'Head office')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-1">
          {pickBi(
            isRTL,
            'المركز الرئيسي يُستخدم كعنوان المنشأة الافتراضي. مسموح بمركز رئيسي واحد فقط.',
            'Headquarters is used as the default business address. Only one headquarters is allowed.',
          )}
        </p>
      </div>

      <Separator />
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {pickBi(isRTL, 'بيانات التواصل', 'Contact Info')}
      </p>
      <div>
        <Label className="text-xs">{pickBi(isRTL, 'اسم مسؤول التواصل', 'Contact Person')}</Label>
        <Input
          value={branchForm.contact_person}
          onChange={(e) =>
            setBranchForm((f) => (f ? { ...f, contact_person: e.target.value } : f))
          }
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PhoneField
          value={parsePhoneValue(branchForm.phone)}
          onChange={(v) => setBranchForm((f) => (f ? { ...f, phone: toE164(v) } : f))}
          label={pickBi(isRTL, 'الهاتف', 'Phone')}
          optional
        />
        <PhoneField
          value={parsePhoneValue(branchForm.mobile)}
          onChange={(v) => setBranchForm((f) => (f ? { ...f, mobile: toE164(v) } : f))}
          label={pickBi(isRTL, 'الجوال', 'Mobile')}
          optional
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{pickBi(isRTL, 'الرقم الموحد', 'Unified Number')}</Label>
          <Input
            value={branchForm.unified_number}
            onChange={(e) =>
              setBranchForm((f) => (f ? { ...f, unified_number: e.target.value } : f))
            }
            dir="ltr"
            className="mt-1"
            placeholder="920xxxxxxx"
          />
        </div>
        <PhoneField
          value={parsePhoneValue(branchForm.customer_service_phone)}
          onChange={(v) =>
            setBranchForm((f) => (f ? { ...f, customer_service_phone: toE164(v) } : f))
          }
          label={pickBi(isRTL, 'خدمة العملاء', 'Customer Service')}
          optional
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
          <Input
            value={branchForm.email}
            onChange={(e) =>
              setBranchForm((f) => (f ? { ...f, email: e.target.value } : f))
            }
            dir="ltr"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{pickBi(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
          <Input
            value={branchForm.website}
            onChange={(e) =>
              setBranchForm((f) => (f ? { ...f, website: e.target.value } : f))
            }
            dir="ltr"
            className="mt-1"
          />
        </div>
      </div>

      <Separator />
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {pickBi(isRTL, 'العنوان', 'Address')}
      </p>
      <div>
        <Label className="text-xs">{pickBi(isRTL, 'الدولة', 'Country')}</Label>
        <Select
          value={branchForm.country_id}
          onValueChange={(v) =>
            setBranchForm((f) => (f ? { ...f, country_id: v, city_id: '' } : f))
          }
        >
          <SelectTrigger className="mt-1 max-w-xs">
            <SelectValue placeholder={pickBi(isRTL, 'اختر', 'Select')} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {language === 'ar' ? c.name_ar : c.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unified address microservice — Region → City → District (typeable) + SPL + street/building/address-id. */}
      <NationalAddressForm
        isRTL={isRTL}
        value={{
          short_address: branchForm.short_address ?? null,
          region: branchForm.region ?? null,
          region_en: branchForm.region_en ?? null,
          city_id: branchForm.city_id ?? null,
          district: branchForm.district ?? null,
          district_en: branchForm.district_en ?? null,
          street_name: branchForm.street_name ?? null,
          street_name_en: branchForm.street_name_en ?? null,
          building_number: branchForm.building_number ?? null,
          additional_number: branchForm.additional_number ?? null,
          post_code: branchForm.post_code ?? null,
          address: branchForm.address ?? null,
          address_en: branchForm.address_en ?? null,
          address_manual: branchForm.address_manual ?? false,
          complex_name: branchForm.complex_name ?? null,
          complex_name_en: branchForm.complex_name_en ?? null,
          site_number: branchForm.site_number ?? null,
        } as NationalAddressValue}
        onChange={(next) =>
          setBranchForm((f) =>
            f
              ? {
                  ...f,
                  short_address: next.short_address ?? '',
                  region: next.region ?? '',
                  region_en: next.region_en ?? '',
                  city_id: next.city_id ?? '',
                  district: next.district ?? '',
                  district_en: next.district_en ?? '',
                  street_name: next.street_name ?? '',
                  street_name_en: next.street_name_en ?? '',
                  building_number: next.building_number ?? '',
                  additional_number: next.additional_number ?? '',
                  post_code: next.post_code ?? '',
                  address: next.address ?? '',
                  address_en: next.address_en ?? '',
                  address_manual: next.address_manual ?? false,
                  complex_name: next.complex_name ?? '',
                  complex_name_en: next.complex_name_en ?? '',
                  site_number: next.site_number ?? '',
                }
              : f,
          )
        }
      />

      <div>
        <Label className="text-xs">{pickBi(isRTL, 'الرقم الوطني', 'National ID')}</Label>
        <Input
          value={branchForm.national_id}
          onChange={(e) =>
            setBranchForm((f) => (f ? { ...f, national_id: e.target.value } : f))
          }
          dir="ltr"
          className="mt-1 max-w-xs"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={branchForm.is_active}
            onCheckedChange={(v) =>
              setBranchForm((f) => (f ? { ...f, is_active: v } : f))
            }
          />
          <span className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</span>
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={!branchForm.name_ar || saving}
        className="w-full gap-1.5"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? '...' : pickBi(isRTL, 'حفظ الفرع', 'Save Branch')}
      </Button>
    </div>
  );
};

export default BusinessBranchForm;