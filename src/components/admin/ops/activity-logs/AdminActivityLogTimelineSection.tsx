import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { AdminActivityLogRow } from '@/pages/admin/adminActivityLog.types';
import { AdminActivityLogItem } from './AdminActivityLogItem';

export interface AdminActivityLogTimelineGroup {
  label: string;
  logs: AdminActivityLogRow[];
}

export interface AdminActivityLogTimelineSectionProps {
  groups: AdminActivityLogTimelineGroup[];
  isLoading: boolean;
  isFetching: boolean;
  hasResults: boolean;
  canLoadMore: boolean;
  onLoadMore: () => void;
  getProfileName: (userId: string) => string;
  isRTL: boolean;
  emptyLabel: string;
  emptySubLabel: string;
  loadMoreLabel: string;
}

export function AdminActivityLogTimelineSection({
  groups, isLoading, isFetching, hasResults, canLoadMore, onLoadMore,
  getProfileName, isRTL, emptyLabel, emptySubLabel, loadMoreLabel,
}: AdminActivityLogTimelineSectionProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!hasResults) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-medium">{emptyLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{emptySubLabel}</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.label} className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{g.label}</h3>
          <div className="space-y-2">
            {g.logs.map((log) => (
              <AdminActivityLogItem
                key={log.id}
                log={log}
                getProfileName={getProfileName}
                isRTL={isRTL}
              />
            ))}
          </div>
        </section>
      ))}
      {canLoadMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isFetching} className="rounded-xl">
            {isFetching ? <Loader2 className="size-3.5 animate-spin me-2" /> : null}
            {loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default AdminActivityLogTimelineSection;