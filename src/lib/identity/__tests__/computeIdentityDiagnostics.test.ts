import { describe, it, expect } from 'vitest';
import { computeIdentityDiagnostics } from '../computeIdentityDiagnostics';

const emptyInputs = {
  profiles: [],
  businesses: [],
  roles: [],
  staff: [],
  integrity: [],
  duplicates: [],
};

describe('computeIdentityDiagnostics — pure aggregator', () => {
  it('returns isHealthy=true with empty inputs', () => {
    const r = computeIdentityDiagnostics(emptyInputs);
    expect(r.isHealthy).toBe(true);
    expect(r.totals.critical).toBe(0);
    expect(r.totals.warning).toBe(0);
    expect(r.totals.info).toBe(0);
    // every group present, all healthy
    expect(r.groups.every((g) => g.severity === 'healthy')).toBe(true);
  });

  it('flags identity_mismatches as critical', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      integrity: [{ user_id: 'u1', masked_email: 'a••@b••.com', mismatch_type: 'email_mismatch', synthetic_or_test: false }],
    });
    const g = r.groups.find((x) => x.id === 'identity_mismatches')!;
    expect(g.severity).toBe('critical');
    expect(g.count).toBe(1);
    expect(g.records[0].syncTargetUserId).toBe('u1');
    expect(r.isHealthy).toBe(false);
  });

  it('flags super_admin_ownership_violations as critical', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      roles: [{ user_id: 'admin1', role: 'super_admin' }],
      businesses: [{ id: 'b1', user_id: 'admin1', ref_id: 'BIZ-1', name_ar: 'منشأة', name_en: 'Biz' }],
    });
    const g = r.groups.find((x) => x.id === 'super_admin_ownership_violations')!;
    expect(g.severity).toBe('critical');
    expect(g.count).toBe(1);
    expect(g.records[0].href).toBe('/admin/businesses?focus=b1');
  });

  it('flags missing profile emails as warning', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      integrity: [{ user_id: 'u2', masked_email: '—', mismatch_type: 'profile_missing_email', synthetic_or_test: false }],
    });
    const g = r.groups.find((x) => x.id === 'missing_profile_emails')!;
    expect(g.severity).toBe('warning');
    expect(g.records[0].syncTargetUserId).toBe('u2');
  });

  it('detects orphan business_staff (active rows with no parent business)', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      staff: [{ id: 's1', business_id: 'missing', user_id: 'u3', role: 'manager', is_active: true, is_primary_manager: false }],
    });
    const g = r.groups.find((x) => x.id === 'orphan_business_staff')!;
    expect(g.severity).toBe('warning');
    expect(g.count).toBe(1);
  });

  it('detects businesses without active owner staff and without primary manager', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      businesses: [{ id: 'b1', user_id: 'u1', ref_id: 'BIZ-1', name_ar: 'م', name_en: 'B' }],
      staff: [],
    });
    expect(r.groups.find((x) => x.id === 'businesses_without_owner_staff')!.count).toBe(1);
    expect(r.groups.find((x) => x.id === 'businesses_without_primary_manager')!.count).toBe(1);
  });

  it('detects owner who is not primary manager as a warning (not critical)', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      businesses: [{ id: 'b1', user_id: 'u1', ref_id: 'BIZ-1', name_ar: 'م', name_en: 'B' }],
      staff: [{ id: 's1', business_id: 'b1', user_id: 'u1', role: 'owner', is_active: true, is_primary_manager: false }],
    });
    const g = r.groups.find((x) => x.id === 'owner_staff_invariant_warnings')!;
    expect(g.severity).toBe('warning');
    expect(g.count).toBe(1);
  });

  it('treats synthetic emails as info and never renders the synthetic value', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      profiles: [{ user_id: 'u9', ref_id: 'USR-9', email: null, full_name: 'Phone Login' }],
      integrity: [{ user_id: 'u9', masked_email: '966500000000@phone.qitaat.local', mismatch_type: 'ok', synthetic_or_test: true }],
    });
    const g = r.groups.find((x) => x.id === 'synthetic_test_emails')!;
    expect(g.severity).toBe('info');
    expect(g.records[0].label).toBe('USR-9');
    expect(g.records.every((rec) => !/@phone\.qitaat\.local/i.test(rec.label))).toBe(true);
  });

  it('duplicate identity candidates are critical and only the "later" action is exposed', () => {
    const r = computeIdentityDiagnostics({
      ...emptyInputs,
      duplicates: [{ kind: 'email', value: 'x@y.com', occurrences: 2, user_ids: ['u1', 'u2'] }],
    });
    const g = r.groups.find((x) => x.id === 'duplicate_identity_candidates')!;
    expect(g.severity).toBe('critical');
    expect(g.actions).toHaveLength(1);
    expect(g.actions[0].id).toBe('resolve_duplicate');
    expect(g.actions[0].futureOnly).toBe(true);
  });

  it('includes pending_invitations group when provided', () => {
    const r = computeIdentityDiagnostics({ ...emptyInputs, pendingInvitations: 3 });
    const g = r.groups.find((x) => x.id === 'pending_invitations')!;
    expect(g.severity).toBe('info');
    expect(g.count).toBe(3);
  });

  it('omits pending_invitations group when not provided', () => {
    const r = computeIdentityDiagnostics(emptyInputs);
    expect(r.groups.find((x) => x.id === 'pending_invitations')).toBeUndefined();
  });
});
