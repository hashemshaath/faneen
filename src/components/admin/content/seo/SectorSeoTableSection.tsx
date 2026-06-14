import React from 'react';
import {
  Trash2, ArrowDown, ArrowUp, Minus, Type, FileText, Tags, History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface SectorSeoSnapshotRow {
  id: string;
  sector_slug: string;
  language: 'ar' | 'en';
  title: string;
  description: string;
  keywords: string;
  title_length: number;
  description_length: number;
  keywords_count: number;
  note: string | null;
  created_at: string;
}

const Delta: React.FC<{ current: number; previous: number | null }> = ({ current, previous }) => {
  if (previous == null) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = current - previous;
  if (diff === 0) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" />0</span>;
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  const cls = diff > 0 ? 'text-success' : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${cls}`}>
      <Icon className="w-3 h-3" />{diff > 0 ? '+' : ''}{diff}
    </span>
  );
};

/**
 * SectorSeoTableSection — presentational history of captured sector SEO
 * snapshots. Never touches sector metadata, slugs, or sector SEO save
 * behavior; the parent owns the query and the delete mutation.
 */
export interface SectorSeoTableSectionProps {
  isLoading: boolean;
  rows: ReadonlyArray<SectorSeoSnapshotRow>;
  onDelete: (id: string) => void;
  isRTL: boolean;
}

export const SectorSeoTableSection: React.FC<SectorSeoTableSectionProps> = ({
  isLoading, rows, onDelete, isRTL,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <History className="w-4 h-4 text-gold" />
        {isRTL ? `سجل اللقطات (${rows.length})` : `Snapshots history (${rows.length})`}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {isRTL
            ? 'لا توجد لقطات بعد. اضغط «التقاط لقطة» لبدء تتبع التغييرات.'
            : 'No snapshots yet. Click "Capture Snapshot" to start tracking changes.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((snap, idx) => {
            const prev = rows[idx + 1] ?? null;
            return (
              <div key={snap.id} className="border rounded-lg p-3 space-y-2 hover:border-gold/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {new Date(snap.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                    </Badge>
                    {snap.note && <Badge variant="secondary" className="text-xs">{snap.note}</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(snap.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Type className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono">{snap.title_length}</span>
                    <Delta current={snap.title_length} previous={prev?.title_length ?? null} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono">{snap.description_length}</span>
                    <Delta current={snap.description_length} previous={prev?.description_length ?? null} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tags className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono">{snap.keywords_count}</span>
                    <Delta current={snap.keywords_count} previous={prev?.keywords_count ?? null} />
                  </div>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {isRTL ? 'عرض التفاصيل' : 'View details'}
                  </summary>
                  <div className="mt-2 space-y-1.5 pt-2 border-t">
                    <p dir="auto"><strong>{isRTL ? 'العنوان:' : 'Title:'}</strong> {snap.title}</p>
                    <p dir="auto"><strong>{isRTL ? 'الوصف:' : 'Desc:'}</strong> {snap.description}</p>
                    <p dir="auto" className="line-clamp-2"><strong>{isRTL ? 'الكلمات:' : 'Keywords:'}</strong> {snap.keywords}</p>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

export default SectorSeoTableSection;