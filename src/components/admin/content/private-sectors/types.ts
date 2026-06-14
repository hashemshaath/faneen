import type { PrivateSectorStatus } from '@/features/private-sectors/types';
import type { DirectoryBadgeTone } from '@/components/admin/content';

export const PS_STATUS_TONE: Record<PrivateSectorStatus, DirectoryBadgeTone> = {
  draft: 'muted',
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  suspended: 'muted',
};