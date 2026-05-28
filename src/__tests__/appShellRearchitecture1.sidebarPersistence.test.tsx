import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollapsibleSidebarGroup } from '@/components/dashboard/sidebar/SidebarGroup';

const wrap = (children: React.ReactNode) => (
  <SidebarProvider>{children}</SidebarProvider>
);

describe('APP-SHELL-1 — CollapsibleSidebarGroup persistence', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('restores collapse state from localStorage', () => {
    window.localStorage.setItem('qitaat_shell_sidebar_group_ops', '0');
    render(wrap(
      <CollapsibleSidebarGroup groupKey="ops" label="Operations">
        <div data-testid="child">child</div>
      </CollapsibleSidebarGroup>,
    ));
    // Closed: child is not in DOM
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('persists collapse state on toggle', () => {
    render(wrap(
      <CollapsibleSidebarGroup groupKey="ops2" label="Operations">
        <div data-testid="child">child</div>
      </CollapsibleSidebarGroup>,
    ));
    expect(screen.getByTestId('child')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Operations/i }));
    expect(screen.queryByTestId('child')).toBeNull();
    expect(window.localStorage.getItem('qitaat_shell_sidebar_group_ops2')).toBe('0');
  });

  it('hides entirely when no children', () => {
    const { container } = render(wrap(
      <CollapsibleSidebarGroup groupKey="empty" label="Empty">{null}</CollapsibleSidebarGroup>,
    ));
    expect(container.querySelector('[data-group-key="empty"]')).toBeNull();
  });
});