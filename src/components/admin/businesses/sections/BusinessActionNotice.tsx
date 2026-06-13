import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * Phase 5E presentational primitive.
 * Small muted footnote used inside admin action cards (e.g. "use the row
 * tier picker to change membership"). Pure presentation.
 */
export function BusinessActionNotice({ children }: Props) {
  return <p className="text-[10px] text-muted-foreground mt-2">{children}</p>;
}

export default BusinessActionNotice;