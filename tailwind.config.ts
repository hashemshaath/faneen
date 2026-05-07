import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1400px",
    },
    extend: {
      fontFamily: {
         heading: ["IBM Plex Sans Arabic", "IBM Plex Sans Arabic Fallback", "sans-serif"],
         body: ["IBM Plex Sans Arabic", "IBM Plex Sans Arabic Fallback", "sans-serif"],
      },
      // Fluid type scale — drives off CSS vars defined in index.css.
      // Use as `text-fs-lg`, `text-fs-2xl`, etc.
      fontSize: {
        "fs-2xs": ["var(--fs-2xs)", { lineHeight: "1.4" }],
        "fs-xs":  ["var(--fs-xs)",  { lineHeight: "1.45" }],
        "fs-sm":  ["var(--fs-sm)",  { lineHeight: "1.55" }],
        "fs-base": ["var(--fs-base)", { lineHeight: "1.65" }],
        "fs-md":  ["var(--fs-md)",  { lineHeight: "1.55" }],
        "fs-lg":  ["var(--fs-lg)",  { lineHeight: "1.45" }],
        "fs-xl":  ["var(--fs-xl)",  { lineHeight: "1.35" }],
        "fs-2xl": ["var(--fs-2xl)", { lineHeight: "1.25" }],
        "fs-3xl": ["var(--fs-3xl)", { lineHeight: "1.15" }],
        "fs-display": ["var(--fs-display)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      spacing: {
        "sp-1": "var(--sp-1)",
        "sp-2": "var(--sp-2)",
        "sp-3": "var(--sp-3)",
        "sp-4": "var(--sp-4)",
        "sp-5": "var(--sp-5)",
        "sp-6": "var(--sp-6)",
        "sp-8": "var(--sp-8)",
        "sp-10": "var(--sp-10)",
        "sp-12": "var(--sp-12)",
        "sp-16": "var(--sp-16)",
        "sp-20": "var(--sp-20)",
      },
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
        "elev-3": "var(--elev-3)",
        "elev-4": "var(--elev-4)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasized: "var(--ease-emphasized)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        overlay: "var(--z-overlay)",
        toast: "var(--z-toast)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          light: "hsl(var(--navy-light))",
        },
        cream: "hsl(var(--cream))",
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        "surface-nav": {
          DEFAULT: "hsl(var(--surface-nav))",
          foreground: "hsl(var(--surface-nav-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "r-xs": "var(--r-xs)",
        "r-sm": "var(--r-sm)",
        "r-md": "var(--r-md)",
        "r-lg": "var(--r-lg)",
        "r-xl": "var(--r-xl)",
        "r-2xl": "var(--r-2xl)",
        "r-pill": "var(--r-pill)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Direction-aware variants: rtl: and ltr:
    // Drives off [dir="rtl"] / [dir="ltr"] set by LanguageContext on <html>.
    function ({ addVariant }: { addVariant: (name: string, definition: string | string[]) => void }) {
      addVariant("rtl", '&:where([dir="rtl"], [dir="rtl"] *)');
      addVariant("ltr", '&:where([dir="ltr"], [dir="ltr"] *)');
    },
  ],
} satisfies Config;
