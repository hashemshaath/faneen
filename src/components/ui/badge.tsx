import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 h-[22px] text-[11px] leading-none font-semibold tracking-wide whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border/70 bg-background/40",
        soft: "border-transparent bg-muted/70 text-foreground hover:bg-muted",
        gold: "border-gold/20 bg-gold/10 text-gold-dark dark:text-gold hover:bg-gold/15",
        success: "border-transparent bg-success/12 text-success hover:bg-success/18",
        warning: "border-transparent bg-warning/15 text-warning-foreground hover:bg-warning/20",
        info: "border-transparent bg-info/12 text-info hover:bg-info/18",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
