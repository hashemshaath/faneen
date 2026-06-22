/**
 * CLIENT WORKSPACE UNIFICATION — Files tab (read-only).
 *
 * P1 scope:
 *  - project workspaces: list `project_images` (read-only gallery).
 *  - site workspaces: show a Coming-Soon helper. Site file management
 *    arrives in a later phase.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Bi } from '@/components/common/Bilingual';
import { Image as ImageIcon } from 'lucide-react';
import {
  listWorkspaceProjectImages,
  type ClientWorkspace,
} from '@/services/clientWorkspaceService';

interface Props {
  workspace: ClientWorkspace;
}

export const WorkspaceFilesTab: React.FC<Props> = ({ workspace }) => {
  const isProject = workspace.kind === 'project';
  const { data, isLoading } = useQuery({
    queryKey: ['workspace-files', workspace.kind, workspace.id],
    queryFn: () => listWorkspaceProjectImages(workspace.projectId),
    enabled: isProject,
  });

  if (!isProject) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-70" />
          <Bi
            ar="إدارة ملفات المواقع ستتوفر في المرحلة التالية"
            en="Site file management will be available in the next phase"
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <Bi ar="جاري التحميل…" en="Loading…" />
        </CardContent>
      </Card>
    );
  }

  const images = data ?? [];
  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-70" />
          <Bi ar="لا توجد ملفات بعد" en="No files yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-muted">
              {img.image_url ? (
                <img
                  src={img.image_url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkspaceFilesTab;