import { PropsWithChildren } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface AppDirectionShellProps extends PropsWithChildren {
  className?: string;
}

export const AppDirectionShell = ({ children, className }: AppDirectionShellProps) => {
  const { dir, language } = useLanguage();

  return (
    <div
      dir={dir}
      data-language={language}
      className={cn("app-shell min-h-dvh bg-background text-foreground", className)}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-secondary focus:text-secondary-foreground focus:shadow-lg focus-visible:ring-2 focus-visible:ring-gold"
      >
        {language === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>
      {children}
    </div>
  );
};
