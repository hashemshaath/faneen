import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProviderReviewDetailPanel } from '../ProviderReviewDetailPanel';
import type { ProviderRow, ApprovalStatus } from '../types';

// Mock taxonomy hooks — not relevant to the publish gating.
vi.mock('@/modules/taxonomy/search-integration', () => ({
  useBusinessTaxonomyDisplay: () => ({
    primaryLabel: null,
    secondaryLabels: [],
    serviceLabels: [],
  }),
}));
vi.mock('@/modules/taxonomy/presence', () => ({
  useBusinessTaxonomyPresence: () => ({ hasPrimary: false, serviceCount: 0 }),
}));
vi.mock('@/components/admin/CrDocumentScanner', () => ({
  CrDocumentScanner: () => null,
}));
vi.mock('@/components/admin/PublishReadinessPanel', () => ({
  PublishReadinessPanel: () => null,
}));
vi.mock('@/components/reference/ReferenceTag', () => ({
  ReferenceTag: () => null,
}));

function row(overrides: Partial<ProviderRow> = {}): ProviderRow {
  return {
    id: 'b1',
    ref_id: 'BUS-1',
    user_id: 'u1',
    name_ar: 'شركة',
    name_en: 'Co',
    username: 'co',
    username_status: 'approved',
    logo_url: null,
    description_ar: null,
    short_description_ar: null,
    email: null,
    phone: null,
    approval_status: 'approved' as ApprovalStatus,
    approval_notes: null,
    onboarding_completion: 100,
    sectors: null,
    sub_services: null,
    submitted_at: null,
    reviewed_at: null,
    published_at: null,
    created_at: new Date().toISOString(),
    national_id: null,
    unified_number: null,
    vat_number: null,
    cr_document_url: null,
    cr_document_uploaded_at: null,
    cr_owner_name: null,
    cr_legal_entity: null,
    cr_issue_date: null,
    cr_expiry_date: null,
    is_active: true,
    is_demo: false,
    ...overrides,
  };
}

function renderPanel(selected: ProviderRow | null, onApprovalChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onApprovalChange,
    ...render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProviderReviewDetailPanel
            selected={selected}
            notes=""
            setNotes={() => {}}
            language="en"
            isRTL={false}
            isSuperAdmin
            approvalPending={false}
            usernamePending={false}
            onApprovalChange={onApprovalChange}
            onUsernameChange={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('ProviderReviewDetailPanel — Publish Publicly gating', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the publish-publicly action ONLY for approved + active + non-demo providers', () => {
    renderPanel(row({ approval_status: 'approved' }));
    expect(screen.getByTestId('publish-publicly-action')).toBeInTheDocument();
    expect(screen.getByTestId('publish-publicly-btn')).toBeInTheDocument();
  });

  it('hides the action for draft / submitted / under_review / needs_changes / rejected', () => {
    for (const s of ['draft', 'submitted', 'under_review', 'needs_changes', 'rejected'] as ApprovalStatus[]) {
      const { unmount } = renderPanel(row({ approval_status: s }));
      expect(screen.queryByTestId('publish-publicly-action')).toBeNull();
      expect(screen.queryByTestId('publish-publicly-btn')).toBeNull();
      unmount();
    }
  });

  it('shows a locked confirmation hint when already published', () => {
    renderPanel(row({ approval_status: 'published' }));
    expect(screen.getByTestId('publish-publicly-locked')).toBeInTheDocument();
    expect(screen.queryByTestId('publish-publicly-btn')).toBeNull();
  });

  it('hides for inactive or demo providers even when approved', () => {
    const { unmount } = renderPanel(row({ approval_status: 'approved', is_active: false }));
    expect(screen.queryByTestId('publish-publicly-action')).toBeNull();
    unmount();
    renderPanel(row({ approval_status: 'approved', is_demo: true }));
    expect(screen.queryByTestId('publish-publicly-action')).toBeNull();
  });

  it('requires inline confirmation before triggering onApprovalChange("published")', () => {
    const onApprovalChange = vi.fn();
    renderPanel(row({ approval_status: 'approved' }), onApprovalChange);

    // First click → reveals confirm, does NOT publish yet.
    fireEvent.click(screen.getByTestId('publish-publicly-btn'));
    expect(onApprovalChange).not.toHaveBeenCalled();

    // Confirm → publishes with 'published'.
    fireEvent.click(screen.getByTestId('publish-publicly-confirm'));
    expect(onApprovalChange).toHaveBeenCalledTimes(1);
    expect(onApprovalChange).toHaveBeenCalledWith('published');
  });
});