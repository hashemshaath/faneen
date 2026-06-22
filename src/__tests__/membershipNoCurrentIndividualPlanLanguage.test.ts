/**
 * MEMBERSHIP CURRENT-SCOPE FIX — language guard.
 *
 * Asserts that the dashboard membership page does NOT use language
 * that implies an individual membership plan is active today, while
 * still allowing future-ready phrasing that leaves room for individual
 * plans later.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(
  __dirname, '..', '..',
  'src/pages/dashboard/DashboardMembership.tsx',
);
const src = fs.readFileSync(PAGE, 'utf8');

describe('Membership page — no current individual-plan language', () => {
  const FORBIDDEN: Array<[string, RegExp]> = [
    ['عضويتي',     /عضويتي/],
    ['باقتي',      /باقتي/],
    ['اشتراكي',    /اشتراكي/],
    ['ترقية حسابك',/ترقية حسابك/],
    ['استخدامك',   /استخدامك/],
    ['حدودك',      /حدودك/],
    ['ترقية حسابي',/ترقية حسابي/],
    ['my plan',    /\bmy plan\b/i],
    ['your plan',  /\byour plan\b/i],
    ['your usage', /\byour usage\b/i],
    ['your limits',/\byour limits\b/i],
    ['upgrade your account', /upgrade your account/i],
  ];

  for (const [label, re] of FORBIDDEN) {
    it(`does not use «${label}» (implies a personal/individual plan today)`, () => {
      expect(src).not.toMatch(re);
    });
  }

  it('also avoids absolute «no individual memberships ever» phrasing', () => {
    // These would close the door on individual plans in the future.
    expect(src).not.toMatch(/الأفراد لا يملكون عضويات/);
    expect(src).not.toMatch(/العضويات ليست للأفراد/);
    expect(src).not.toMatch(/للمنشآت فقط بشكل دائم/);
    expect(src).not.toMatch(/individuals can never have memberships/i);
  });

  it('keeps at least one future-ready phrase about individual plans', () => {
    const futureReady = [
      /باقات الأفراد غير مفعّلة/,
      /باقات الأفراد لاحقًا/,
      /سيتم دعمها لاحقًا/,
      /Individual plans are not enabled/i,
      /may be supported later/i,
    ];
    expect(futureReady.some((re) => re.test(src))).toBe(true);
  });
});