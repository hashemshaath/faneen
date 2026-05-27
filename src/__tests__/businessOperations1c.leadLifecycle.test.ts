/**
 * BUSINESS-OPERATIONS-1C — Lifecycle adapter + guard tests for
 * provider lead archive (closed) / lost (rejected) actions.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  LIFECYCLE_VALIDATE_LEADS,
  mapLeadStatusToLifecycle,
  mapLeadActionToLifecycleTarget,
  leadActionFromTargetStatus,
  checkLeadTransition,
  LEAD_LIFECYCLE_REJECTED_AR,
  LEAD_LIFECYCLE_REJECTED_EN,
} from '@/modules/leads/services/lifecycle';

describe('1C adapter — mapLeadStatusToLifecycle', () => {
  it('maps new/viewed/needs_info to viewed', () => {
    expect(mapLeadStatusToLifecycle('new')).toBe('viewed');
    expect(mapLeadStatusToLifecycle('viewed')).toBe('viewed');
    expect(mapLeadStatusToLifecycle('needs_info')).toBe('viewed');
  });
  it('maps accepted/contacted/qualified to contacted', () => {
    expect(mapLeadStatusToLifecycle('accepted')).toBe('contacted');
    expect(mapLeadStatusToLifecycle('contacted')).toBe('contacted');
    expect(mapLeadStatusToLifecycle('qualified')).toBe('contacted');
  });
  it('maps quoted to quoted', () => {
    expect(mapLeadStatusToLifecycle('quoted')).toBe('quoted');
  });
  it('maps rejected to lost (terminal-ish), closed/cancelled to archived', () => {
    expect(mapLeadStatusToLifecycle('rejected')).toBe('lost');
    expect(mapLeadStatusToLifecycle('closed')).toBe('archived');
    expect(mapLeadStatusToLifecycle('cancelled')).toBe('archived');
  });
  it('maps spam to spam', () => {
    expect(mapLeadStatusToLifecycle('spam')).toBe('spam');
  });
  it('maps unknown/null/undefined to null', () => {
    expect(mapLeadStatusToLifecycle('mystery')).toBeNull();
    expect(mapLeadStatusToLifecycle(null)).toBeNull();
    expect(mapLeadStatusToLifecycle(undefined)).toBeNull();
  });
});

describe('1C adapter — mapLeadActionToLifecycleTarget', () => {
  it('lost→lost, archive→archived', () => {
    expect(mapLeadActionToLifecycleTarget('lost')).toBe('lost');
    expect(mapLeadActionToLifecycleTarget('archive')).toBe('archived');
  });
});

describe('1C adapter — leadActionFromTargetStatus', () => {
  it('returns lost/archive only for rejected/closed', () => {
    expect(leadActionFromTargetStatus('rejected')).toBe('lost');
    expect(leadActionFromTargetStatus('closed')).toBe('archive');
  });
  it('returns null for non-gated statuses', () => {
    for (const s of ['new', 'viewed', 'needs_info', 'accepted', 'quoted', 'contacted', 'cancelled']) {
      expect(leadActionFromTargetStatus(s)).toBeNull();
    }
  });
});

describe('1C checkLeadTransition — allowed', () => {
  it('viewed/needs_info/new can be lost or archived', () => {
    for (const s of ['new', 'viewed', 'needs_info']) {
      expect(checkLeadTransition(s, 'lost').allowed).toBe(true);
      expect(checkLeadTransition(s, 'archive').allowed).toBe(true);
    }
  });
  it('contacted/accepted/quoted can be lost or archived', () => {
    for (const s of ['contacted', 'accepted', 'quoted']) {
      expect(checkLeadTransition(s, 'lost').allowed).toBe(true);
      expect(checkLeadTransition(s, 'archive').allowed).toBe(true);
    }
  });
  it('lost can be archived', () => {
    expect(checkLeadTransition('rejected', 'archive').allowed).toBe(true);
  });
});

describe('1C checkLeadTransition — rejected', () => {
  it('archived/closed cannot be lost', () => {
    const r = checkLeadTransition('closed', 'lost');
    expect(r.allowed).toBe(false);
    expect(r.reasonAr).toBe(LEAD_LIFECYCLE_REJECTED_AR);
    expect(r.reasonEn).toBe(LEAD_LIFECYCLE_REJECTED_EN);
  });
  it('already lost cannot be lost again (self-transition)', () => {
    expect(checkLeadTransition('rejected', 'lost').allowed).toBe(false);
  });
  it('already archived cannot be archived again', () => {
    expect(checkLeadTransition('closed', 'archive').allowed).toBe(false);
    expect(checkLeadTransition('cancelled', 'archive').allowed).toBe(false);
  });
  it('spam rejects further transitions', () => {
    expect(checkLeadTransition('spam', 'lost').allowed).toBe(false);
    expect(checkLeadTransition('spam', 'archive').allowed).toBe(false);
  });
  it('unknown status rejects with bilingual reason', () => {
    const r = checkLeadTransition('mystery', 'lost');
    expect(r.allowed).toBe(false);
    expect(r.reasonEn).toBe(LEAD_LIFECYCLE_REJECTED_EN);
    expect(r.reasonAr).toBe(LEAD_LIFECYCLE_REJECTED_AR);
  });
});

describe('1C feature flag', () => {
  it('LIFECYCLE_VALIDATE_LEADS is exported and true', () => {
    expect(typeof LIFECYCLE_VALIDATE_LEADS).toBe('boolean');
    expect(LIFECYCLE_VALIDATE_LEADS).toBe(true);
  });
});

describe('1C source wiring — DashboardLeads + AdminLeadRequests guard via checkLeadTransition', () => {
  const root = path.resolve(__dirname, '..', '..');
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

  it('DashboardLeads handleAction guards via checkLeadTransition', () => {
    const src = read('src/pages/dashboard/DashboardLeads.tsx');
    expect(src).toContain('checkLeadTransition');
    expect(src).toContain('leadActionFromTargetStatus');
    // Existing mutation entrypoint preserved
    expect(src).toContain('updateStatus.mutate({ id, next })');
    expect(src).toContain('updateLeadRequestStatus');
  });

  it('AdminLeadRequests updateStatus guards via checkLeadTransition', () => {
    const src = read('src/pages/admin/AdminLeadRequests.tsx');
    expect(src).toContain('checkLeadTransition');
    expect(src).toContain('leadActionFromTargetStatus');
    // Existing mutation entrypoint preserved
    expect(src).toContain('updateLeadRequestStatus(id, status)');
    // Select onValueChange now passes current status
    expect(src).toMatch(/updateStatus\.mutate\(\{\s*id:\s*r\.id,\s*status:\s*v as Status,\s*current:\s*r\.status\s*\}\)/);
  });

  it('bilingual error strings exist in lifecycle adapter', () => {
    const src = read('src/modules/leads/services/lifecycle.ts');
    expect(src).toContain('لا يمكن تنفيذ هذا الانتقال للحالة الحالية.');
    expect(src).toContain('This action is not allowed for the current status.');
  });

  it('updateLeadRequestStatus wrapper preserved (no signature change)', () => {
    const src = read('src/modules/leads/services/mutations.ts');
    expect(src).toContain('export async function updateLeadRequestStatus');
    expect(src).toMatch(/\.from\('lead_requests'\)\s*\n\s*\.update/);
  });
});

describe('1C safety — no contracts/payments/memberships/auth/schema touched', () => {
  it('lead lifecycle adapter imports only shared/lifecycle', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'modules/leads/services/lifecycle.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/contracts|payments|memberships|auth\//);
    expect(src).toContain("from '@/modules/shared/lifecycle'");
  });
});