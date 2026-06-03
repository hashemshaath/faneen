import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface CompactTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  id: string;
}

export const CompactTextarea: React.FC<CompactTextareaProps> = ({ label, hint, id, className = '', ...rest }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-[13px] font-medium">{label}</Label>
    <Textarea
      id={id}
      dir={rest.dir ?? 'auto'}
      className={`min-h-[88px] rounded-xl text-[14px] ${className}`}
      {...rest}
    />
    {hint && <p className="text-[12px] leading-[18px] text-muted-foreground">{hint}</p>}
  </div>
);