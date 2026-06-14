/**
 * Presentational CSV export button for admin quote-operations surfaces.
 *
 * Pure UI — owns no CSV build logic and performs no downloads itself.
 * Parent must provide an `onClick` callback that builds and triggers the
 * download. Variants/sizes mirror the existing usage in
 * `AdminQuoteOperations.tsx` so behavior remains visually identical.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface QuoteOperationsCsvExportButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'ghost';
  className?: string;
}

export const QuoteOperationsCsvExportButton: React.FC<QuoteOperationsCsvExportButtonProps> = ({
  label,
  onClick,
  disabled,
  size = 'sm',
  variant = 'outline',
  className,
}) => (
  <Button
    size={size}
    variant={variant}
    className={className}
    onClick={onClick}
    disabled={disabled}
    type="button"
  >
    <Download className={variant === 'ghost' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    {label}
  </Button>
);

export default QuoteOperationsCsvExportButton;