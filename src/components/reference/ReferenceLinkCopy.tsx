import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * BM-REF-REBUILD-1 — Step H
 *
 * Tiny copy-to-clipboard button for a universal reference link.
 * Builds `/r/{refId}` (absolute, using the current origin when in a
 * browser) and copies it. Never accepts or renders tokens, UUIDs,
 * provider intent ids, or any other unsafe identifier — refId must
 * already be the public, safe human-readable reference.
 *
 * Bilingual label:
 *   EN: "Copy reference link"
 *   AR: "نسخ رابط المرجع"
 */
interface Props {
  refId: string | null | undefined;
  isRTL: boolean;
  className?: string;
  size?: 'xs' | 'sm';
}

// Same safe pattern enforced by ReferenceResolver — keep them in sync.
const SAFE_REF_PATTERN = /^[A-Z]{2,6}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export const ReferenceLinkCopy: React.FC<Props> = ({
  refId,
  isRTL,
  className,
  size = 'xs',
}) => {
  const label = isRTL ? 'نسخ رابط المرجع' : 'Copy reference link';

  const onCopy = useCallback(async () => {
    if (!refId || !SAFE_REF_PATTERN.test(refId)) return;
    const path = `/r/${refId}`;
    const full =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(full);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    } catch {
      toast.error(isRTL ? 'تعذر النسخ' : 'Copy failed');
    }
  }, [refId, isRTL]);

  if (!refId || !SAFE_REF_PATTERN.test(refId)) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onCopy}
      title={label}
      aria-label={label}
      className={cn(
        size === 'xs' ? 'h-7 w-7' : 'h-8 w-8',
        className,
      )}
    >
      <Link2 className={cn(size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
    </Button>
  );
};

export default ReferenceLinkCopy;