/**
 * @deprecated Legacy /search component. Kept only because
 * `src/components/search/SearchResults.tsx` (also deprecated) imports it and
 * a handful of guard tests still readFileSync that file. The production
 * `/search` route renders `SearchResultsV3` (see `src/components/search/v3/`).
 * Do NOT import this from new code.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** @deprecated only here for back-compat with the deprecated SearchResults shim */
  totalItems?: number;
  /** @deprecated only here for back-compat with the deprecated SearchResults shim */
  itemsPerPage?: number;
}

export const SearchPagination = ({ currentPage, totalPages, onPageChange }: Props) => {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous"
        className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm">
        <span className="tech-content">{currentPage}</span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="tech-content text-muted-foreground">{totalPages}</span>
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        aria-label="Next"
        className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border disabled:opacity-40"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

export default SearchPagination;
