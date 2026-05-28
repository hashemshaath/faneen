/**
 * APP-SHELL-REARCHITECTURE-1 — Sidebar section wrapper.
 *
 * Presentational grouping with an optional label. Auto-hides when empty.
 */
import React from 'react';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar';

export interface SidebarSectionProps {
  label?: string;
  hidden?: boolean;
  children: React.ReactNode;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({ label, hidden, children }) => {
  if (hidden) return null;
  const childCount = React.Children.toArray(children).filter(Boolean).length;
  if (childCount === 0) return null;
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default SidebarSection;