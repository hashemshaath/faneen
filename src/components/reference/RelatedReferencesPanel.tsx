/**
 * BUSINESS-FINISHING-1 Phase B — Cross-system navigation panel.
 *
 * Renders a compact list of related entity ref ids using
 * <ReferenceBadge>. Each entry is a clickable link routed through
 * the universal `/r/{refId}` resolver — UUIDs are NEVER exposed.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReferenceBadge } from './ReferenceBadge';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface RelatedReferenceEntry {
  label: { ar: string; en: string };
  refId: string | null | undefined;
}

export interface RelatedReferencesPanelProps {
  entries: ReadonlyArray<RelatedReferenceEntry>;
  title?: string;
  className?: string;
}

export const RelatedReferencesPanel: React.FC<RelatedReferencesPanelProps> = ({
  entries, title, className,
}) => {
  const { isRTL } = useLanguage();
  const filled = entries.filter((e) => !!e.refId);
  if (filled.length === 0) return null;
  return (
    <Card className={cn(className)} data-testid="related-references-panel">
      <CardHeader>
        <CardTitle className="text-sm">
          {title ?? (isRTL ? 'مراجع مرتبطة' : 'Related references')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {filled.map((e, i) => (
            <li key={`${e.refId}-${i}`} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground min-w-[6rem]">
                {isRTL ? e.label.ar : e.label.en}
              </span>
              <Link to={`/r/${encodeURIComponent(e.refId!)}`} className="hover-lift">
                <ReferenceBadge refId={e.refId!} />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RelatedReferencesPanel;