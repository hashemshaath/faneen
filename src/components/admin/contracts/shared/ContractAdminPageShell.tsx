/**
 * Presentational shell for admin contracts surfaces.
 *
 * Pure UI — no Supabase, no queries, no mutations. Wraps the canonical
 * `AdminListPageTemplate` with named slots tailored for the contracts
 * domain (statsSlot, filtersSlot, content). All data must flow from the
 * owning page; this shell never owns state.
 */
import React from 'react';
import { AdminListPageTemplate } from '@/components/admin/AdminListPageTemplate';

export interface ContractAdminPageShellProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  eyebrow?: string;
  tone?: 'primary' | 'accent' | 'success' | 'info' | 'warning' | 'destructive';
  actionsSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ContractAdminPageShell: React.FC<ContractAdminPageShellProps> = ({
  icon,
  title,
  description,
  eyebrow,
  tone = 'accent',
  actionsSlot,
  statsSlot,
  filtersSlot,
  children,
  className,
}) => {
  return (
    <AdminListPageTemplate
      tone={tone}
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      subtitle={description}
      actions={actionsSlot}
      kpiSlot={statsSlot}
      filtersSlot={filtersSlot}
      className={className}
    >
      {children}
    </AdminListPageTemplate>
  );
};

export default ContractAdminPageShell;