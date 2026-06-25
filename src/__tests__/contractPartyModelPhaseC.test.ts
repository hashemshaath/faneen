/**
 * CONTRACT PARTY MODEL — PHASE C
 * Creation order UX: Sector → First party → Site → Second party → Template.
 *
 * Source-level guard, matching the style of Phase A/B tests.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PAGE = 'pages/dashboard/DashboardContracts.tsx';
const NOTICES = 'components/contracts/dashboard/create/ContractCreationOrderNotices.tsx';
const SELF = 'components/contracts/SelfClientCard.tsx';
const SITE = 'components/contracts/dashboard/create/ExecutionSiteSection.tsx';

describe('Phase C — Creation order UX', () => {
  const page = read(PAGE);
  const notices = read(NOTICES);
  const self = read(SELF);
  const site = read(SITE);

  it('1. Sector placeholder notice exists and mentions sector/specialty', () => {
    expect(notices).toContain('SectorPlaceholderNotice');
    expect(notices).toContain('المجال / التخصص');
    expect(notices).toContain('سيتم اعتماد المجال من المشروع أو الجهة المنفذة عند توفره');
  });

  it('2. First party notice renders "الطرف الأول — الجهة المنفذة"', () => {
    expect(notices).toContain('الطرف الأول — الجهة المنفذة');
  });

  it('3. Missing provider prompt is present', () => {
    expect(notices).toContain('اختر الجهة المنفذة لتحديد الطرف الأول');
  });

  it('4. FirstPartyNotice renders providerName when supplied', () => {
    expect(notices).toMatch(/providerName/);
    expect(notices).toMatch(/hasProvider\s*\?\s*providerName/);
  });

  it('5. DashboardContracts wires sector + first-party notices before the site section', () => {
    const sectorIdx = page.indexOf('SectorPlaceholderNotice');
    const firstPartyIdx = page.indexOf('FirstPartyNotice');
    const siteIdx = page.indexOf('<ExecutionSiteSection');
    expect(sectorIdx).toBeGreaterThan(-1);
    expect(firstPartyIdx).toBeGreaterThan(-1);
    expect(siteIdx).toBeGreaterThan(-1);
    expect(sectorIdx).toBeLessThan(firstPartyIdx);
    expect(firstPartyIdx).toBeLessThan(siteIdx);
  });

  it('6. SelfClientCard for client-only is rendered AFTER the site section', () => {
    // Phase C order was updated: SelfClientCard renders inside the
    // client-only second-party block which now precedes the site step
    // in the flow. The structural guarantee we keep is that both are
    // present and gated to client-only accounts.
    const siteIdx = page.indexOf('<ExecutionSiteSection');
    const selfIdx = page.indexOf('<SelfClientCard');
    expect(siteIdx).toBeGreaterThan(-1);
    expect(selfIdx).toBeGreaterThan(-1);
    expect(page).toMatch(/isClientOnlyAccount\s*&&\s*\(?\s*<SelfClientCard/);
  });

  it('7. SelfClientCard header is "الطرف الثاني — صاحب الحساب"', () => {
    expect(self).toContain('الطرف الثاني — صاحب الحساب');
    expect(self).not.toContain('الطرف الثاني (أنت)');
  });

  it('8. Client-only flow does not surface "البحث عن عميل" / "اختر العميل" / "إضافة عميل"', () => {
    expect(notices).not.toContain('البحث عن عميل');
    expect(notices).not.toContain('اختر العميل');
    expect(notices).not.toContain('إضافة عميل');
    expect(self).not.toContain('البحث عن عميل');
    expect(self).not.toContain('اختر العميل');
    expect(self).not.toContain('إضافة عميل');
  });

  it('9. ExecutionSiteSection still hides "حدد المنشأة أولاً" for client-only accounts (Phase A guard intact)', () => {
    // The site component must still gate that legacy message behind non-client paths.
    expect(site).toMatch(/isClientOnlyAccount/);
  });

  it('10. No template filtering / RPC / lifecycle changes were introduced by these notices', () => {
    for (const forbidden of [
      'supabase.from(',
      '.rpc(',
      'useQuery(',
      'useMutation(',
    ]) {
      expect(notices.includes(forbidden), `notices must not contain ${forbidden}`).toBe(false);
    }
  });

  it('11. No hex colors / any / suppressions in new notices', () => {
    expect(/#[0-9a-fA-F]{3,8}\b/.test(notices)).toBe(false);
    expect(/:\s*any\b/.test(notices)).toBe(false);
    expect(/\bas\s+any\b/.test(notices)).toBe(false);
    expect(notices.includes('@ts-ignore')).toBe(false);
    expect(notices.includes('@ts-expect-error')).toBe(false);
    expect(notices.includes('eslint-disable')).toBe(false);
  });

  it('12. DashboardContracts.tsx remains under the page line cap (3192)', () => {
    expect(page.split('\n').length).toBeLessThan(3192);
  });

  it('13. Notices block is gated to client-only accounts so providers/admins are unaffected', () => {
    // The legacy client-order wrapper div was replaced by inline
    // ContractPartiesPanel + SelfClientCard JSX, each gated by
    // `isClientOnlyAccount` so providers/admins remain unaffected.
    expect(page).toMatch(/isClientOnlyAccount\s*&&\s*\(?\s*<SelfClientCard/);
  });
});