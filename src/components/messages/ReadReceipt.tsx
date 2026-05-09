import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** ISO timestamp when message was created (queued/sending) */
  createdAt?: string | null;
  /** ISO timestamp when delivered to server (set by DB default) */
  deliveredAt?: string | null;
  /** ISO timestamp when read by recipient (set via trigger) */
  readAt?: string | null;
  isRead?: boolean;
  className?: string;
}

/**
 * WhatsApp-style read receipt.
 * - Single check  : sent (created_at present, no delivered_at)
 * - Double check  : delivered (delivered_at set, not read)
 * - Blue double   : read (read_at set or is_read true)
 * Uses semantic tokens only.
 */
export const ReadReceipt: React.FC<Props> = ({ createdAt, deliveredAt, readAt, isRead, className }) => {
  const read = !!(readAt || isRead);
  const delivered = !!deliveredAt;

  if (read) {
    return <CheckCheck className={cn('w-3.5 h-3.5 text-accent', className)} aria-label="read" />;
  }
  if (delivered) {
    return <CheckCheck className={cn('w-3.5 h-3.5 text-muted-foreground', className)} aria-label="delivered" />;
  }
  if (createdAt) {
    return <Check className={cn('w-3.5 h-3.5 text-muted-foreground', className)} aria-label="sent" />;
  }
  return <Clock className={cn('w-3.5 h-3.5 text-muted-foreground/60', className)} aria-label="sending" />;
};

export default ReadReceipt;