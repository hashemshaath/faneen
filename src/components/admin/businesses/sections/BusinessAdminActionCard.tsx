import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

/**
 * Phase 5E presentational primitive.
 * Renders a single muted card row used by the admin edit-panel Controls tab.
 * No state, no mutations, no Supabase imports — pure layout.
 */
export function BusinessAdminActionCard({ title, description, action, children }: Props) {
  if (action !== undefined) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
        <div>
          <p className="text-sm font-medium">{title}</p>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    );
  }
  return (
    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/30">
      <p className="text-sm font-medium mb-2">{title}</p>
      {children}
      {description && <p className="text-[10px] text-muted-foreground mt-2">{description}</p>}
    </div>
  );
}

export default BusinessAdminActionCard;