import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useWorkspacePreferences', () => ({
  useWorkspacePreferences: () => ({
    compact_mode: false,
    reduced_motion: false,
    preferred_entity_view: 'list',
    collapsed_sections: {},
    effective_reduced_motion: false,
    setCompactMode: vi.fn(),
    setReducedMotion: vi.fn(),
    setPreferredEntityView: vi.fn(),
    setSectionCollapsed: vi.fn(),
    toggleSectionCollapsed: vi.fn(),
    isSectionCollapsed: () => false,
  }),
}));

import { WorkspacePageSkeleton } from '@/components/workspace/shell/WorkspacePageSkeleton';
import { WorkspaceSectionSkeleton } from '@/components/workspace/shell/WorkspaceSectionSkeleton';

describe('APP-SHELL-STAB-1 — skeletons', () => {
  it('page skeleton renders requested rows with aria-busy', () => {
    render(<WorkspacePageSkeleton rows={5} />);
    const root = screen.getByTestId('workspace-page-skeleton');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.getAttribute('role')).toBe('status');
  });

  it('section skeleton renders header + lines', () => {
    render(<WorkspaceSectionSkeleton lines={2} />);
    const root = screen.getByTestId('workspace-section-skeleton');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('aria-busy')).toBe('true');
  });
});