import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * TechnicalText — forces LTR + isolation for technical values
 * (emails, URLs, phone numbers, UUIDs, API keys, tokens, hashes).
 * Adds `.technical-ltr` (direction:ltr; unicode-bidi:isolate; tabular nums).
 */
export interface TechnicalTextProps extends HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'div' | 'code' | 'p';
  /** When true uses monospace via `.tech-content`. Defaults to true. */
  mono?: boolean;
}

export const TechnicalText = forwardRef<HTMLSpanElement, TechnicalTextProps>(
  ({ as: Tag = 'span', className, mono = true, children, ...rest }, ref) => {
    const Component = Tag as 'span';
    return (
      <Component
        ref={ref}
        dir="ltr"
        className={cn('technical-ltr', mono && 'tech-content', className)}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);

TechnicalText.displayName = 'TechnicalText';