import * as React from "react";

import { cn } from "@/lib/utils";
import { normalizeDigits } from "@/lib/normalize-digits";
import { resolveFieldDirection } from "@/lib/field-direction";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, onChange, dir, name, id, ...props }, ref) => {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const original = e.target.value;
      const normalized = normalizeDigits(original);
      if (normalized !== original) {
        e.target.value = normalized;
      }
      onChange?.(e);
    },
    [onChange],
  );
  const resolvedDir = dir ?? resolveFieldDirection({ name, id });
  return (
    <textarea
      name={name}
      id={id}
      dir={resolvedDir}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
      onChange={handleChange}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
