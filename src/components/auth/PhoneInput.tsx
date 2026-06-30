import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PHONE_MAX_LENGTH } from '@/services/auth/constants';
import { FieldError } from './FieldError';
import { CountryCodeSelect } from '@/components/forms/CountryCodeSelect';

interface PhoneInputProps {
  phone: string;
  countryCode: string;
  onPhoneChange: (val: string) => void;
  onCountryCodeChange: (val: string) => void;
  isRTL: boolean;
  label?: string;
  optional?: boolean;
  error?: string;
  onBlur?: () => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  phone, countryCode, onPhoneChange, onCountryCodeChange,
  isRTL, label, optional = false, error, onBlur,
}) => (
  <div className="space-y-2">
    <Label>
      {label || (isRTL ? 'رقم الجوال' : 'Phone Number')}
      {optional && <span className="text-xs text-muted-foreground ms-1">({isRTL ? 'اختياري' : 'optional'})</span>}
    </Label>
    <div className="flex gap-2" dir="ltr">
      <CountryCodeSelect
        value={countryCode}
        onChange={onCountryCodeChange}
        error={!!error}
      />
      <Input
        type="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH))}
        onBlur={onBlur}
        placeholder="5XXXXXXXX"
        dir="ltr"
        className={`flex-1 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
    </div>
    <FieldError message={error} />
  </div>
);
