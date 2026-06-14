import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileClock } from 'lucide-react';
import type { PrivateSectorAuditEntry } from '@/features/private-sectors/types';

export interface PrivateSectorAuditListProps {
  entries: PrivateSectorAuditEntry[];
  emptyLabel: string;
}

/**
 * Inline audit list (read-only) used inside a sector row.
 */
export const PrivateSectorAuditList: React.FC<PrivateSectorAuditListProps> = ({
  entries, emptyLabel,
}) => {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <>
      {entries.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
          <span className="text-muted-foreground">{a.entity_type}</span>
          {a.notes && <span className="text-muted-foreground italic truncate">"{a.notes}"</span>}
          <span className="text-muted-foreground tech-content ms-auto">{new Date(a.created_at).toLocaleString()}</span>
        </div>
      ))}
    </>
  );
};

export interface PrivateSectorAuditPanelProps {
  title: string;
  emptyLabel: string;
  entries: PrivateSectorAuditEntry[];
  limit?: number;
}

/**
 * PrivateSectorAuditPanel — global recent activity card (read-only).
 */
export const PrivateSectorAuditPanel: React.FC<PrivateSectorAuditPanelProps> = ({
  title, emptyLabel, entries, limit = 20,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <FileClock className="h-4 w-4" /> {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-1.5">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : entries.slice(0, limit).map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
          <span className="text-muted-foreground">{a.entity_type}</span>
          <span className="text-muted-foreground tech-content ms-auto">{new Date(a.created_at).toLocaleString()}</span>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default PrivateSectorAuditPanel;