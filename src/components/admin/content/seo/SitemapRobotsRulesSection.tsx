import React from 'react';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface RobotsRuleRow {
  path: string;
  expected: string;
  actual: string;
  matched: string | null;
  ok: boolean;
}

/**
 * SitemapRobotsRulesSection — presentational view of robots.txt rule
 * checks. Receives parsed rows from the parent (which owns the audit
 * query); makes no edits to public/robots.txt.
 */
export interface SitemapRobotsRulesSectionProps {
  isAr: boolean;
  hasAudit: boolean;
  auditCreatedAt?: string | null;
  rows: ReadonlyArray<RobotsRuleRow>;
}

export const SitemapRobotsRulesSection: React.FC<SitemapRobotsRulesSectionProps> = ({
  isAr, hasAudit, auditCreatedAt, rows,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        {isAr ? 'فحص قواعد robots.txt' : 'Robots.txt rules check'}
        {hasAudit && auditCreatedAt && (
          <Badge variant="secondary" className="tech-content text-xs">
            {new Date(auditCreatedAt).toLocaleString()}
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {!hasAudit && (
        <p className="text-sm text-muted-foreground">
          {isAr ? 'لا يوجد فحص محفوظ بعد. اضغط "تشغيل وحفظ فحص".' : 'No saved audit yet. Click "Run & save audit".'}
        </p>
      )}
      {hasAudit && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {isAr ? 'تعذر قراءة robots.txt' : 'robots.txt could not be parsed'}
        </p>
      )}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((r) => (
            <div key={r.path + r.expected} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${r.ok ? '' : 'border-destructive/40 bg-destructive/5'}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium tech-content truncate">{r.path}</div>
                <div className="text-xs text-muted-foreground tech-content">
                  {isAr ? 'متوقع' : 'expected'}: {r.expected}{r.matched ? ` · ${isAr ? 'القاعدة' : 'rule'}: ${r.matched}` : ''}
                </div>
              </div>
              <Badge variant={r.ok ? 'default' : 'destructive'} className="tech-content">{r.actual}</Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default SitemapRobotsRulesSection;