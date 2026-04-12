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
      <div className="bg-primary pt-20 sm:pt-24 pb-8 sm:pb-10">
        <div className="container px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
            {icon}
            <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-primary-foreground">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-primary-foreground/60 font-body max-w-2xl mx-auto text-sm sm:text-base">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </>
  );
};
