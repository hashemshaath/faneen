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
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {icon}
            <h1 className="font-heading font-bold text-3xl text-primary-foreground">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-primary-foreground/60 font-body max-w-2xl mx-auto">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </>
  );
};
