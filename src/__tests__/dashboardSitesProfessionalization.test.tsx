/**
 * MY SITES PROFESSIONALIZATION PASS — source-level assertions on
 * `src/pages/dashboard/DashboardSites.tsx` to lock in the new UI surface
 * (title, KPI strip, filters, Manage CTA) and the safety rails the
 * product brief requires (no contract-creation RPC, no service_role,
 * no `any`, no hardcoded hex on this page).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(__dirname, '../pages/dashboard/DashboardSites.tsx');
const SRC = readFileSync(PAGE_PATH, 'utf8');

describe('DashboardSites — professionalization pass', () => {
  it('PageHeader title is «مواقعي»', () => {
    expect(SRC).toMatch(/title=\{pickBi\(isRTL,\s*'مواقعي'/);
  });

  it('renders the KPI strip wrapper', () => {
    expect(SRC).toContain('data-testid="sites-kpi-strip"');
  });

  it('exposes all six required KPIs', () => {
    expect(SRC).toContain('إجمالي المواقع');
    expect(SRC).toContain('مواقع شخصية');
    expect(SRC).toContain('مرتبطة بمنشأة');
    expect(SRC).toContain('لها مشاريع');
    expect(SRC).toContain('لها عقود');
    expect(SRC).toContain('تحتاج استكمال');
  });

  it('exposes search + city + ownership + completion filters', () => {
    expect(SRC).toMatch(/setSearch\(/);
    expect(SRC).toMatch(/cityFilter/);
    expect(SRC).toMatch(/ownershipFilter/);
    expect(SRC).toMatch(/completionFilter/);
  });

  it('reads from client_sites (not standalone projects)', () => {
    expect(SRC).toMatch(/\.from\(\s*'client_sites'\s*\)/);
    // projects table is only used for a lightweight per-site count, not
    // as a source of "site" cards.
    expect(SRC).not.toMatch(/\.from\(\s*'projects'\s*\)[^]*as ClientSite/);
  });

  it('shows a «إدارة الموقع» CTA on each card', () => {
    expect(SRC).toContain('إدارة الموقع');
    expect(SRC).toMatch(/navigate\(`\/dashboard\/sites\/\$\{s\.id\}`\)/);
  });

  it('keeps an empty state', () => {
    expect(SRC).toContain('SitesEmptyState');
  });

  it('does NOT call create-contract RPC from this page', () => {
    expect(SRC).not.toContain('create_contract_from_workspace_as_client');
    expect(SRC).not.toContain('ClientPicker');
  });

  it('does NOT use service_role on the frontend', () => {
    expect(SRC).not.toMatch(/service_role/i);
  });

  it('contains no hardcoded hex colors', () => {
    expect(SRC).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('contains no `any` / `as any` / suppressions in this file', () => {
    expect(SRC).not.toMatch(/:\s*any\b/);
    expect(SRC).not.toMatch(/as\s+any\b/);
    expect(SRC).not.toMatch(/@ts-ignore/);
    expect(SRC).not.toMatch(/eslint-disable(?!-next-line react-hooks\/exhaustive-deps)/);
  });
});