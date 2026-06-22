/**
 * CLIENT WORKSPACE UNIFICATION — Contracts tab (read-only).
 *
 * Reads `contracts` filtered by `execution_site_id`. The
 * «Create contract from this project» CTA is intentionally rendered
 * disabled in P1 — actual creation requires a new RPC, gated behind
 * a separate approval (Phase 4 plan).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bi, useBi } from '@/components/common/Bilingual';
import { FileText, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  listWorkspaceContracts,
  type ClientWorkspace,
} from '@/services/clientWorkspaceService';

interface Props {
  workspace: ClientWorkspace;
}

export const WorkspaceContractsTab: React.FC<Props> = ({ workspace }) => {
  const bi = useBi();
  const { data, isLoading } = useQuery({
    queryKey: ['workspace-contracts', workspace.siteId],
    queryFn: () => listWorkspaceContracts(workspace.siteId),
    enabled: !!workspace.siteId,
  });

  const contracts = data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <Bi ar="إنشاء عقد جديد" en="Create a new contract" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            type="button"
            disabled
            aria-disabled="true"
            data-testid="workspace-create-contract-disabled"
            title={bi(
              'قيد التفعيل — يحتاج اعتماد RPC إنشاء العقد من المشروع',
              'Coming soon — requires approval of the create-from-project RPC',
            )}
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            <Bi ar="إنشاء عقد من هذا المشروع" en="Create contract from this project" />
          </Button>
          <p className="text-xs text-muted-foreground">
            <Bi
              ar="قيد التفعيل — يحتاج اعتماد RPC إنشاء العقد من المشروع"
              en="Coming soon — requires approval of the create-from-project RPC"
            />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            <Bi ar="العقود المرتبطة" en="Linked contracts" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!workspace.siteId ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              <Bi
                ar="لا يوجد موقع تنفيذ مرتبط بهذا المشروع لعرض العقود"
                en="No execution site is linked to this workspace yet"
              />
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              <Bi ar="جاري التحميل…" en="Loading…" />
            </p>
          ) : contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              <Bi ar="لا توجد عقود بعد" en="No contracts yet" />
            </p>
          ) : (
            <ul className="divide-y">
              {contracts.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {bi(c.title_ar ?? '', c.title_en ?? '') ||
                        c.contract_number ||
                        c.id}
                    </p>
                    <p className="text-xs text-muted-foreground tech-content">
                      {c.contract_number ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status && (
                      <Badge variant="outline" className="text-[10px]">
                        {c.status}
                      </Badge>
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/dashboard/contracts?id=${c.id}`}>
                        <Bi ar="عرض" en="Open" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceContractsTab;