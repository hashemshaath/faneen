import { describe, it, expect } from 'vitest';
import {
  computeReadiness,
  computePublicVisibility,
  type ReadinessBusiness,
} from '@/components/admin/PublishReadinessPanel';

const base: ReadinessBusiness = {
  name_ar: 'شركة',
  name_en: 'Company',
  username: 'acme',
  username_status: 'approved',
  logo_url: 'https://x/logo.png',
  sectors: ['aluminum'],
  sub_services: ['profile'],
  email: 'a@b.com',
  phone: '+9665',
  approval_status: 'published',
  is_active: true,
  is_demo: false,
};

describe('PUBLIC-DIRECTORY-PUBLISHING-READINESS-1: readiness checklist', () => {
  it('passes all checks for a fully-prepared published business', () => {
    const items = computeReadiness(base);
    expect(items.every((i) => i.ok)).toBe(true);
  });

  it('flags missing required fields as blockers', () => {
    const items = computeReadiness({ ...base, username: null, sectors: null, email: null, phone: null });
    const blockers = items.filter((i) => i.required && !i.ok).map((i) => i.key);
    expect(blockers).toEqual(expect.arrayContaining(['username', 'sectors', 'contact']));
  });

  it('treats unapproved username as not ready', () => {
    const items = computeReadiness({ ...base, username_status: 'pending' });
    expect(items.find((i) => i.key === 'username')?.ok).toBe(false);
  });

  it('marks logo + sub-services as optional warnings, not blockers', () => {
    const items = computeReadiness({ ...base, logo_url: null, sub_services: null });
    const blockers = items.filter((i) => i.required && !i.ok);
    expect(blockers).toHaveLength(0);
    expect(items.find((i) => i.key === 'logo')?.required).toBe(false);
    expect(items.find((i) => i.key === 'services')?.required).toBe(false);
  });

  it('flags inactive or demo as required-blocker', () => {
    const inactive = computeReadiness({ ...base, is_active: false });
    expect(inactive.find((i) => i.key === 'is_active')?.ok).toBe(false);
    const demo = computeReadiness({ ...base, is_demo: true });
    expect(demo.find((i) => i.key === 'not_demo')?.ok).toBe(false);
  });
});

describe('PUBLIC-DIRECTORY-PUBLISHING-READINESS-1: public visibility preview', () => {
  it('published + active + non-demo → visible', () => {
    const v = computePublicVisibility(base);
    expect(v.visible).toBe(true);
    expect(v.status).toBe('published');
    expect(v.url).toBe('/acme');
  });

  it('draft → hidden with draft status', () => {
    const v = computePublicVisibility({ ...base, approval_status: 'draft' });
    expect(v.visible).toBe(false);
    expect(v.status).toBe('draft');
  });

  it('submitted/under_review → pending', () => {
    expect(computePublicVisibility({ ...base, approval_status: 'submitted' }).status).toBe('pending');
    expect(computePublicVisibility({ ...base, approval_status: 'under_review' }).status).toBe('pending');
  });

  it('inactive overrides published → hidden', () => {
    const v = computePublicVisibility({ ...base, is_active: false });
    expect(v.visible).toBe(false);
    expect(v.status).toBe('inactive');
  });

  it('demo overrides everything → hidden as demo-hidden', () => {
    const v = computePublicVisibility({ ...base, is_demo: true });
    expect(v.visible).toBe(false);
    expect(v.status).toBe('demo-hidden');
  });

  it('mirrors businesses_public view filter (is_active && published && !is_demo)', () => {
    const cases: Array<[Partial<ReadinessBusiness>, boolean]> = [
      [{}, true],
      [{ is_active: false }, false],
      [{ is_demo: true }, false],
      [{ approval_status: 'approved' }, false],
      [{ approval_status: 'draft' }, false],
      [{ approval_status: 'submitted' }, false],
    ];
    for (const [override, expected] of cases) {
      expect(computePublicVisibility({ ...base, ...override }).visible).toBe(expected);
    }
  });
});