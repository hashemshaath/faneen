import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * PROVIDER-DASHBOARD-REDESIGN-1
 * Structural guards for the redesigned provider dashboard view.
 */
const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const VIEW = 'pages/dashboard/overview/ProviderDashboardView.tsx';
const FOOTER = 'components/dashboard/ProviderSmartActionFooter.tsx';
const SERVICES = 'components/dashboard/ProviderServicesStatusCard.tsx';

describe('PROVIDER-DASHBOARD-REDESIGN-1 — structure', () => {
  const src = read(VIEW);

  it('mounts the smart tips card', () => {
    expect(src).toContain('ProviderTipsCard');
  });

  it('mounts the services status card', () => {
    expect(src).toContain('ProviderServicesStatusCard');
  });

  it('mounts the smart action footer', () => {
    expect(src).toContain('ProviderSmartActionFooter');
  });

  it('keeps the readiness card as single source of profile completeness', () => {
    expect(src).toContain('ProviderReadinessCard');
    expect(src).not.toContain('ProviderCompletionSummary');
  });

  it('drops the gold/de-cream hero accents', () => {
    expect(src).not.toContain('--de-gold');
    expect(src).not.toContain('--de-cream');
    expect(src).not.toContain('dash-hero-gold');
  });

  it('renders the three hero CTAs', () => {
    expect(src).toMatch(/Complete profile|أكمل ملفك/);
    expect(src).toMatch(/Manage services|إدارة الخدمات/);
    expect(src).toMatch(/View public page|الصفحة العامة/);
  });

  it('guards the /membership quick action via useMembershipVisibility', () => {
    expect(src).toContain('useMembershipVisibility');
    expect(src).toContain('membershipPathOrNull');
    expect(src).not.toMatch(/to:\s*['"]\/membership['"]/);
  });

  it('only renders the revenue chart when hasRevenueData', () => {
    expect(src).toContain('hasRevenueData');
    expect(src).toMatch(/\{hasRevenueData\s*&&/);
  });
});

describe('PROVIDER-DASHBOARD-REDESIGN-1 — Smart action footer', () => {
  const src = read(FOOTER);

  it('uses deterministic local rules (no AI/fetch/supabase)', () => {
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/ai-gateway|openai|gemini/i);
  });

  it('honors useMembershipVisibility before linking to /membership', () => {
    expect(src).toContain('useMembershipVisibility');
    expect(src).toContain('membershipPathOrNull');
    expect(src).not.toMatch(/to=['"]\/membership['"]/);
  });

  it('does not make guarantee claims', () => {
    expect(src).not.toMatch(/guarantee|مضمون/i);
  });
});

describe('PROVIDER-DASHBOARD-REDESIGN-1 — Services status card', () => {
  const src = read(SERVICES);

  it('reads via catalog wrapper (no direct supabase.from on business_services)', () => {
    expect(src).toContain("from '@/modules/catalog'");
    expect(src).not.toMatch(/supabase\.from\(['"]business_services['"]\)/);
  });

  it('renders all five status buckets', () => {
    for (const k of ['active', 'pending', 'paused', 'upgrade', 'blocked']) {
      expect(src).toContain(`key: '${k}'`);
    }
  });

  it('has a useful empty state with CTA', () => {
    expect(src).toMatch(/No services|لم تضف خدمات/);
    expect(src).toContain('/dashboard/services');
  });
});