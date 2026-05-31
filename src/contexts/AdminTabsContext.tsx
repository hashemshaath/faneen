import { createContext, useContext } from 'react';

/**
 * Embedded-page context.
 *
 * When a page is rendered inside a tabbed shell (Admin Contact Center,
 * NAVIGATION-CONSOLIDATION-1 unified pages, etc.), the parent provides
 * the DashboardLayout shell. The embedded page should skip its own
 * DashboardLayout / useNoIndex wrappers — `DashboardLayout` itself
 * honors this flag and renders children directly.
 *
 * Historical name `AdminEmbeddedContext` is retained as the canonical
 * provider so legacy Admin Contact Center call-sites keep working;
 * new code should use the generic `useEmbeddedPage` alias.
 * Default `false` keeps every old route working unchanged.
 */
export const AdminEmbeddedContext = createContext<boolean>(false);

export function useAdminEmbedded(): boolean {
  return useContext(AdminEmbeddedContext);
}

/** Generic alias — preferred for new tabbed shells. */
export const EmbeddedPageContext = AdminEmbeddedContext;
export function useEmbeddedPage(): boolean {
  return useContext(AdminEmbeddedContext);
}