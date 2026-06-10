import * as React from "react";

import { cn } from "@/lib/utils";
import { normalizeDigits } from "@/lib/normalize-digits";

/**
 * Input types whose value is inherently LTR (emails, URLs, phone numbers,
 * numeric values, dates/times, colors). We auto-apply `dir="ltr"` so the
 * value never renders mirrored inside an RTL paragraph context. Callers can
 * still override by passing an explicit `dir` prop.
 */
const LTR_INPUT_TYPES = new Set([
  "email",
  "url",
  "tel",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "color",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, dir, ...props }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (type !== "password" && type !== "file") {
          const original = e.target.value;
          const normalized = normalizeDigits(original);
          if (normalized !== original) {
            e.target.value = normalized;
          }
        }
        onChange?.(e);
      },
      [onChange, type],
    );
    // Resolve direction: explicit prop wins; technical types default to ltr.
    const resolvedDir =
      dir ?? (type && LTR_INPUT_TYPES.has(type) ? "ltr" : undefined);
    return (
      <input
        type={type}
        dir={resolvedDir}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        onChange={handleChange}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
