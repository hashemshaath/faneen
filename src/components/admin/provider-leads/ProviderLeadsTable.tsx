/**
 * Dense, professional table view for provider leads.
 * Row click selects the lead; checkbox toggles bulk selection.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Sparkles, GitBranch } from 'lucide-react';
import type { ProviderLeadRow } from '@/modules/providers';
import { Bi } from '@/components/common/Bilingual';
import { STATUS_LABEL, STATUS_TONE, computeCompleteness } from './providerLeadHelpers';
import { CompletenessBar } from './CompletenessBar';

interface Props {
  rows: ProviderLeadRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onEnrich: (row: ProviderLeadRow) => void;
  duplicates: Map<string, string[]>;
}

export const ProviderLeadsTable: React.FC<Props> = ({
  rows,
  selected,
  onToggle,
  onToggleAll,
  selectedId,
  onOpen,
  onEnrich,
  duplicates,
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
        <Bi ar="لا توجد نتائج مطابقة للفلاتر" en="No matching leads" />
      </div>
    );
  }
  const allSelected = selected.size > 0 && selected.size === rows.length;
  return (
    <div className="overflow-auto rounded-xl border bg-background">
      <table className="w-full text-[12px]" data-testid="provider-leads-table">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
          <tr className="text-start">
            <th className="w-8 px-2 py-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label="Select all"
              />
            </th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">المرجع</th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">المنشأة</th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">الحالة</th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">الاكتمال</th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">التواصل</th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">المدينة</th>
            <th className="px-2 py-2 text-start font-medium text-muted-foreground">التاريخ</th>
            <th className="px-2 py-2 text-end font-medium text-muted-foreground">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const c = computeCompleteness(r);
            const dup = duplicates.get(r.id);
            const isOpen = selectedId === r.id;
            const isSel = selected.has(r.id);
            return (
              <tr
                key={r.id}
                onClick={() => onOpen(r.id)}
                className={`cursor-pointer border-t transition hover:bg-muted/40 ${
                  isOpen ? 'bg-primary/5' : isSel ? 'bg-primary/[0.03]' : ''
                }`}
              >
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={() => onToggle(r.id)}
                    aria-label={`Select ${r.reference_code}`}
                  />
                </td>
                <td className="px-2 py-2 tech-content text-[11px] text-muted-foreground">
                  {r.reference_code}
                </td>
                <td className="px-2 py-2">
                  <div className="font-semibold">{r.name_ar || r.name_en || '—'}</div>
                  {r.name_en && r.name_ar && (
                    <div className="text-[10px] text-muted-foreground">{r.name_en}</div>
                  )}
                  {dup && dup.length > 0 && (
                    <Badge
                      variant="outline"
                      className="mt-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700"
                    >
                      <GitBranch className="me-1 h-3 w-3" aria-hidden />
                      محتمل تكرار ({dup.length})
                    </Badge>
                  )}
                </td>
                <td className="px-2 py-2">
                  <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.status]}`}>
                    {STATUS_LABEL[r.status].ar}
                  </Badge>
                </td>
                <td className="px-2 py-2">
                  <CompletenessBar pct={c.pct} filled={c.filled} total={c.total} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-0.5 text-[10px] tech-content">
                    {r.email && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate max-w-[160px]">{r.email}</span>
                      </span>
                    )}
                    {r.phone && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden />
                        {r.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-[11px]">
                  {r.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden />
                      {r.city}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-[10px] tech-content text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-2 py-2 text-end" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEnrich(r)}
                    className="h-7 rounded-lg px-2 text-[10px]"
                    title="إثراء من Google"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};