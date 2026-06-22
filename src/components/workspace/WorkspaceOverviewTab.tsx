/**
 * CLIENT WORKSPACE UNIFICATION — Overview tab (read-only).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bi, useBi } from '@/components/common/Bilingual';
import type { ClientWorkspaceDetail } from '@/services/clientWorkspaceService';

interface Props {
  detail: ClientWorkspaceDetail;
}

export const WorkspaceOverviewTab: React.FC<Props> = ({ detail }) => {
  const bi = useBi();
  const { workspace, project, site } = detail;
  const description = bi(
    project?.description_ar ?? site?.label ?? '',
    project?.description_en ?? site?.label ?? '',
  );

  const rows: Array<{ label: { ar: string; en: string }; value: string | null }> = [
    { label: { ar: 'النوع', en: 'Type' }, value: bi(
        workspace.kind === 'project' ? 'مشروع' : 'موقع',
        workspace.kind === 'project' ? 'Project' : 'Site',
      ) },
    { label: { ar: 'المالك', en: 'Ownership' }, value: bi(
        workspace.ownershipType === 'business' ? 'تابع لمنشأة' : 'شخصي',
        workspace.ownershipType === 'business' ? 'Business' : 'Personal',
      ) },
    { label: { ar: 'المدينة', en: 'City' }, value: workspace.city },
    { label: { ar: 'الحي', en: 'District' }, value: workspace.district },
    { label: { ar: 'العنوان', en: 'Address' }, value: workspace.address },
    { label: { ar: 'آخر تحديث', en: 'Last update' }, value: workspace.updatedAt
        ? new Date(workspace.updatedAt).toLocaleDateString()
        : null },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{workspace.title}</CardTitle>
        <Badge variant="secondary">
          <Bi
            ar={workspace.kind === 'project' ? 'مشروع' : 'موقع'}
            en={workspace.kind === 'project' ? 'Project' : 'Site'}
          />
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map((row, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                <Bi ar={row.label.ar} en={row.label.en} />
              </dt>
              <dd className="text-sm font-medium text-foreground">{row.value || '—'}</dd>
            </div>
          ))}
        </dl>
        {description && description.trim().length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">
              <Bi ar="الوصف" en="Description" />
            </p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceOverviewTab;