import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Package, Plus, Trash2, X, DollarSign } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { FieldAiActions } from '@/components/blog/FieldAiActions';

export type AdminServiceLite = {
  id: string;
  name_ar: string;
  name_en: string | null;
  price_from: number | null;
  price_to: number | null;
  currency_code: string | null;
  is_active: boolean;
};

export type AdminNewServiceFormState = {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price_from: string;
  price_to: string;
  is_active: boolean;
};

export interface BusinessServicesPanelProps {
  isRTL: boolean;
  language: string;
  services: ReadonlyArray<AdminServiceLite>;
  newService: AdminNewServiceFormState;
  setServiceField: (key: keyof AdminNewServiceFormState, value: string | number | boolean | null) => void;
  isAdding: boolean;
  onClose: () => void;
  onAdd: () => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export const BusinessServicesPanel: React.FC<BusinessServicesPanelProps> = ({
  isRTL,
  language,
  services,
  newService,
  setServiceField,
  isAdding,
  onClose,
  onAdd,
  onToggleActive,
  onDelete,
}) => {
  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Package className="w-4 h-4 text-accent" />
          </div>
          {pickBi(isRTL, 'إدارة الخدمات', 'Manage Services')}
          <Badge variant="secondary" className="text-[10px]">{services.length}</Badge>
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl" aria-label="Action"><X className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          {services.map((svc) => (
            <div key={svc.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all ${!svc.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{language === 'ar' ? svc.name_ar : (svc.name_en || svc.name_ar)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {svc.price_from && svc.price_to ? `${svc.price_from} - ${svc.price_to} ${svc.currency_code}` :
                   svc.price_from ? `${pickBi(isRTL, 'من', 'From')} ${svc.price_from} ${svc.currency_code}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={svc.is_active} onCheckedChange={(v) => onToggleActive(svc.id, v)} />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                  onClick={() => { if (confirm(pickBi(isRTL, 'حذف هذه الخدمة؟', 'Delete this service?'))) onDelete(svc.id); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">{pickBi(isRTL, 'لا توجد خدمات', 'No services')}</p>
          )}
        </div>
        <Separator />
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> {pickBi(isRTL, 'إضافة خدمة جديدة', 'Add New Service')}
          </p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">{pickBi(isRTL, 'اسم الخدمة (عربي)', 'Service Name (AR)')} *</Label>
              <FieldAiActions compact value={newService.name_ar} lang="ar" isRTL={isRTL} fieldType="title"
                onTranslated={(v) => setServiceField('name_en', v)} onImproved={(v) => setServiceField('name_ar', v)} />
            </div>
            <Input value={newService.name_ar} onChange={(e) => setServiceField('name_ar', e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">{pickBi(isRTL, 'اسم الخدمة (إنجليزي)', 'Service Name (EN)')}</Label>
              <FieldAiActions compact value={newService.name_en} lang="en" isRTL={isRTL} fieldType="title"
                onTranslated={(v) => setServiceField('name_ar', v)} onImproved={(v) => setServiceField('name_en', v)} />
            </div>
            <Input value={newService.name_en} onChange={(e) => setServiceField('name_en', e.target.value)} dir="ltr" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">{pickBi(isRTL, 'الوصف (عربي)', 'Description (AR)')}</Label>
              <FieldAiActions compact value={newService.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
                onTranslated={(v) => setServiceField('description_en', v)} onImproved={(v) => setServiceField('description_ar', v)} />
            </div>
            <Textarea value={newService.description_ar} onChange={(e) => setServiceField('description_ar', e.target.value)} rows={2} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">{pickBi(isRTL, 'الوصف (إنجليزي)', 'Description (EN)')}</Label>
              <FieldAiActions compact value={newService.description_en} lang="en" isRTL={isRTL} fieldType="description"
                onTranslated={(v) => setServiceField('description_ar', v)} onImproved={(v) => setServiceField('description_en', v)} />
            </div>
            <Textarea value={newService.description_en} onChange={(e) => setServiceField('description_en', e.target.value)} rows={2} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> {pickBi(isRTL, 'السعر من', 'Price From')}</Label>
              <Input type="number" value={newService.price_from} onChange={(e) => setServiceField('price_from', e.target.value)} dir="ltr" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> {pickBi(isRTL, 'السعر إلى', 'Price To')}</Label>
              <Input type="number" value={newService.price_to} onChange={(e) => setServiceField('price_to', e.target.value)} dir="ltr" className="mt-1" />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch checked={newService.is_active} onCheckedChange={(v) => setServiceField('is_active', v)} />
                <span className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</span>
              </div>
            </div>
          </div>
          <Button onClick={onAdd} disabled={!newService.name_ar || isAdding} className="w-full gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (pickBi(isRTL, 'إضافة الخدمة', 'Add Service'))}
          </Button>
        </div>
      </div>
    </div>
  );
};