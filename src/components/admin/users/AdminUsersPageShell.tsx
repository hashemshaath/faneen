import React from 'react';

export interface AdminUsersPageShellProps {
  header: React.ReactNode;
  kpiSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  tableSlot: React.ReactNode;
  drawerSlot?: React.ReactNode;
}

/**
 * Phase 6A — layout shell for /admin/users.
 *
 * Pure presentational scaffold that splits the page into the canonical
 * regions the redesign brief calls for: header, KPIs, filters, table,
 * and an inline details drawer. Keeping the structure in one place
 * lets the AdminUsers page focus on data flow while we converge on a
 * consistent admin information architecture (matching Phase 5's
 * `AdminBusinessesPageShell`).
 */
export const AdminUsersPageShell = React.memo(function AdminUsersPageShell({
  header,
  kpiSlot,
  filtersSlot,
  tableSlot,
  drawerSlot,
}: AdminUsersPageShellProps) {
  return (
    <div className="space-y-4">
      {header}
      {kpiSlot && <div data-slot="kpi">{kpiSlot}</div>}
      {filtersSlot && <div data-slot="filters">{filtersSlot}</div>}
      <div data-slot="table">{tableSlot}</div>
      {drawerSlot && <div data-slot="drawer">{drawerSlot}</div>}
    </div>
  );
});