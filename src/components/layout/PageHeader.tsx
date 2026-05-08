import { Navbar } from './Navbar';
import { useLanguage } from '@/i18n/LanguageContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, icon, children }: PageHeaderProps) => {
  const { isRTL } = useLanguage();
  return (
    <>
      <Navbar />
      <div className="bg-primary pt-20 sm:pt-24 pb-7 sm:pb-10">
        <div className="container-app text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2.5">
            {icon}
            <h1 className="font-heading font-bold text-[1.35rem] sm:text-2xl md:text-[1.875rem] leading-tight tracking-tight text-primary-foreground">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-primary-foreground/65 font-body max-w-2xl mx-auto text-[13px] sm:text-sm leading-relaxed">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </>
  );
};
