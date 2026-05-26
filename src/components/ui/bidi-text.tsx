import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * BidiText — renders mixed-script content safely.
 * Uses `dir="auto"` + `unicode-bidi: plaintext` (`.bidi-auto`) so the browser
 * chooses paragraph direction from the first strong character. Use this for
 * user-generated content that may contain Arabic + Latin/numbers.
 */
export interface BidiTextProps extends HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'div' | 'p';
}

export const BidiText = forwardRef<HTMLSpanElement, BidiTextProps>(
  ({ as: Tag = 'span', className, children, ...rest }, ref) => {
    const Component = Tag as 'span';
    return (
      <Component
        ref={ref}
        dir="auto"
        className={cn('bidi-auto', className)}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);

BidiText.displayName = 'BidiText';