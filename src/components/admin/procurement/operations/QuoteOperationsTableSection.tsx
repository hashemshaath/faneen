/**
 * Presentational "top providers" table for admin quote-operations.
 *
 * Pure UI — receives the pre-computed rows from the parent. No queries,
 * no mutations, no Supabase, no aggregation.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface QuoteOperationsTopProviderRow {
  id: string;
  name: string;
  cityId: string | null;
  lastActive: string | null;
  received: number;
  viewed: number;
  interested: number;
}

export interface QuoteOperationsTableSectionProps {
  rows: QuoteOperationsTopProviderRow[];
}

export const QuoteOperationsTableSection: React.FC<QuoteOperationsTableSectionProps> = ({ rows }) => (
  <Card><CardContent className="p-5 space-y-3">
    <h2 className="font-heading font-semibold text-base">أعلى المزودين تفاعلًا</h2>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات كافية بعد.</p>
    ) : (
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-start">
              <th className="text-start py-2 px-2">المزود</th>
              <th className="text-start py-2 px-2">فرص</th>
              <th className="text-start py-2 px-2">مشاهدات</th>
              <th className="text-start py-2 px-2">مهتم</th>
              <th className="text-start py-2 px-2">معدل الاهتمام</th>
              <th className="text-start py-2 px-2">آخر نشاط</th>
              <th className="text-end py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2 px-2 font-medium truncate max-w-[200px]">{p.name}</td>
                <td className="py-2 px-2 tech-content">{p.received}</td>
                <td className="py-2 px-2 tech-content">{p.viewed}</td>
                <td className="py-2 px-2 tech-content">{p.interested}</td>
                <td className="py-2 px-2 tech-content">{p.received ? `${Math.round((100 * p.interested) / p.received)}%` : '—'}</td>
                <td className="py-2 px-2 tech-content text-muted-foreground">
                  {p.lastActive ? new Date(p.lastActive).toLocaleDateString('ar-SA-u-nu-latn') : '—'}
                </td>
                <td className="py-2 px-2 text-end">
                  <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                    <Link to={`/admin/businesses?id=${p.id}`}>فتح</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent></Card>
);

export default QuoteOperationsTableSection;