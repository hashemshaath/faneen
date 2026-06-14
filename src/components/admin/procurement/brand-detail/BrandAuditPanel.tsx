/**
 * ADMIN REDESIGN PHASE 9G — BrandAuditPanel.
 * Read-only audit-log presentation. No Supabase, no queries, no mutations.
 */
import React from 'react';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { pickBi } from '@/components/common/Bilingual';
import type { BrandAuditLogRow } from '@/modules/brands';

export interface BrandAuditPanelProps {
  isRTL: boolean;
  events: BrandAuditLogRow[] | undefined;
  loading: boolean;
}

export const BrandAuditPanel: React.FC<BrandAuditPanelProps> = ({ isRTL, events, loading }) => {
  const rows = events ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />{pickBi(isRTL, 'سجل التدقيق', 'Audit log')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-24" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد أحداث', 'No events')}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {rows.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
                <code className="tech-content">{e.action}</code>
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en-US'))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BrandAuditPanel;