import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface AdminAuditLogTableRow {
  id: string;
  source: string;
  sourceLabelAr: string;
  sourceLabelEn: string;
  sourceBadgeClass: string;
  action: string;
  actor: string | null;
  entity: string | null;
  created_at: string;
}

export interface AdminAuditLogTableSectionProps {
  rows: AdminAuditLogTableRow[];
  loading: boolean;
  emptyAr: string;
  emptyEn: string;
}

export function AdminAuditLogTableSection({ rows, loading, emptyAr, emptyEn }: AdminAuditLogTableSectionProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        <span lang="ar">{emptyAr}</span>
        <span className="block text-xs opacity-70" lang="en">{emptyEn}</span>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/30">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start">Source</th>
            <th className="px-3 py-2 text-start">Action</th>
            <th className="px-3 py-2 text-start">Actor</th>
            <th className="px-3 py-2 text-start">Entity</th>
            <th className="px-3 py-2 text-start">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/20">
              <td className="px-3 py-2">
                <Badge className={r.sourceBadgeClass} variant="secondary">{r.sourceLabelEn}</Badge>
              </td>
              <td className="px-3 py-2 font-medium">{r.action}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.actor ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.entity ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground tech-content">
                {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminAuditLogTableSection;