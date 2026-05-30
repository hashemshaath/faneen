import { useQuery } from '@tanstack/react-query';
import { History, FileText, Download, GitBranch, Scroll, Activity } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getContractFullAuditTrail,
  type ContractAuditEvent,
  type ContractAuditSource,
} from '@/modules/contracts/services/auditTrail';

interface ContractFullHistoryProps {
  contractId: string;
}

const SOURCE_META: Record<ContractAuditSource, { ar: string; en: string; icon: typeof FileText; color: string }> = {
  amendment: { ar: 'ملحق', en: 'Amendment', icon: FileText, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  amendment_audit: { ar: 'سجل ملحق', en: 'Amendment Log', icon: Scroll, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
  pdf_export: { ar: 'تصدير PDF', en: 'PDF Export', icon: Download, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  version: { ar: 'نسخة', en: 'Version', icon: GitBranch, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  audit_log: { ar: 'حدث', en: 'Event', icon: Activity, color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' },
};

function formatPayload(ev: ContractAuditEvent, isRTL: boolean): string {
  const p = ev.payload ?? {};
  const parts: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'object') continue; // skip nested for compact view
    parts.push(`${k}: ${String(v)}`);
  }
  return parts.join(isRTL ? ' • ' : ' • ');
}

export function ContractFullHistory({ contractId }: ContractFullHistoryProps) {
  const { isRTL } = useLanguage();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contract-full-audit-trail', contractId],
    queryFn: () => getContractFullAuditTrail(contractId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-4 text-sm text-destructive">
          {isRTL ? 'تعذّر تحميل السجل الكامل' : 'Failed to load full history'}
          {error instanceof Error ? ` — ${error.message}` : ''}
        </CardContent>
      </Card>
    );
  }

  const events = data ?? [];
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {isRTL ? 'لا توجد أحداث مسجّلة بعد' : 'No recorded events yet'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          {isRTL ? 'السجل الكامل للعقد' : 'Full Contract History'}
        </h3>
        <Badge variant="outline" className="tech-content">
          {events.length}
        </Badge>
      </div>
      <ol className="space-y-2">
        {events.map((ev, idx) => {
          const meta = SOURCE_META[ev.source] ?? SOURCE_META.audit_log;
          const Icon = meta.icon;
          const when = new Date(ev.at);
          return (
            <li key={`${ev.source}-${ev.at}-${idx}`}>
              <Card className="hover-lift transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{ev.event}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {isRTL ? meta.ar : meta.en}
                          </Badge>
                        </div>
                        <time className="text-xs text-muted-foreground tech-content shrink-0" dateTime={ev.at}>
                          {when.toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                        </time>
                      </div>
                      {formatPayload(ev, isRTL) && (
                        <p className="text-xs text-muted-foreground mt-1 break-words tech-content">
                          {formatPayload(ev, isRTL)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default ContractFullHistory;