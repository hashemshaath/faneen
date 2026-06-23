/**
 * CLIENT CONTRACT CREATION FROM WORKSPACE — Phase 4 Contracts tab.
 *
 * - Lists existing contracts scoped to the workspace's execution site.
 * - Renders an inline create form (no popup) for the workspace owner.
 * - Enabled only when a provider can be derived (project linked to a
 *   business). Standalone sites and personal projects without a
 *   business link stay disabled with a clear helper message.
 * - Never shows a ClientPicker. The client is always `auth.uid()`.
 * - All DB writes go through the service wrapper, not the RPC
 *   directly.
 */
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useToast } from '@/hooks/use-toast';
import { FileText, Lock, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listWorkspaceContracts,
  type ClientWorkspace,
} from '@/services/clientWorkspaceService';
import {
  createContractFromWorkspace,
  type CreateContractFromWorkspaceErrorCode,
} from '@/modules/contracts/services/createContractFromWorkspace';

interface Props {
  workspace: ClientWorkspace;
}

function errorMessage(
  code: CreateContractFromWorkspaceErrorCode | null,
  bi: (ar: string, en: string) => string,
): string {
  switch (code) {
    case 'NOT_WORKSPACE_OWNER':
      return bi('لا تملك صلاحية على هذا المشروع', 'You do not own this workspace');
    case 'PROVIDER_NOT_DERIVABLE':
      return bi(
        'لا يمكن إنشاء عقد حتى يتم ربط المشروع بمزود خدمة',
        'A provider must be linked to this workspace before a contract can be created',
      );
    case 'AUTH_REQUIRED':
      return bi('يجب تسجيل الدخول', 'Sign-in required');
    case 'WORKSPACE_NOT_FOUND':
      return bi('لم يتم العثور على المشروع', 'Workspace not found');
    case 'CLIENT_CANNOT_BE_PROVIDER':
      return bi('لا يمكنك إنشاء عقد مع نفسك', 'You cannot be both client and provider');
    default:
      return bi('تعذّر إنشاء العقد', 'Could not create contract');
  }
}

export const WorkspaceContractsTab: React.FC<Props> = ({ workspace }) => {
  const bi = useBi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [titleAr, setTitleAr] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [descriptionAr, setDescriptionAr] = useState<string>('');

  // Eligibility (Project ↔ Provider Linking phase):
  //   - must be a project workspace
  //   - must have an explicit provider link, EITHER via the business
  //     that owns the project (legacy business-owned projects) OR via
  //     the new `selected_provider_business_id` link a client owner
  //     can set through `link_project_provider_as_client`.
  // Sites and personal projects without a provider link stay disabled.
  const providerBusinessId =
    workspace.linkedProviderBusinessId ?? workspace.businessId ?? null;
  const eligible = workspace.kind === 'project' && !!providerBusinessId;

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-contracts', workspace.siteId],
    queryFn: () => listWorkspaceContracts(workspace.siteId),
    enabled: !!workspace.siteId,
  });

  const contracts = data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      createContractFromWorkspace({
        kind: workspace.kind,
        workspaceId: workspace.id,
        templateVersionId: null,
        payload: {
          title_ar: titleAr.trim() || undefined,
          description_ar: descriptionAr.trim() || undefined,
          total_amount: Number(totalAmount) || 0,
          currency_code: 'SAR',
          start_date: startDate || null,
          end_date: endDate || null,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: errorMessage(res.errorCode, bi),
        });
        return;
      }
      toast({ title: bi('تم إنشاء العقد', 'Contract created') });
      queryClient.invalidateQueries({ queryKey: ['workspace-contracts', workspace.siteId] });
      setOpen(false);
      setTitleAr('');
      setTotalAmount('');
      setStartDate('');
      setEndDate('');
      setDescriptionAr('');
      if (res.contractId) {
        navigate(`/dashboard/contracts?id=${res.contractId}`);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '';
      toast({ variant: 'destructive', title: msg || bi('خطأ', 'Error') });
    },
  });


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <Bi ar="إنشاء عقد جديد" en="Create a new contract" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              type="button"
              disabled={!eligible}
              aria-disabled={!eligible}
              data-testid={eligible ? 'workspace-create-contract' : 'workspace-create-contract-disabled'}
              onClick={() => setOpen((v) => !v)}
              className="gap-2"
            >
              {eligible ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <Bi
                ar={workspace.kind === 'project' ? 'إنشاء عقد من هذا المشروع' : 'إنشاء عقد من هذا الموقع'}
                en={workspace.kind === 'project' ? 'Create contract from this project' : 'Create contract from this site'}
              />
            </Button>
            {!eligible && (
              <p className="text-xs text-muted-foreground">
                <Bi
                  ar="لا يمكن إنشاء عقد حتى يتم ربط المشروع بمزود خدمة"
                  en="A provider must be linked to this workspace before a contract can be created"
                />
              </p>
            )}
          </div>

          {eligible && open && (
            <form
              data-testid="workspace-create-contract-form"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="sm:col-span-2">
                <Label className="text-xs">
                  <Bi ar="عنوان العقد" en="Contract title" />
                </Label>
                <Input
                  dir="auto"
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <Label className="text-xs">
                  <Bi ar="القيمة الإجمالية (SAR)" en="Total amount (SAR)" />
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">
                    <Bi ar="تاريخ البدء" en="Start date" />
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">
                    <Bi ar="تاريخ الانتهاء" en="End date" />
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">
                  <Bi ar="نطاق العمل / ملاحظات" en="Scope / notes" />
                </Label>
                <Textarea
                  dir="auto"
                  rows={3}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  <Bi ar="إلغاء" en="Cancel" />
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  <Bi
                    ar={mutation.isPending ? 'جاري الإنشاء…' : 'إنشاء العقد'}
                    en={mutation.isPending ? 'Creating…' : 'Create contract'}
                  />
                </Button>
              </div>
            </form>
          )}
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