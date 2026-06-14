import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBi } from '@/components/common/Bilingual';
import { PartnerShowcaseRow } from './PartnerShowcaseRow';

export interface PartnerShowcaseListItem {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url: string;
  target_url: string | null;
  is_active: boolean;
  sort_order: number;
  source_type: 'business' | 'external';
}

/**
 * PartnerShowcaseListSection — pure presentational list. Receives an
 * already-sorted (or sortable) array and forwards move/toggle/delete
 * intents to the parent page where mutations live.
 */
export interface PartnerShowcaseListSectionProps {
  items: ReadonlyArray<PartnerShowcaseListItem>;
  isLoading: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
  onToggleShow: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
}

export const PartnerShowcaseListSection: React.FC<PartnerShowcaseListSectionProps> = ({
  items,
  isLoading,
  onMove,
  onToggleShow,
  onDelete,
}) => {
  const bi = useBi();
  const sorted = React.useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{bi('الشركاء الحاليون', 'Current partners')}</span>
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {bi('لا يوجد شركاء بعد. أضف أول شريك من الأعلى.', 'No partners yet. Add the first one above.')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((it, idx, arr) => (
              <PartnerShowcaseRow
                key={it.id}
                id={it.id}
                nameAr={it.name_ar}
                nameEn={it.name_en}
                logoUrl={it.logo_url}
                targetUrl={it.target_url}
                isActive={it.is_active}
                sourceType={it.source_type}
                canMoveUp={idx > 0}
                canMoveDown={idx < arr.length - 1}
                onMoveUp={() => onMove(it.id, -1)}
                onMoveDown={() => onMove(it.id, +1)}
                onToggleShow={(next) => onToggleShow(it.id, next)}
                onDelete={() => onDelete(it.id)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PartnerShowcaseListSection;