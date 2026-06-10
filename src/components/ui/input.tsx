import * as React from "react";

import { cn } from "@/lib/utils";
import { normalizeDigits } from "@/lib/normalize-digits";
import { resolveFieldDirection } from "@/lib/field-direction";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, dir, name, id, inputMode, ...props }, ref) => {
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
    // Resolve direction: explicit prop wins; technical/name-based defaults
    // are applied centrally so individual forms don't have to think about it.
    const resolvedDir =
      dir ?? resolveFieldDirection({ type, inputMode, name, id });
    return (
      <input
        type={type}
        name={name}
        id={id}
        inputMode={inputMode}
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
