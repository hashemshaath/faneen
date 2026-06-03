import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info } from 'lucide-react';

export interface CompactInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id: string;
  startIcon?: React.ReactNode;
}

export const CompactInput: React.FC<CompactInputProps> = ({
  label, hint, error, required, id, startIcon, className = '', ...rest
}) => {
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1.5" data-error-key={id}>
      <Label htmlFor={id} className="text-[13px] font-medium flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-destructive" aria-hidden>*</span>}
      </Label>
      <div className="relative">
        {startIcon && (
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:w-4 [&_svg]:h-4">
            {startIcon}
          </span>
        )}
        <Input
          id={id}
          dir={rest.dir ?? 'auto'}
          aria-invalid={!!error}
          aria-describedby={error ? errId : hint ? hintId : undefined}
          className={`h-11 rounded-xl px-3 text-[14px] ${startIcon ? 'ps-9' : ''} ${
            error ? 'border-destructive focus-visible:ring-destructive/40' : ''
          } ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p id={errId} role="alert" className="text-[12px] leading-[18px] text-destructive flex items-start gap-1">
          <AlertCircle className="w-3.5 h-3.5 mt-[2px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[12px] leading-[18px] text-muted-foreground flex items-start gap-1">
          <Info className="w-3.5 h-3.5 mt-[2px] shrink-0 opacity-70" />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
};