import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Phone, Mail, Globe, Package, Settings } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { PhoneField, parsePhoneValue, toE164 } from '@/components/forms/PhoneField';
import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type { EditPanelEditingBiz, EditPanelService, SetEditFieldFn } from './types';

type Props = {
  editForm: AdminEditBusinessFormState;
  setField: SetEditFieldFn;
  isRTL: boolean;
  language: 'ar' | 'en';
  editingBiz: EditPanelEditingBiz;
  registeredServices: ReadonlyArray<EditPanelService>;
  onManageServices: () => void;
};

export const BusinessContactSection: React.FC<Props> = ({
  editForm,
  setField,
  isRTL,
  language,
  editingBiz,
  registeredServices,
  onManageServices,
}) => {
  const services = registeredServices.filter((s) => s.business_id === editingBiz.id);
  return (
    <>
      <div>
        <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> {pickBi(isRTL, 'اسم مسؤول التواصل', 'Contact Person')}</Label>
        <Input value={editForm.contact_person} onChange={e => setField('contact_person', e.target.value)} className="mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PhoneField value={parsePhoneValue(editForm.phone)} onChange={(v) => setField('phone', toE164(v))} label={pickBi(isRTL, 'رقم الهاتف', 'Phone')} optional />
        <PhoneField value={parsePhoneValue(editForm.mobile)} onChange={(v) => setField('mobile', toE164(v))} label={pickBi(isRTL, 'رقم الجوال', 'Mobile')} optional />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {pickBi(isRTL, 'الرقم الموحد', 'Unified Number')}</Label>
          <Input value={editForm.unified_number} onChange={e => setField('unified_number', e.target.value)} dir="ltr" className="mt-1 tech-content" placeholder="920xxxxxxx" />
        </div>
        <PhoneField value={parsePhoneValue(editForm.customer_service_phone)} onChange={(v) => setField('customer_service_phone', toE164(v))} label={pickBi(isRTL, 'خدمة العملاء', 'Customer Service')} optional />
      </div>
      <div>
        <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
        <Input type="email" value={editForm.email} onChange={e => setField('email', e.target.value)} dir="ltr" className="mt-1 tech-content" />
      </div>
      <div>
        <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {pickBi(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
        <Input type="url" value={editForm.website} onChange={e => setField('website', e.target.value)} dir="ltr" className="mt-1 tech-content" placeholder="https://" />
      </div>
      <div className="mt-4">
        <Separator className="mb-3" />
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Package className="w-3 h-3" /> {pickBi(isRTL, 'الخدمات المسجلة', 'Registered Services')}
          </Label>
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={onManageServices}>
            <Settings className="w-3 h-3" /> {pickBi(isRTL, 'إدارة', 'Manage')}
          </Button>
        </div>
        {services.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'لا توجد خدمات مسجلة', 'No registered services')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <Badge key={s.id} variant="outline" className="text-[9px]">
                {language === 'ar' ? s.name_ar : (s.name_en || s.name_ar)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );
};