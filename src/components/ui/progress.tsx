import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      {/* Use inline-size + start anchoring so RTL fills from the right automatically */}
      <ProgressPrimitive.Indicator
        className="h-full bg-primary transition-all rounded-full absolute inset-y-0 start-0"
        style={{ inlineSize: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
