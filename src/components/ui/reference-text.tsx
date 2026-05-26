import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * ReferenceText — render a reference identifier (USR-1000001, ENT-2000003,
 * PAY-9000123, UUID, etc.) always LTR with isolation so it cannot be reordered
 * by an Arabic RTL paragraph context. Does NOT alter the underlying value.
 */
export interface ReferenceTextProps extends HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'code';
  value: string | null | undefined;
}

export const ReferenceText = forwardRef<HTMLSpanElement, ReferenceTextProps>(
  ({ as: Tag = 'span', value, className, children, ...rest }, ref) => {
    const Component = Tag as 'span';
    return (
      <Component
        ref={ref}
        dir="ltr"
        data-reference="true"
        className={cn('technical-ltr tech-content', className)}
        {...rest}
      >
        {value ?? children ?? ''}
      </Component>
    );
  }
);

ReferenceText.displayName = 'ReferenceText';