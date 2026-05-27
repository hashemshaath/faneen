/**
 * BUSINESS-OPERATIONS-1B — Lifecycle adapter + guard tests for
 * staff invitation accept/revoke.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  LIFECYCLE_VALIDATE_STAFF_INVITES,
  mapInvitationStatusToLifecycle,
  mapActionToLifecycleTarget,
  checkInvitationTransition,
  INVITATION_LIFECYCLE_REJECTED_AR,
  INVITATION_LIFECYCLE_REJECTED_EN,
} from '@/modules/identity/services/invitations/lifecycle';

describe('1B adapter — mapInvitationStatusToLifecycle', () => {
  it('maps pending/invited to pending_acceptance', () => {
    expect(mapInvitationStatusToLifecycle('pending')).toBe('pending_acceptance');
    expect(mapInvitationStatusToLifecycle('invited')).toBe('pending_acceptance');
  });
  it('maps accepted to active', () => {
    expect(mapInvitationStatusToLifecycle('accepted')).toBe('active');
  });
  it('maps declined/revoked to revoked (terminal)', () => {
    expect(mapInvitationStatusToLifecycle('declined')).toBe('revoked');
    expect(mapInvitationStatusToLifecycle('revoked')).toBe('revoked');
  });
  it('maps expired to expired (terminal)', () => {
    expect(mapInvitationStatusToLifecycle('expired')).toBe('expired');
  });
  it('maps unknown/null to null', () => {
    expect(mapInvitationStatusToLifecycle('weird')).toBeNull();
    expect(mapInvitationStatusToLifecycle(null)).toBeNull();
    expect(mapInvitationStatusToLifecycle(undefined)).toBeNull();
  });
});

describe('1B adapter — mapActionToLifecycleTarget', () => {
  it('accept→active, decline/revoke→revoked, expire→expired', () => {
    expect(mapActionToLifecycleTarget('accept')).toBe('active');
    expect(mapActionToLifecycleTarget('decline')).toBe('revoked');
    expect(mapActionToLifecycleTarget('revoke')).toBe('revoked');
    expect(mapActionToLifecycleTarget('expire')).toBe('expired');
  });
});

describe('1B checkInvitationTransition — allowed', () => {
  it('pending can accept / decline / revoke', () => {
    expect(checkInvitationTransition('pending', 'accept').allowed).toBe(true);
    expect(checkInvitationTransition('pending', 'decline').allowed).toBe(true);
    expect(checkInvitationTransition('pending', 'revoke').allowed).toBe(true);
  });
  it('invited can accept / revoke', () => {
    expect(checkInvitationTransition('invited', 'accept').allowed).toBe(true);
    expect(checkInvitationTransition('invited', 'revoke').allowed).toBe(true);
  });
});

describe('1B checkInvitationTransition — rejected', () => {
  it('accepted cannot accept again', () => {
    const r = checkInvitationTransition('accepted', 'accept');
    expect(r.allowed).toBe(false);
    expect(r.reasonAr).toBe(INVITATION_LIFECYCLE_REJECTED_AR);
    expect(r.reasonEn).toBe(INVITATION_LIFECYCLE_REJECTED_EN);
  });
  it('declined / revoked / expired cannot accept', () => {
    expect(checkInvitationTransition('declined', 'accept').allowed).toBe(false);
    expect(checkInvitationTransition('revoked', 'accept').allowed).toBe(false);
    expect(checkInvitationTransition('expired', 'accept').allowed).toBe(false);
  });
  it('unknown status rejects', () => {
    const r = checkInvitationTransition('mystery', 'accept');
    expect(r.allowed).toBe(false);
    expect(r.reasonEn).toBe(INVITATION_LIFECYCLE_REJECTED_EN);
  });
  it('terminal revoked cannot be revoked again', () => {
    expect(checkInvitationTransition('revoked', 'revoke').allowed).toBe(false);
  });
});

describe('1B feature flag', () => {
  it('LIFECYCLE_VALIDATE_STAFF_INVITES is exported and true', () => {
    expect(typeof LIFECYCLE_VALIDATE_STAFF_INVITES).toBe('boolean');
    expect(LIFECYCLE_VALIDATE_STAFF_INVITES).toBe(true);
  });
});

describe('1B source wiring — accept + revoke call checkInvitationTransition', () => {
  const root = path.resolve(__dirname, '..', '..');
  const read = (rel: string) =>
    fs.readFileSync(path.join(root, rel), 'utf8');

  it('StaffInviteAccept handleAccept guards via checkInvitationTransition', () => {
    const src = read('src/pages/StaffInviteAccept.tsx');
    expect(src).toContain('checkInvitationTransition');
    expect(src).toMatch(/checkInvitationTransition\(\s*preview\.status\s*,\s*'accept'\s*\)/);
    // Existing RPC call preserved
    expect(src).toContain("acceptStaffInvitation({ _token: token })");
  });

  it('InvitationsPanel revoke guards via checkInvitationTransition', () => {
    const src = read('src/components/dashboard/business-edit/InvitationsPanel.tsx');
    expect(src).toContain('checkInvitationTransition');
    expect(src).toMatch(/checkInvitationTransition\(\s*current\?\.status\s*,\s*'revoke'\s*\)/);
    // Existing update preserved
    expect(src).toContain(".update({ status: 'revoked' })");
  });

  it('bilingual error strings exist', () => {
    const src = read('src/modules/identity/services/invitations/lifecycle.ts');
    expect(src).toContain('لا يمكن تنفيذ هذا الانتقال للحالة الحالية.');
    expect(src).toContain('This action is not allowed for the current status.');
  });
});

describe('1B safety — no payments/contracts/memberships/auth files touched', () => {
  it('lifecycle adapter imports only shared/lifecycle', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'modules/identity/services/invitations/lifecycle.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/contracts|payments|memberships|auth\//);
    expect(src).toContain("from '@/modules/shared/lifecycle'");
  });
});