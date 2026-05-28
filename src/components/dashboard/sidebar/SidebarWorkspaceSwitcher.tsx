/**
 * APP-SHELL-REARCHITECTURE-1 — Sidebar workspace switcher.
 *
 * Re-exports the existing ActiveBusinessSwitcher so the new sidebar
 * primitive surface is complete. No new switching behavior here.
 */
import React from 'react';
import { ActiveBusinessSwitcher } from '@/components/dashboard/ActiveBusinessSwitcher';

export const SidebarWorkspaceSwitcher: React.FC = () => {
  return (
    <div className="px-2 py-1" data-testid="sidebar-workspace-switcher">
      <ActiveBusinessSwitcher />
    </div>
  );
};

export default SidebarWorkspaceSwitcher;