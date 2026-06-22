/**
 * CLIENT WORKSPACE UNIFICATION — Phase 1 detail page.
 *
 * Tabs: Overview | Files | Contracts | Licenses* | Violations* | Reports*
 * (* Coming Soon — no DB/RPC, no forms, no mutations.)
 */
import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Layers } from 'lucide-react';
import {
  getClientWorkspace,
  type ClientWorkspaceKind,
} from '@/services/clientWorkspaceService';
import WorkspaceOverviewTab from '@/components/workspace/WorkspaceOverviewTab';
import WorkspaceFilesTab from '@/components/workspace/WorkspaceFilesTab';
import WorkspaceContractsTab from '@/components/workspace/WorkspaceContractsTab';
import WorkspaceComingSoonTab from '@/components/workspace/WorkspaceComingSoonTab';

const KIND_VALUES: ClientWorkspaceKind[] = ['project', 'site'];

const DashboardWorkspaceDetail: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { kind, id } = useParams<{ kind: string; id: string }>();

  const normalizedKind = KIND_VALUES.find((k) => k === kind);
  const enabled = !!normalizedKind && !!id;

  const { data, isLoading } = useQuery({
    queryKey: ['client-workspace', normalizedKind, id],
    queryFn: () => getClientWorkspace(normalizedKind as ClientWorkspaceKind, id as string),
    enabled,
  });

  if (!normalizedKind || !id) {
    return <Navigate to="/dashboard/workspaces" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Layers}
          title={data?.workspace.title ?? bi('تفاصيل المساحة', 'Workspace details')}
          subtitle={bi(
            'مساحة موحدة للمشروع/الموقع وملفاته وعقوده',
            'Unified space for the project/site, files and contracts',
          )}
        />

        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-72 rounded-xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="overview">
                <Bi ar="نظرة عامة" en="Overview" />
              </TabsTrigger>
              <TabsTrigger value="files">
                <Bi ar="الملفات" en="Files" />
              </TabsTrigger>
              <TabsTrigger value="contracts">
                <Bi ar="العقود" en="Contracts" />
              </TabsTrigger>
              <TabsTrigger value="licenses">
                <Bi ar="الرخص" en="Licenses" />
              </TabsTrigger>
              <TabsTrigger value="violations">
                <Bi ar="المخالفات" en="Violations" />
              </TabsTrigger>
              <TabsTrigger value="reports">
                <Bi ar="البلاغات" en="Reports" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <WorkspaceOverviewTab detail={data} />
            </TabsContent>
            <TabsContent value="files" className="mt-4">
              <WorkspaceFilesTab workspace={data.workspace} />
            </TabsContent>
            <TabsContent value="contracts" className="mt-4">
              <WorkspaceContractsTab workspace={data.workspace} />
            </TabsContent>
            <TabsContent value="licenses" className="mt-4">
              <WorkspaceComingSoonTab titleAr="الرخص" titleEn="Licenses" />
            </TabsContent>
            <TabsContent value="violations" className="mt-4">
              <WorkspaceComingSoonTab titleAr="المخالفات" titleEn="Violations" />
            </TabsContent>
            <TabsContent value="reports" className="mt-4">
              <WorkspaceComingSoonTab titleAr="البلاغات" titleEn="Reports" />
            </TabsContent>
          </Tabs>
        )}

        <div className="text-xs">
          <Link
            to="/dashboard/workspaces"
            className="text-muted-foreground hover:text-foreground"
          >
            <Bi ar="‹ العودة إلى مشاريعي ومواقعي" en="‹ Back to My Projects & Sites" />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardWorkspaceDetail;