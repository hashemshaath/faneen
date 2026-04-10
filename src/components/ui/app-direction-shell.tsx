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
      className={cn("app-shell min-h-screen bg-background text-foreground", className)}
    >
      {children}
    </div>
  );
};
