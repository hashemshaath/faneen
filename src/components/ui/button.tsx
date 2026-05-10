import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-hover",
        primary: "bg-primary text-white hover:bg-primary-hover",
        secondary: "bg-secondary text-white hover:bg-secondary-hover",
        accent: "bg-accent text-white hover:bg-accent-hover",
        outline: "border border-slate-300 bg-transparent text-secondary hover:bg-secondary-light",
        ghost: "bg-transparent text-slate-800 hover:bg-slate-100",
        danger: "bg-error text-white hover:bg-[#A81F1F]",
        destructive: "bg-error text-white hover:bg-[#A81F1F]",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-gold text-secondary-foreground font-heading font-bold shadow-gold hover:opacity-90 transition-all duration-300",
        heroOutline: "border-2 border-gold text-gold hover:bg-gold/10 font-heading font-semibold transition-all duration-300",
        urgent: "bg-urgent text-urgent-foreground hover:bg-urgent-hover shadow-sm",
      },
      size: {
        default: "h-10 px-[18px] text-[14px]",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-12 px-[22px] text-[15px]",
        icon: "h-10 w-10",
        // Mobile-app-grade sizes — ≥44px touch targets, token-driven heights.
        app: "h-ctrl-md px-5 rounded-xl text-sm",
        appLg: "h-ctrl-lg px-6 rounded-xl text-base",
        appXl: "h-ctrl-xl px-7 rounded-2xl text-base",
        appIcon: "h-ctrl-md w-ctrl-md rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
