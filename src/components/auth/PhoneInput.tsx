import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import { countryCodes, PHONE_MAX_LENGTH } from '@/services/auth/constants';
import { FieldError } from './FieldError';

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
      <div className="relative">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="appearance-none h-10 w-[100px] rounded-lg border border-input bg-background px-3 pe-7 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {countryCodes.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <ChevronDown className="absolute end-2 top-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
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
