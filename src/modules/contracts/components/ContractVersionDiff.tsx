import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { listContractVersions, diffSnapshots } from '@/modules/contracts/services/versions';
import { GitCompareArrows, History } from 'lucide-react';

interface Props { contractId: string }

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export const ContractVersionDiff: React.FC<Props> = ({ contractId }) => {
  const { isRTL } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['contract-versions', contractId],
    queryFn: () => listContractVersions(contractId),
  });

  const versions = data ?? [];
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Auto-select latest two
  const left = useMemo(
    () => versions.find(v => v.id === leftId) ?? versions[1] ?? null,
    [versions, leftId],
  );
  const right = useMemo(
    () => versions.find(v => v.id === rightId) ?? versions[0] ?? null,
    [versions, rightId],
  );

  const diffs = useMemo(
    () => (left && right ? diffSnapshots(left.snapshot, right.snapshot) : []),
    [left, right],
  );
  const changedCount = diffs.filter(d => d.changed).length;
  const visible = showUnchanged ? diffs : diffs.filter(d => d.changed);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (versions.length < 2) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        {isRTL ? 'لا توجد إصدارات كافية للمقارنة' : 'Not enough versions to compare'}
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{isRTL ? 'مقارنة الإصدارات' : 'Compare Versions'}</h3>
            <Badge variant="secondary" className="ms-auto">
              {changedCount} {isRTL ? 'تغيير' : 'changes'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {isRTL ? 'الإصدار القديم' : 'Older version'}
              </label>
              <select
                className="w-full h-12 rounded-xl border border-input bg-background px-3"
                value={left?.id ?? ''}
                onChange={(e) => setLeftId(e.target.value)}
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number} · {v.kind} · {new Date(v.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {isRTL ? 'الإصدار الأحدث' : 'Newer version'}
              </label>
              <select
                className="w-full h-12 rounded-xl border border-input bg-background px-3"
                value={right?.id ?? ''}
                onChange={(e) => setRightId(e.target.value)}
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number} · {v.kind} · {new Date(v.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowUnchanged(v => !v)} className="rounded-lg">
              {showUnchanged
                ? (isRTL ? 'إخفاء غير المتغيرة' : 'Hide unchanged')
                : (isRTL ? 'إظهار غير المتغيرة' : 'Show unchanged')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {isRTL ? 'لا توجد فروقات' : 'No differences'}
            </div>
          ) : (
            <div className="divide-y">
              {visible.map(d => (
                <div key={d.key} className={`p-4 grid grid-cols-12 gap-3 text-sm ${d.changed ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                  <div className="col-span-12 md:col-span-3 font-mono text-xs text-muted-foreground tech-content break-all">
                    {d.key}
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">{isRTL ? 'قبل' : 'Before'}</div>
                    <div className={`tech-content break-words ${d.changed ? 'text-red-600 line-through decoration-red-400/60' : ''}`}>
                      {formatValue(d.before)}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">{isRTL ? 'بعد' : 'After'}</div>
                    <div className={`tech-content break-words ${d.changed ? 'text-emerald-700 font-medium' : ''}`}>
                      {formatValue(d.after)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractVersionDiff;