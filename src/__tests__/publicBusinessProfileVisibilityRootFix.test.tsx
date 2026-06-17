import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildPublicVisibilityState,
  createAdminPublishPayload,
  generateBusinessUsernameCandidate,
  PUBLIC_BUSINESS_PROFILE_ROUTE_SOURCE,
} from '@/components/admin/businesses/BusinessPublicVisibilityCard';
import { getBusinessProfileHref } from '@/lib/business/profileHref';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const baseBusiness = {
  id: 'biz-1',
  username: 'alefnoon',
  name_ar: 'شركة ألف نون',
  name_en: 'Alef Noon',
  is_active: true,
  is_demo: false,
  approval_status: 'published',
};

describe('Public business profile visibility root fix', () => {
  it('1. draft businesses are not publicly visible', () => {
    const state = buildPublicVisibilityState({ ...baseBusiness, approval_status: 'draft' }, null, 0);
    expect(state.isPubliclyVisible).toBe(false);
    expect(state.blockingReasonAr).toContain('draft');
  });

  it('2. published + active + not demo + username appears publicly', () => {
    const state = buildPublicVisibilityState(baseBusiness, { id: 'biz-1', username: 'alefnoon' }, 0);
    expect(state.isPubliclyVisible).toBe(true);
    expect(state.publicPath).toBe('/alefnoon');
  });

  it('3. inactive businesses are not public', () => {
    const state = buildPublicVisibilityState({ ...baseBusiness, is_active: false }, null, 0);
    expect(state.isPubliclyVisible).toBe(false);
    expect(state.checks.find((check) => check.key === 'active')?.passed).toBe(false);
  });

  it('4. demo businesses are not public', () => {
    const state = buildPublicVisibilityState({ ...baseBusiness, is_demo: true }, null, 0);
    expect(state.isPubliclyVisible).toBe(false);
    expect(state.checks.find((check) => check.key === 'not-demo')?.passed).toBe(false);
  });

  it('5. missing username does not create a valid public link', () => {
    expect(getBusinessProfileHref({ username: null })).toBeNull();
    const state = buildPublicVisibilityState({ ...baseBusiness, username: null }, null, 0);
    expect(state.publicPath).toBeNull();
  });

  it('6. diagnostic card exposes the non-visibility reason', () => {
    const src = read('src/components/admin/businesses/BusinessPublicVisibilityCard.tsx');
    expect(src).toContain('حالة الظهور العام');
    expect(src).toContain('blockingReasonAr');
    expect(src).toContain('لن تظهر هذه الجهة للعامة');
  });

  it('7. publish payload sets only public visibility requirements', () => {
    expect(createAdminPublishPayload('alefnoon')).toMatchObject({
      username: 'alefnoon',
      approval_status: 'published',
      is_active: true,
      is_demo: false,
      username_status: 'approved',
    });
  });

  it('8. public route source is unified on username', () => {
    expect(PUBLIC_BUSINESS_PROFILE_ROUTE_SOURCE).toBe('username');
    expect(read('src/modules/businesses/services/getPublicBusinessByUsername.ts')).toContain(".eq('username', username)");
  });

  it('9. admin links use the same profile helper, never @username', () => {
    expect(read('src/components/admin/businesses/BusinessDetailsDrawer.tsx')).toContain('getBusinessProfileHref');
    expect(read('src/components/admin/businesses/BusinessRowActions.tsx')).toContain('getBusinessProfileHref');
    expect(read('src/components/admin/businesses/BusinessDetailsDrawer.tsx')).not.toContain('/@');
    expect(read('src/components/admin/businesses/BusinessRowActions.tsx')).not.toContain('/@');
  });

  it('10. /alefnoon resolves through businesses_public.username', () => {
    const resolver = read('src/pages/UsernameResolver.tsx');
    const service = read('src/modules/businesses/services/getBusinessIdByUsername.ts');
    expect(resolver).toContain('getBusinessIdByUsername');
    expect(service).toContain("from('businesses_public')");
    expect(service).toContain(".eq('username', username)");
  });

  it('11. public profile select does not expose sensitive owner/contact fields', () => {
    const data = read('src/components/business-profile/business-profile.data.ts');
    expect(data).toContain('businesses_public');
    expect(data).not.toMatch(/'id, username,[\s\S]*user_id/);
    expect(data).not.toMatch(/PUBLIC_BUSINESS_SELECT[\s\S]*contact_person/);
  });

  it('12. no migration was introduced for this fix', () => {
    expect(read('src/components/admin/businesses/BusinessPublicVisibilityCard.tsx')).not.toContain('CREATE TABLE');
  });

  it('13. changed visibility code has no hardcoded hex colors', () => {
    expect(read('src/components/admin/businesses/BusinessPublicVisibilityCard.tsx')).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });

  it('14. changed visibility files keep strict TypeScript guardrails', () => {
    const sources = [
      'src/components/admin/businesses/BusinessPublicVisibilityCard.tsx',
      'src/components/admin/businesses/BusinessDetailsDrawer.tsx',
      'src/components/admin/businesses/BusinessRowActions.tsx',
      'src/pages/admin/businesses/BusinessCardView.tsx',
      'src/modules/businesses/services/updateBusinessById.ts',
    ].map(read).join('\n');
    expect(sources).not.toMatch(/:\s*any\b|as any\b|@ts-ignore|@ts-expect-error|eslint-disable/);
  });

  it('15. can generate a username candidate from English entity name', () => {
    expect(generateBusinessUsernameCandidate({ id: 'biz-2', name_en: 'Modern Alef Noon Factory' })).toBe('modern_alef_noon_factory');
  });
});