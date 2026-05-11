import { createContext, useContext } from 'react';

/**
 * Phase B — Admin contact ecosystem consolidation.
 * When a page is rendered inside the AdminContactCenter tabs, it should
 * skip its own DashboardLayout / useNoIndex wrappers (the parent provides them).
 * Default `false` keeps every old route working unchanged.
 */
export const AdminEmbeddedContext = createContext<boolean>(false);

export function useAdminEmbedded(): boolean {
  return useContext(AdminEmbeddedContext);
}