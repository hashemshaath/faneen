/**
 * PhoneField — unified phone input across the entire app.
 *
 * - Country code dropdown (uses countryCodes from auth constants)
 * - National number input only (digits, no leading + or zeros)
 * - Emits both parts AND a derived E.164 string for backward compat
 * - RTL/LTR aware, .tech-content for digits
 *
 * Replaces every bare `<Input type="tel">` across the project.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Phone } from 'lucide-react';
import { countryCodes, PHONE_MAX_LENGTH } from '@/services/auth/constants';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface PhoneFieldValue {
  countryCode: string; // e.g. "+966"
  national: string;    // digits only, no leading +/0
}

export interface PhoneFieldProps {
  value: PhoneFieldValue;
  onChange: (next: PhoneFieldValue) => void;
  label?: string;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  hideLabel?: boolean;
  /** Receive the combined E.164 string ("+966501234567") whenever parts change. */
  onE164Change?: (e164: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
}

const DEFAULT_CC = '+966';

function sanitizeNational(raw: string): string {
  // Strip non-digits, drop leading zeros, limit length
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, PHONE_MAX_LENGTH);
}

/** Build PhoneFieldValue from a stored phone string. */
export function parsePhoneValue(stored?: string | null): PhoneFieldValue {
  if (!stored) return { countryCode: DEFAULT_CC, national: '' };
  let s = stored.trim();
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    return { countryCode: DEFAULT_CC, national: sanitizeNational(s) };
  }
  const digits = s.replace(/[^0-9]/g, '');
  const known = countryCodes.map(c => c.code.replace('+', ''));
  for (const cc of known) {
    if (digits.startsWith(cc)) {
      return { countryCode: '+' + cc, national: sanitizeNational(digits.slice(cc.length)) };
    }
  }
  // Fallback: first 3 digits as cc
  return { countryCode: '+' + digits.slice(0, 3), national: sanitizeNational(digits.slice(3)) };
}

export function toE164(value: PhoneFieldValue): string {
  if (!value.national) return '';
  return `${value.countryCode}${value.national}`;
}

export const PhoneField: React.FC<PhoneFieldProps> = ({
  value,
  onChange,
  label,
  optional = false,
  required = false,
  disabled = false,
  error,
  className,
  hideLabel = false,
  onE164Change,
  placeholder = '5XXXXXXXX',
  ariaLabel,
  id,
}) => {
  const { isRTL } = useLanguage();
  const labelText = label ?? (isRTL ? 'رقم الجوال' : 'Phone Number');

  const handleNational = (raw: string) => {
    const national = sanitizeNational(raw);
    const next = { ...value, national };
    onChange(next);
    onE164Change?.(toE164(next));
  };

  const handleCC = (cc: string) => {
    const next = { ...value, countryCode: cc };
    onChange(next);
    onE164Change?.(toE164(next));
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {!hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {labelText}
          {required && <span className="text-destructive ms-1">*</span>}
          {optional && (
            <span className="text-xs text-muted-foreground ms-1">
              ({isRTL ? 'اختياري' : 'optional'})
            </span>
          )}
        </Label>
      )}
      <div className="flex gap-2" dir="ltr">
        <div className="relative">
          <select
            value={value.countryCode}
            onChange={(e) => handleCC(e.target.value)}
            disabled={disabled}
            aria-label={isRTL ? 'مفتاح الدولة' : 'Country code'}
            className={cn(
              'appearance-none h-10 w-[110px] rounded-xl border border-input bg-background ps-3 pe-7 text-sm tech-content focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative flex-1">
          <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            disabled={disabled}
            value={value.national}
            onChange={(e) => handleNational(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel ?? labelText}
            dir="ltr"
            className={cn(
              'h-10 ps-9 rounded-xl tech-content',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default PhoneField;