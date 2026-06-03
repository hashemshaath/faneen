import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Paperclip, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

export interface CompactFileUploadProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  file: File | null;
  accept?: string;
  buttonLabel: string;
  emptyLabel: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CompactFileUpload: React.FC<CompactFileUploadProps> = ({
  id, label, hint, error, file, accept, buttonLabel, emptyLabel, onChange,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const errId = `${id}-err`;
  return (
    <div className="space-y-1.5" data-error-key={id}>
      <Label htmlFor={id} className="text-[13px] font-medium">{label}</Label>
      <div className={`h-12 rounded-xl border bg-background flex items-center gap-2 ps-3 pe-1.5 ${error ? 'border-destructive' : ''}`}>
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={`flex-1 min-w-0 truncate text-[12px] ${file ? 'text-foreground' : 'text-muted-foreground'}`} dir="auto">
          {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : emptyLabel}
        </span>
        {file && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="selected" />}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="h-9 min-w-[92px] px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 shrink-0"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {buttonLabel}
        </button>
        <input
          id={id}
          ref={ref}
          type="file"
          accept={accept}
          onChange={onChange}
          className="sr-only"
          aria-describedby={error ? errId : undefined}
          aria-invalid={!!error}
        />
      </div>
      {error ? (
        <p id={errId} role="alert" className="text-[12px] leading-[18px] text-destructive flex items-start gap-1">
          <AlertCircle className="w-3.5 h-3.5 mt-[2px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[12px] leading-[18px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};