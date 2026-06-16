/**
 * Address tab for the business onboarding wizard.
 *
 * Two side-by-side approaches in a single screen:
 *  1) National Address (SPL short code) — auto-fills region/city/district.
 *  2) Map pin — drop a marker → reverse geocode → auto-fill the same fields.
 *
 * Both flows write to the same `NationalAddressValue` + coords state, which
 * the parent persists via `upsertPrimaryAddress` (owner_type='business',
 * address_type='primary') after the business is created. Hard rule: no
 * direct DB calls from this component.
 *
 * A compact inline branches editor lets the user add additional branches
 * during onboarding (name + reuse main address by default).
 */
import React from 'react';
import { Plus, Trash2, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  NationalAddressForm,
  type NationalAddressValue,
} from '@/modules/addresses/components/NationalAddressForm';
import { LocationPicker } from '@/components/dashboard/business-edit/LocationPicker';

export interface BranchDraft {
  name_ar: string;
  name_en: string;
  same_as_primary: boolean;
  phone?: string;
}

interface Props {
  primary: NationalAddressValue;
  onPrimaryChange: (next: NationalAddressValue) => void;
  latitude: number | null;
  longitude: number | null;
  onCoordsChange: (lat: number, lng: number) => void;
  branches: BranchDraft[];
  onBranchesChange: (next: BranchDraft[]) => void;
}

const tt = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

export const AddressTab: React.FC<Props> = ({
  primary, onPrimaryChange,
  latitude, longitude, onCoordsChange,
  branches, onBranchesChange,
}) => {
  const { isRTL } = useLanguage();

  const updateBranch = (i: number, patch: Partial<BranchDraft>) => {
    onBranchesChange(branches.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const removeBranch = (i: number) => {
    onBranchesChange(branches.filter((_, idx) => idx !== i));
  };
  const addBranch = () => {
    onBranchesChange([
      ...branches,
      { name_ar: '', name_en: '', same_as_primary: true, phone: '' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Map + National address grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold">
              {tt(isRTL, 'تحديد الموقع على الخريطة', 'Pin location on the map')}
            </Label>
          </div>
          <LocationPicker
            isRTL={isRTL}
            latitude={latitude}
            longitude={longitude}
            onChange={onCoordsChange}
            onAutofill={(d) => {
              onPrimaryChange({
                ...primary,
                region: d.region_ar ?? primary.region,
                region_en: d.region_en ?? primary.region_en,
                district: d.district_ar ?? primary.district,
                district_en: d.district_en ?? primary.district_en,
                address: d.address_ar ?? primary.address,
                address_en: d.address_en ?? primary.address_en,
                address_manual: true,
              });
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            {tt(isRTL,
              'انقر على الخريطة أو اسحب الدبوس، ثم اضغط "تعبئة العنوان" لتعبئة المنطقة والحي تلقائياً.',
              'Click the map or drag the pin, then press "Auto-fill address" to populate region & district.')}
          </p>
        </div>

        <div>
          <NationalAddressForm
            value={primary}
            onChange={onPrimaryChange}
            isRTL={isRTL}
          />
        </div>
      </div>

      {/* Branches editor */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">
              {tt(isRTL, 'الفروع الإضافية', 'Additional branches')}
            </h3>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addBranch} className="gap-1">
            <Plus className="w-3.5 h-3.5" />
            {tt(isRTL, 'إضافة فرع', 'Add branch')}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {tt(isRTL,
            'العنوان أعلاه = الفرع الرئيسي. يمكنك إضافة فروع أخرى الآن أو لاحقاً من لوحة التحكم.',
            'The address above is your main branch. Add more branches now or later from the dashboard.')}
        </p>

        {branches.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            {tt(isRTL, 'لا توجد فروع إضافية بعد.', 'No additional branches yet.')}
          </p>
        )}

        {branches.map((b, i) => (
          <div key={i} className="rounded-lg border border-border/60 bg-background p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {tt(isRTL, `فرع ${i + 2}`, `Branch ${i + 2}`)}
              </span>
              <Button type="button" size="sm" variant="ghost"
                onClick={() => removeBranch(i)}
                className="h-7 px-2 text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">{tt(isRTL, 'اسم الفرع (عربي)', 'Branch name (Arabic)')}</Label>
                <Input value={b.name_ar} dir="rtl" lang="ar"
                  onChange={(e) => updateBranch(i, { name_ar: e.target.value })}
                  placeholder={tt(isRTL, 'مثال: فرع جدة', 'e.g. Jeddah branch')}
                  className="h-10 rounded-lg mt-1" />
              </div>
              <div>
                <Label className="text-[11px]">{tt(isRTL, 'اسم الفرع (إنجليزي)', 'Branch name (English)')}</Label>
                <Input value={b.name_en} dir="ltr" lang="en"
                  onChange={(e) => updateBranch(i, { name_en: e.target.value })}
                  placeholder="e.g. Jeddah branch"
                  className="h-10 rounded-lg mt-1" />
              </div>
              <div>
                <Label className="text-[11px]">{tt(isRTL, 'رقم هاتف الفرع', 'Branch phone')}</Label>
                <Input value={b.phone ?? ''} dir="ltr" inputMode="tel"
                  onChange={(e) => updateBranch(i, { phone: e.target.value })}
                  placeholder="+9665XXXXXXXX"
                  className="h-10 rounded-lg mt-1 tech-content" />
              </div>
              <label className="flex items-center gap-2 text-xs mt-6">
                <input type="checkbox" checked={b.same_as_primary}
                  onChange={(e) => updateBranch(i, { same_as_primary: e.target.checked })}
                  className="rounded" />
                {tt(isRTL,
                  'استخدام نفس عنوان الفرع الرئيسي (يمكن تعديله لاحقاً)',
                  'Use the main branch address (editable later)')}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddressTab;