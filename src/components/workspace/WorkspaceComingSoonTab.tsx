/**
 * CLIENT WORKSPACE UNIFICATION — Coming-soon placeholder used for
 * Licenses / Violations / Reports tabs in P1.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bi } from '@/components/common/Bilingual';
import { Sparkles } from 'lucide-react';

interface Props {
  titleAr: string;
  titleEn: string;
  noteAr?: string;
  noteEn?: string;
}

export const WorkspaceComingSoonTab: React.FC<Props> = ({
  titleAr,
  titleEn,
  noteAr,
  noteEn,
}) => (
  <Card className="border-dashed">
    <CardContent className="py-12 flex flex-col items-center text-center gap-2 text-muted-foreground">
      <Sparkles className="w-6 h-6 opacity-70" />
      <h3 className="text-base font-semibold text-foreground">
        <Bi ar={titleAr} en={titleEn} />
      </h3>
      <p className="text-sm">
        <Bi
          ar={noteAr ?? 'قريبًا — هذا القسم قيد التطوير في مرحلة لاحقة'}
          en={noteEn ?? 'Coming soon — this section is planned for a later phase'}
        />
      </p>
    </CardContent>
  </Card>
);

export default WorkspaceComingSoonTab;