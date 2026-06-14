import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export interface PrivateSectorsListSectionProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  loadingLabel: string;
  emptyLabel: string;
  children?: React.ReactNode;
}

export const PrivateSectorsListSection: React.FC<PrivateSectorsListSectionProps> = ({
  isLoading, isEmpty, loadingLabel, emptyLabel, children,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {loadingLabel}
        </CardContent>
      </Card>
    );
  }
  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }
  return <div className="grid gap-3">{children}</div>;
};

export default PrivateSectorsListSection;