import type { ReactNode } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { SearchAutocomplete } from './SearchAutocomplete';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch?: (q: string) => void;
  businesses?: { id: string; name_ar: string; name_en: string }[];
  categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
  /** Rendered directly under the search input — used to merge the active filter chips into the same band. */
  children?: ReactNode;
}

export const SearchHeader = ({
  query, onQueryChange, onSearch, businesses, categories, children,
}: SearchHeaderProps) => {
  const { t } = useLanguage();
  return (
    <>
      <Navbar />
      <div className="bg-surface-nav pt-20 sm:pt-24 pb-8 sm:pb-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          aria-hidden="true"
          style={{ backgroundImage: "radial-gradient(circle at 30% 40%, hsl(var(--accent)) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--accent)) 0%, transparent 40%)" }}
        />
        <div className="container relative z-10 px-3 sm:px-4">
          <div className="text-center max-w-2xl mx-auto mb-5 sm:mb-6">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-surface-nav-foreground">
              {t('search.page_title')}
            </h1>
            <p className="mt-2 text-surface-nav-foreground/60 font-body text-sm sm:text-base">
              {t('search.page_subtitle')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <SearchAutocomplete
              query={query}
              onQueryChange={onQueryChange}
              onSearch={onSearch}
              businesses={businesses}
              categories={categories}
            />
            {children ? (
              <div className="mt-3">
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
