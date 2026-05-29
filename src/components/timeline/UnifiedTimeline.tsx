/**
 * BUSINESS-FINISHING-1 Phase C — Unified activity timeline.
 *
 * Reads `business_audit_log` via the existing
 * `listBusinessActivityTimeline` wrapper. RLS is authoritative.
 * Renders ref id, action, actor, timestamp, and safe metadata
 * (key/value summary — never a JSON dump).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  listBusinessActivityTimeline,
  type BusinessActivityEvent,
} from '@/modules/businesses/notes/services/listBusinessActivityTimeline';

export interface UnifiedTimelineProps {
  businessId: string;
  limit?: number;
  /** Optional client-side filter (e.g. only entity_types of interest). */
  filter?: (e: BusinessActivityEvent) => boolean;
  title?: string;
  className?: string;
}

const SAFE_META_KEYS = new Set([
  'ref_id', 'status', 'from', 'to', 'amount', 'currency',
  'stage', 'reason', 'invitation_id', 'role',
]);

function summarizeMeta(meta: Record<string, unknown> | null): Array<[string, string]> {
  if (!meta) return [];
  const out: Array<[string, string]> = [];
  for (const k of Object.keys(meta)) {
    if (!SAFE_META_KEYS.has(k)) continue;
    const v = meta[k];
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out.push([k, String(v)]);
    }
  }
  return out;
}

function formatAbs(iso: string, isRTL: boolean): string {
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch { return iso; }
}

function formatRel(iso: string, isRTL: boolean, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.round((t - now) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(isRTL ? 'ar-u-nu-latn' : 'en', { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  businessId, limit = 50, filter, title, className,
}) => {
  const { isRTL } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ['unified-timeline', businessId, limit],
    queryFn: async () => {
      const { data, error } = await listBusinessActivityTimeline({ businessId, limit });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const events = (data ?? []).filter((e) => (filter ? filter(e) : true));

  return (
    <Card className={className} data-testid="unified-timeline">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {title ?? (isRTL ? 'سجل النشاط' : 'Activity timeline')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        )}
        {error && (
          <p className="text-xs text-destructive">
            {isRTL ? 'تعذّر تحميل السجل' : 'Failed to load timeline'}
          </p>
        )}
        {!isLoading && !error && events.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لا توجد أحداث بعد' : 'No events yet'}
          </p>
        )}
        <ul className="space-y-2">
          {events.map((e) => {
            const meta = summarizeMeta(e.metadata);
            const refId = (e.metadata && typeof e.metadata['ref_id'] === 'string')
              ? (e.metadata['ref_id'] as string)
              : null;
            return (
              <li
                key={e.id}
                className="rounded-md border border-border/40 bg-card/50 p-2.5"
                data-testid="timeline-event"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{e.action}</span>
                      <span className="text-[10px] text-muted-foreground">{e.entity_type}</span>
                      {refId && (
                        <span className="text-[10px] font-mono text-muted-foreground tech-content">
                          {refId}
                        </span>
                      )}
                    </div>
                    {meta.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {meta.map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[10px] rounded bg-muted/50 px-1.5 py-0.5"
                          >
                            {k}: <span className="font-mono tech-content">{v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <div
                      className="text-[10px] text-muted-foreground"
                      title={formatAbs(e.created_at, isRTL)}
                    >
                      {formatRel(e.created_at, isRTL)}
                    </div>
                    <div className="text-[10px] text-muted-foreground tech-content">
                      {formatAbs(e.created_at, isRTL)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default UnifiedTimeline;