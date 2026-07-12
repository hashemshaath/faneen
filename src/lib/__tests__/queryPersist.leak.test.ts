/**
 * S1 — persistence leak guard. Ensures no dashboard/admin/user-scoped
 * query-key first-segment can ever pass shouldPersistQuery.
 */
import { describe, it, expect } from 'vitest';
import { shouldPersistQuery, PUBLIC_PERSIST_FIRST_SEGMENTS } from '../queryPersist';
import type { Query } from '@tanstack/react-query';

const q = (key: unknown[]): Query =>
  ({ queryKey: key } as unknown as Query);

const FORBIDDEN_FIRST_SEGMENTS = [
  'business-edit', 'business-recent-activity', 'business-draft-form',
  'business-completion', 'business-availability', 'business-awards',
  'business-certifications', 'business-services-light', 'business-services-sync',
  'business-staff', 'business-promotions-light',
  'admin', 'admin-businesses', 'admin-overview-stats', 'admin-identity',
  'admin-preview-email', 'admin-provider-review',
  'my-primary-business', 'notification-prefs', 'all-notifications',
  'accepted-invitations', 'client-workspace', 'client-workspaces',
  'client-detail', 'contract-analytics', 'contract-profiles',
  'blog-drafts', 'booking-client-profiles', 'brand-ops-counts',
  'branches', 'services', 'reviews', 'awards', 'certifications', 'portfolio',
  'user-roles', 'me', 'membership', 'staff', 'rfq-drafts', 'lead-requests',
];

describe('queryPersist leak guard', () => {
  it('rejects every known dashboard/admin first-segment', () => {
    for (const seg of FORBIDDEN_FIRST_SEGMENTS) {
      expect(shouldPersistQuery(q([seg, 'xyz']))).toBe(false);
    }
  });

  it('accepts allowlisted public first-segments', () => {
    for (const seg of PUBLIC_PERSIST_FIRST_SEGMENTS) {
      expect(shouldPersistQuery(q([seg, 'xyz']))).toBe(true);
    }
  });

  it('rejects allowlisted first-segment when a deny token appears in any later segment', () => {
    expect(shouldPersistQuery(q(['business', 'draft', 'x']))).toBe(false);
    expect(shouldPersistQuery(q(['business', 'admin']))).toBe(false);
    expect(shouldPersistQuery(q(['home', 'user', 'private']))).toBe(false);
  });

  it('rejects non-array or empty keys', () => {
    expect(shouldPersistQuery(q([]))).toBe(false);
    expect(shouldPersistQuery({ queryKey: 'business' } as unknown as Query)).toBe(false);
  });
});