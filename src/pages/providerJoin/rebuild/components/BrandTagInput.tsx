import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export interface BrandTagInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

export const BrandTagInput: React.FC<BrandTagInputProps> = ({ id, label, values, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setInput('');
  };
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium">{label}</Label>
      <div className="rounded-xl border bg-background px-2 py-1.5 min-h-11 flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-ring">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 h-7 text-[12px] border">
            <span dir="auto">{v}</span>
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full hover:bg-foreground/10 p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          dir="auto"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            if (e.key === 'Backspace' && !input && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={add}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-[13px] px-1 py-1"
        />
      </div>
    </div>
  );
};