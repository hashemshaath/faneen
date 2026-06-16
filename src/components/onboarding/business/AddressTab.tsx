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
import React, { useState } from 'react';
import { Plus, Trash2, MapPin, Building2, ChevronDown, ChevronUp, Home, Network, Phone } from 'lucide-react';
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
  const [openIdx, setOpenIdx] = useState<Record<number, boolean>>({});

  const hasMapPin = latitude !== null && longitude !== null;
  const hasAddress = !!(primary.region || primary.district || primary.short_address);
  const totalBranches = 1 + branches.length;

  const updateBranch = (i: number, patch: Partial<BranchDraft>) => {
    onBranchesChange(branches.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const removeBranch = (i: number) => {
    setOpenIdx((s) => {
      const next = { ...s };
      delete next[i];
      return next;
    });
    onBranchesChange(branches.filter((_, idx) => idx !== i));
  };
  const addBranch = () => {
    const newIdx = branches.length;
    onBranchesChange([
      ...branches,
      { name_ar: '', name_en: '', same_as_primary: true, phone: '' },
    ]);
    setOpenIdx((s) => ({ ...s, [newIdx]: true }));
  };

  return (
    <div className="space-y-5">
      {/* Section header — Main branch */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-emerald-500/[0.04] p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {tt(isRTL, 'الفرع الرئيسي', 'Main branch')}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  {tt(isRTL, 'مطلوب', 'Required')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  hasMapPin
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  <MapPin className="w-3 h-3" />
                  {tt(isRTL, hasMapPin ? 'موقع محدد' : 'لا موقع', hasMapPin ? 'Pinned' : 'No pin')}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  hasAddress
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  <Network className="w-3 h-3" />
                  {tt(isRTL, hasAddress ? 'العنوان مكتمل' : 'عنوان ناقص', hasAddress ? 'Address set' : 'Incomplete')}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              {tt(isRTL,
                'حدّد موقع منشأتك على الخريطة، ثم اعتمد العنوان الوطني — الحقول الأخرى تُملأ تلقائياً.',
                'Pin your business on the map, then confirm the National Address — other fields auto-fill.')}
            </p>
          </div>
        </div>
      </div>

      {/* Map + National address — clean grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
            <MapPin className="w-4 h-4 text-primary" />
            <Label className="text-xs font-semibold">
              {tt(isRTL, 'الموقع على الخريطة', 'Map location')}
            </Label>
          </div>
          <div className="p-2 space-y-2">
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
            <p className="text-[11px] text-muted-foreground px-1">
              {tt(isRTL,
                'انقر أو اسحب الدبوس، ثم اضغط "تعبئة العنوان" لملء المنطقة والحي تلقائياً.',
                'Click or drag the pin, then press "Auto-fill address" to populate region & district.')}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
            <Network className="w-4 h-4 text-primary" />
            <Label className="text-xs font-semibold">
              {tt(isRTL, 'العنوان الوطني', 'National Address')}
            </Label>
          </div>
          <div className="p-3">
            <NationalAddressForm
              value={primary}
              onChange={onPrimaryChange}
              isRTL={isRTL}
            />
          </div>
        </div>
      </div>

      {/* Additional branches */}
      <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/60 bg-muted/30 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">
              {tt(isRTL, 'الفروع الإضافية', 'Additional branches')}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {tt(isRTL, `${totalBranches} فرع`, `${totalBranches} total`)}
            </span>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addBranch} className="gap-1 h-8">
            <Plus className="w-3.5 h-3.5" />
            {tt(isRTL, 'إضافة فرع', 'Add branch')}
          </Button>
        </div>

        <div className="p-3 space-y-2">
          {/* Main branch summary row */}
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
              M
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {tt(isRTL, 'الفرع الرئيسي', 'Main branch')}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {hasAddress
                  ? [primary.region, primary.district, primary.short_address].filter(Boolean).join(' • ')
                  : tt(isRTL, 'حدّد العنوان أعلاه', 'Set address above')}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {tt(isRTL, '← يُحرَّر من الأعلى', '← edited above')}
            </span>
          </div>

          {branches.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center">
              <Building2 className="w-6 h-6 mx-auto text-muted-foreground/60 mb-1.5" />
              <p className="text-xs text-muted-foreground">
                {tt(isRTL,
                  'لم تُضف فروع إضافية بعد. يمكن إضافتها الآن أو لاحقاً من لوحة التحكم.',
                  'No additional branches yet. Add them now or later from the dashboard.')}
              </p>
            </div>
          )}

          {branches.map((b, i) => {
            const isOpen = openIdx[i] ?? true;
            const label = isRTL
              ? (b.name_ar || `فرع ${i + 2}`)
              : (b.name_en || `Branch ${i + 2}`);
            return (
              <div key={i} className="rounded-lg border border-border/60 bg-background overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIdx((s) => ({ ...s, [i]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-start hover:bg-muted/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 2}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate" dir="auto">
                      {label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.same_as_primary
                        ? tt(isRTL, 'نفس عنوان الفرع الرئيسي', 'Same address as main branch')
                        : tt(isRTL, 'عنوان مستقل (يحرَّر لاحقاً)', 'Independent address (set later)')}
                      {b.phone ? ` • ${b.phone}` : ''}
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/60 bg-muted/10 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">
                          {tt(isRTL, 'اسم الفرع (عربي)', 'Branch name (Arabic)')}
                        </Label>
                        <Input value={b.name_ar} dir="rtl" lang="ar"
                          onChange={(e) => updateBranch(i, { name_ar: e.target.value })}
                          placeholder={tt(isRTL, 'مثال: فرع جدة', 'e.g. Jeddah branch')}
                          className="h-10 rounded-lg mt-1" />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">
                          {tt(isRTL, 'اسم الفرع (إنجليزي)', 'Branch name (English)')}
                        </Label>
                        <Input value={b.name_en} dir="ltr" lang="en"
                          onChange={(e) => updateBranch(i, { name_en: e.target.value })}
                          placeholder="e.g. Jeddah branch"
                          className="h-10 rounded-lg mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {tt(isRTL, 'رقم هاتف الفرع', 'Branch phone')}
                        </Label>
                        <Input value={b.phone ?? ''} dir="ltr" inputMode="tel"
                          onChange={(e) => updateBranch(i, { phone: e.target.value })}
                          placeholder="+9665XXXXXXXX"
                          className="h-10 rounded-lg mt-1 tech-content" />
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-xs rounded-lg border border-border/60 bg-background px-3 py-2 cursor-pointer">
                      <input type="checkbox" checked={b.same_as_primary}
                        onChange={(e) => updateBranch(i, { same_as_primary: e.target.checked })}
                        className="rounded mt-0.5" />
                      <span className="flex-1">
                        <span className="font-medium">
                          {tt(isRTL, 'استخدام نفس عنوان الفرع الرئيسي', 'Use the main branch address')}
                        </span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">
                          {tt(isRTL,
                            'يمكن تعديل عنوان الفرع لاحقاً من لوحة التحكم.',
                            'You can change the branch address later from the dashboard.')}
                        </span>
                      </span>
                    </label>
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="ghost"
                        onClick={() => removeBranch(i)}
                        className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5 me-1" />
                        {tt(isRTL, 'حذف هذا الفرع', 'Remove this branch')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AddressTab;