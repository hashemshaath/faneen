/**
 * CLIENT WORKSPACE UNIFICATION — Phase 1 list page.
 *
 * Read-only unified view of the client's `projects` + `client_sites`.
 * No DB / RPC / migration changes. No contract creation from here.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader, EmptyState } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  FolderOpen, MapPin, ArrowLeft, ArrowRight, FileText, Image as ImageIcon, Layers,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  listClientWorkspaces,
  type ClientWorkspace,
} from '@/services/clientWorkspaceService';

const DashboardWorkspaces: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const { data, isLoading } = useQuery({
    queryKey: ['client-workspaces', user?.id ?? null],
    queryFn: () => listClientWorkspaces(user!.id),
    enabled: !!user?.id,
  });

  const workspaces: ClientWorkspace[] = data ?? [];
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Layers}
          title={bi('مشاريعي ومواقعي', 'My Projects & Sites')}
          subtitle={bi(
            'إدارة مواقعك ومشاريعك وعقودك وملفاتك من مكان واحد',
            'Manage your sites, projects, contracts and files in one place',
          )}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-10 h-10" />}
            title={bi('لا توجد مشاريع أو مواقع بعد', 'No projects or sites yet')}
            description={bi(
              'أضف موقعك أو مشروعك الأول لإدارة عقودك وملفاتك من مكان واحد.',
              'Add your first site or project to manage contracts and files in one place.',
            )}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((w) => {
              const Icon = w.kind === 'project' ? FolderOpen : MapPin;
              return (
                <Card
                  key={`${w.kind}-${w.id}`}
                  className="hover-lift"
                  data-testid="workspace-card"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 text-primary p-2 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate">{w.title}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            <Bi
                              ar="مشروع"
                              en="Project"
                            />
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            <Bi
                              ar={w.ownershipType === 'business' ? 'تابع لمنشأة' : 'شخصي'}
                              en={w.ownershipType === 'business' ? 'Business' : 'Personal'}
                            />
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      {(w.city || w.district) && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          {[w.city, w.district].filter(Boolean).join(' — ') || '—'}
                        </p>
                      )}
                      <p className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {w.filesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {w.contractsCount}
                        </span>
                        {w.updatedAt && (
                          <span className="ms-auto tech-content">
                            {new Date(w.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    <Button asChild size="sm" variant="outline" className="self-stretch">
                      <Link to={`/dashboard/workspaces/${w.kind}/${w.id}`}>
                        <span className="flex items-center justify-center gap-1.5 w-full">
                          <Bi ar="إدارة" en="Manage" />
                          <ArrowIcon className="w-3.5 h-3.5" />
                        </span>
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardWorkspaces;