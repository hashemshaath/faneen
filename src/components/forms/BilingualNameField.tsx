/**
 * BilingualNameField — unified name capture across the app.
 *
 * Three inputs: Arabic name, English name, optional username (@handle).
 * Auto-fills `full_name` from AR or EN when consumers need a single string.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, AtSign, Languages } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface BilingualNameValue {
  full_name_ar: string;
  full_name_en: string;
  username?: string;
}

export interface BilingualNameFieldProps {
  value: BilingualNameValue;
  onChange: (next: BilingualNameValue) => void;
  showUsername?: boolean;
  usernameReadOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  errors?: Partial<Record<keyof BilingualNameValue, string>>;
  /** Receive derived combined full_name when AR/EN change. */
  onFullNameChange?: (full: string) => void;
}

const USERNAME_RE = /[^a-zA-Z0-9_]/g;

export const BilingualNameField: React.FC<BilingualNameFieldProps> = ({
  value,
  onChange,
  showUsername = true,
  usernameReadOnly = false,
  required = false,
  disabled = false,
  className,
  errors,
  onFullNameChange,
}) => {
  const { isRTL } = useLanguage();

  const update = (patch: Partial<BilingualNameValue>) => {
    const next = { ...value, ...patch };
    onChange(next);
    if (patch.full_name_ar !== undefined || patch.full_name_en !== undefined) {
      onFullNameChange?.(next.full_name_ar?.trim() || next.full_name_en?.trim() || '');
    }
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3', className)}>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          {isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={value.full_name_ar || ''}
            onChange={(e) => update({ full_name_ar: e.target.value })}
            disabled={disabled}
            placeholder={isRTL ? 'مثال: أحمد محمد' : 'مثال: أحمد محمد'}
            dir="rtl"
            maxLength={100}
            className={cn('h-10 ps-9 rounded-xl', errors?.full_name_ar && 'border-destructive')}
          />
        </div>
        {errors?.full_name_ar && <p className="text-xs text-destructive">{errors.full_name_ar}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          {isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={value.full_name_en || ''}
            onChange={(e) => update({ full_name_en: e.target.value })}
            disabled={disabled}
            placeholder="e.g. Ahmed Mohammed"
            dir="ltr"
            maxLength={100}
            className={cn('h-10 ps-9 rounded-xl', errors?.full_name_en && 'border-destructive')}
          />
        </div>
        {errors?.full_name_en && <p className="text-xs text-destructive">{errors.full_name_en}</p>}
      </div>

      {showUsername && (
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
            {isRTL ? 'اسم المستخدم' : 'Username'}
            <span className="text-xs text-muted-foreground">
              ({isRTL ? 'يستخدم في الرابط' : 'used in profile URL'})
            </span>
          </Label>
          <div className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground tech-content text-sm pointer-events-none">@</span>
            <Input
              value={value.username || ''}
              onChange={(e) =>
                update({ username: e.target.value.replace(USERNAME_RE, '').toLowerCase().slice(0, 30) })
              }
              disabled={disabled || usernameReadOnly}
              readOnly={usernameReadOnly}
              placeholder="ahmed_m"
              dir="ltr"
              maxLength={30}
              className={cn('h-10 ps-8 rounded-xl tech-content', errors?.username && 'border-destructive')}
            />
          </div>
          {errors?.username && <p className="text-xs text-destructive">{errors.username}</p>}
        </div>
      )}
    </div>
  );
};

export default BilingualNameField;