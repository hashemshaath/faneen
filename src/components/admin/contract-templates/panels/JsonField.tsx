import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

export const JsonField: React.FC<{
  value: unknown;
  disabled?: boolean;
  onChange: (v: unknown) => void;
}> = ({ value, disabled, onChange }) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 0));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Textarea
        dir="ltr"
        rows={2}
        disabled={disabled}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            setErr(null);
            onChange(parsed);
          } catch {
            setErr('Invalid JSON');
          }
        }}
      />
      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
};