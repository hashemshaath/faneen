/**
 * SITE FILES TAB — read-only inventory of files already linked to a
 * site through its child contracts and projects.
 *
 * Sources (all RLS-filtered by the existing policies):
 *   - contract_attachments (per contract id in `execution_site_id = site`)
 *   - project_images       (per project id in `site_id = site`)
 *
 * Hard rules — enforced here AND in `dashboardSiteFilesReadOnly.test.ts`:
 *   - No `<input type="file">`, no `useMutation`, no storage write call.
 *   - No "Coming Soon" stub when real data exists — show it.
 *   - Empty state explicitly notes that upload is not enabled yet.
 */
import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

type FileSource = 'contract' | 'project';

interface FileRow {
  key: string;
  name: string;
  type: string | null;
  url: string | null;
  source: FileSource;
  createdAt: string | null;
}

interface Props {
  isRTL: boolean;
  contractIds: string[];
  projectIds: string[];
}

const SiteFilesTab = memo(function SiteFilesTab({ isRTL, contractIds, projectIds }: Props) {
  const contractKey = contractIds.join(',');
  const projectKey = projectIds.join(',');

  const { data: contractFiles = [], isLoading: cLoading } = useQuery({
    queryKey: ['site-files-contracts', contractKey],
    enabled: contractIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_attachments')
        .select('id, file_name, file_type, file_url, created_at')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projectFiles = [], isLoading: pLoading } = useQuery({
    queryKey: ['site-files-projects', projectKey],
    enabled: projectIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_images')
        .select('id, image_url, caption_ar, caption_en, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows: FileRow[] = useMemo(() => {
    const out: FileRow[] = [];
    for (const f of contractFiles) {
      out.push({
        key: `c:${f.id}`,
        name: f.file_name || (isRTL ? 'مرفق عقد' : 'Contract attachment'),
        type: f.file_type ?? null,
        url: f.file_url ?? null,
        source: 'contract',
        createdAt: f.created_at ?? null,
      });
    }
    for (const img of projectFiles) {
      out.push({
        key: `p:${img.id}`,
        name:
          (isRTL ? img.caption_ar : img.caption_en) ||
          (isRTL ? 'صورة مشروع' : 'Project image'),
        type: 'image',
        url: img.image_url ?? null,
        source: 'project',
        createdAt: img.created_at ?? null,
      });
    }
    return out.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [contractFiles, projectFiles, isRTL]);

  const loading = cLoading || pLoading;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-3/4 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card data-testid="site-files-empty">
        <CardContent className="p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">
            {pickBi(isRTL,
              'لا توجد ملفات مرتبطة بهذا الموقع حتى الآن',
              'No files linked to this site yet')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {pickBi(isRTL,
              'سيتم تفعيل رفع وإدارة ملفات المواقع في مرحلة لاحقة. تظهر هنا حالياً المرفقات المرتبطة بعقود الموقع وصور مشاريعه فقط.',
              'Direct upload will be enabled in a later phase. This tab currently lists attachments from the site\u2019s contracts and project images only.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="site-files-list">
      <CardContent className="p-3">
        <ul className="divide-y divide-border/40">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                {r.source === 'project' ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">
                    {r.source === 'project'
                      ? pickBi(isRTL, 'مشروع', 'Project')
                      : pickBi(isRTL, 'عقد', 'Contract')}
                  </Badge>
                  {r.type && <span className="tech-content">{r.type}</span>}
                  {r.createdAt && (
                    <span className="tech-content">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                  aria-label={pickBi(isRTL, 'فتح الملف', 'Open file')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {pickBi(isRTL, 'عرض', 'Open')}
                </a>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
});

export default SiteFilesTab;