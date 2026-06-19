/**
 * Kanban-style status board for provider leads — one column per status,
 * cards show name, completeness, contact, and inline status moves.
 * Uses click-to-move (no drag library) to keep the bundle small and
 * a11y friendly.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import type { ProviderLeadRow, ProviderLeadStatus } from '@/modules/providers';
import { Bi } from '@/components/common/Bilingual';
import { STATUS_LABEL, STATUS_ORDER, STATUS_TONE, computeCompleteness } from './providerLeadHelpers';
import { CompletenessBar } from './CompletenessBar';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  rows: ProviderLeadRow[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  onMove: (id: string, status: ProviderLeadStatus) => void;
  onEnrich: (row: ProviderLeadRow) => void;
  duplicates: Map<string, string[]>;
}

export const ProviderLeadsKanban: React.FC<Props> = ({
  rows,
  selectedId,
  onOpen,
  onMove,
  onEnrich,
  duplicates,
}) => {
  const { isRTL } = useLanguage();
  const grouped: Record<ProviderLeadStatus, ProviderLeadRow[]> = {
    new: [],
    under_review: [],
    needs_info: [],
    approved: [],
    rejected: [],
    converted_to_business: [],
  };
  for (const r of rows) grouped[r.status].push(r);

  const Prev = isRTL ? ArrowRight : ArrowLeft;
  const Next = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {STATUS_ORDER.map((s, idx) => {
        const prev = idx > 0 ? STATUS_ORDER[idx - 1] : null;
        const next = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
        const items = grouped[s];
        return (
          <div
            key={s}
            className="flex h-full flex-col rounded-xl border bg-muted/20 p-2.5"
          >
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[s]}`}>
                {STATUS_LABEL[s].ar}
              </Badge>
              <span className="text-[10px] tech-content text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto pe-1" style={{ maxHeight: '60vh' }}>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center text-[11px] text-muted-foreground">
                  <Bi ar="لا يوجد" en="Empty" />
                </div>
              ) : (
                items.map((r) => {
                  const c = computeCompleteness(r);
                  const dup = duplicates.get(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => onOpen(r.id)}
                      className={`group cursor-pointer rounded-lg border bg-background p-2.5 text-[11px] transition hover:border-primary/40 hover:shadow-sm ${
                        selectedId === r.id ? 'border-primary ring-1 ring-primary/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{r.name_ar || r.name_en || '—'}</div>
                          <div className="tech-content text-[10px] text-muted-foreground">{r.reference_code}</div>
                        </div>
                        {dup && dup.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-[9px] text-amber-700"
                          >
                            ×{dup.length}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <CompletenessBar pct={c.pct} filled={c.filled} total={c.total} />
                      </div>
                      <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        {prev && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 rounded-md px-1.5 text-[10px]"
                            onClick={() => onMove(r.id, prev)}
                            title={STATUS_LABEL[prev].ar}
                          >
                            <Prev className="h-3 w-3" aria-hidden />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 rounded-md px-1.5 text-[10px]"
                          onClick={() => onEnrich(r)}
                          title="إثراء"
                        >
                          <Sparkles className="h-3 w-3" aria-hidden />
                        </Button>
                        {next && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ms-auto h-6 rounded-md px-1.5 text-[10px]"
                            onClick={() => onMove(r.id, next)}
                            title={STATUS_LABEL[next].ar}
                          >
                            <Next className="h-3 w-3" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};