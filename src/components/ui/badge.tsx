import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border font-semibold tracking-wide whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>svg]:shrink-0 align-middle",
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
        category: "border-transparent bg-accent/10 text-accent hover:bg-accent/15",
        sector: "border-accent/20 bg-accent/5 text-accent-foreground hover:bg-accent/10",
        status: "border-transparent bg-success/12 text-success",
        premium: "border-gold/25 bg-gradient-gold text-secondary-foreground shadow-sm shadow-gold/15",
        muted: "border-transparent bg-muted/70 text-muted-foreground",
        filterSelected: "border-transparent bg-accent text-accent-foreground shadow-sm shadow-accent/20",
        filterUnselected: "border-border/70 bg-background/60 text-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/30",
        urgent: "border-transparent bg-urgent text-urgent-foreground hover:bg-urgent-hover",
        featured: "border-urgent/40 bg-urgent-light text-urgent-hover",
        pending: "border-border bg-muted text-muted-foreground",
      },
      size: {
        sm: "h-5 px-2 text-[10px] leading-none [&>svg]:size-3",
        md: "h-[22px] px-2.5 text-[11px] leading-none [&>svg]:size-3",
        lg: "h-7 px-3 text-xs leading-none [&>svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
