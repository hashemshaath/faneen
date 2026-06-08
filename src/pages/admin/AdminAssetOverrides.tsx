/**
 * RENTAL-ASSET-INTEGRATION-2 — read-only override audit history.
 * Route: /admin/assets/overrides
 */
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  listOverrides, OVERRIDE_REASONS,
  type AssetOverrideLogRow,
} from '@/modules/assets/services/overrides';

const reasonLabel = (v: string, bi: (a: string, e: string) => string) =>
  bi(OVERRIDE_REASONS.find(r => r.value === v)?.ar ?? v,
     OVERRIDE_REASONS.find(r => r.value === v)?.en ?? v);

const AdminAssetOverrides: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const [rows, setRows] = useState<AssetOverrideLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setRows(await listOverrides(200));
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          icon={ShieldAlert}
          title={bi('سجل التجاوزات الإدارية للأصول','Asset admin overrides')}
          subtitle={bi('سجل للقراءة فقط لكل تجاوز إداري — سبب، ملاحظة، حالة قبل/بعد، الفاعل، التاريخ.','Read-only log of every admin override — reason, note, before/after, actor, timestamp.')}
        />
        <Card className="p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              <Bi ar="لا توجد تجاوزات مسجلة." en="No overrides logged." />
            </div>
          ) : (
            <div className="divide-y">
              {rows.map(r => (
                <div key={r.id} className="py-3 grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                  <div className="tech-content font-medium">{r.ref_id}</div>
                  <div className="tech-content text-muted-foreground">{r.asset_id.slice(0,8)}…</div>
                  <div>{reasonLabel(r.reason, bi)}</div>
                  <div className="md:col-span-2 text-muted-foreground truncate" title={r.note}>{r.note}</div>
                  <div className="text-xs text-muted-foreground tech-content">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="md:col-span-6 text-xs text-muted-foreground tech-content">
                    <span className="opacity-75"><Bi ar="قبل" en="before" />:</span> {JSON.stringify(r.before_state)}
                    {' · '}
                    <span className="opacity-75"><Bi ar="بعد" en="after" />:</span> {JSON.stringify(r.after_state)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAssetOverrides;
