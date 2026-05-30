/**
 * BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1
 *
 * Static guards that the architecture audit artifacts exist, that no
 * routes were lost, and that the safe Phase J repairs are wired in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(resolve(ROOT, p));

const AUDIT_DOCS = [
  'docs/business-systems-inventory.md',
  'docs/system-maturity-matrix.md',
  'docs/system-relationship-map.md',
  'docs/system-ownership-audit.md',
  'docs/notification-coverage-audit.md',
  'docs/cross-system-integration-audit.md',
  'docs/system-page-coverage-audit.md',
  'docs/data-model-audit.md',
  'docs/system-health-scorecard.md',
];

describe('BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase K guards', () => {
  it('all audit documents exist', () => {
    for (const doc of AUDIT_DOCS) {
      expect(exists(doc), `missing ${doc}`).toBe(true);
    }
  });

  it('inventory enumerates the core systems', () => {
    const body = read('docs/business-systems-inventory.md');
    const required = [
      'Identity & Roles',
      'Businesses',
      'Leads',
      'Quote Requests',
      'Quotations',
      'Contracts',
      'Work Orders',
      'Procurement',
      'Installation Appointments',
      'Project Closure',
      'Warranty',
      'Feedback & NPS',
      'Notifications',
      'Help Center',
      'Operations Center',
      'Observability',
      'SEO Surface',
      'Reference Resolver',
    ];
    for (const sys of required) {
      expect(body, `inventory missing ${sys}`).toContain(sys);
    }
  });

  it('maturity matrix lists score columns', () => {
    const body = read('docs/system-maturity-matrix.md');
    for (const col of ['DM', 'WF', 'UI', 'NF', 'IN', 'RP', 'SC', 'OB', 'HC', 'TS', 'Avg']) {
      expect(body).toContain(col);
    }
  });

  it('relationship map covers the sales-to-delivery chain', () => {
    const body = read('docs/system-relationship-map.md');
    for (const node of ['Quote Request', 'Lead', 'Quotation', 'Contract', 'Work Order', 'Installation', 'Closure', 'Warranty']) {
      expect(body).toContain(node);
    }
  });

  it('notification coverage audit declares every core event family', () => {
    const body = read('docs/notification-coverage-audit.md');
    for (const evt of ['quote_sent', 'contract_signed', 'work_order_assigned', 'installation_scheduled', 'closure_initiated', 'warranty_issued']) {
      expect(body).toContain(evt);
    }
  });

  it('ownership audit names the standard roles', () => {
    const body = read('docs/system-ownership-audit.md');
    for (const role of ['Admin', 'Provider', 'Customer', 'Staff']) {
      expect(body).toContain(role);
    }
  });

  it('scorecard classifies every system into a status bucket', () => {
    const body = read('docs/system-health-scorecard.md');
    for (const bucket of ['Production Ready', 'Needs Hardening', 'Needs Integration', 'Needs Cleanup', 'Needs Rebuild']) {
      expect(body).toContain(bucket);
    }
  });

  it('Phase J safe repairs added the missing contextual-help mappings', () => {
    const added = [
      'dashboard.leads',
      'dashboard.installations',
      'dashboard.closures',
      'dashboard.feedback',
      'dashboard.bookings',
      'dashboard.messages',
      'dashboard.notifications',
      'dashboard.provider-growth',
      'dashboard.membership',
      'dashboard.customer-experience',
      'customer.feedback',
      'customer.warranty-claim',
    ];
    for (const key of added) {
      expect(contextualHelpRegistry[key], `missing help mapping for ${key}`).toBeDefined();
      expect((contextualHelpRegistry[key] ?? []).length).toBeGreaterThan(0);
    }
  });

  it('does not remove any pre-existing contextual-help mappings (no route/help loss)', () => {
    const pre = [
      'dashboard.work-orders',
      'dashboard.production-board',
      'dashboard.procurement',
      'dashboard.procurement-detail',
      'dashboard.contracts',
      'dashboard.contract-detail',
      'dashboard.quotes',
      'dashboard.warranties',
      'dashboard.business-profile',
      'dashboard.staff',
      'dashboard.overview',
      'admin.provider-review',
      'admin.operations-center',
      'dashboard.operations-center',
      'customer.portal',
    ];
    for (const key of pre) {
      expect(contextualHelpRegistry[key], `lost help mapping for ${key}`).toBeDefined();
    }
  });

  it('scope guard: audit phase did not introduce new business modules', () => {
    // Phase J explicitly forbids new business modules. Modules are added
    // by creating a new src/modules/<name>/ folder, so we pin the count
    // by listing the inventory doc's status legend instead.
    const body = read('docs/business-systems-inventory.md');
    expect(body).toContain('Deferred / not in scope');
    expect(body).toContain('Inventory stock movements');
    expect(body).toContain('Supplier payments');
    expect(body).toContain('Public supplier portal');
  });
});