import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

describe('opportunities phase 3 — route consolidation', () => {
  it.each([
    '/dashboard/opportunities',
    '/dashboard/opportunities/:id',
    '/dashboard/opportunities/assigned',
    '/admin/opportunities',
  ])('new alias %s is registered', (p) => {
    expect(APP).toContain(`path="${p}"`);
  });

  it.each([
    '/dashboard/my-requests',
    '/dashboard/my-requests/:id',
    '/dashboard/leads',
    '/dashboard/rfq',
    '/dashboard/rfq/inbox',
    '/dashboard/rfq/:id',
    '/admin/quote-requests',
    '/admin/quote-requests/:id',
    '/admin/provider-leads',
  ])('legacy route %s is NOT deleted', (p) => {
    expect(APP).toContain(`path="${p}"`);
  });
});

describe('opportunities phase 3 — provider UI does not surface «Provider Leads»', () => {
  // The opportunities module is the new UI surface; it must never use the
  // raw «Provider Leads» wording. Legacy admin/operator screens may still
  // mention it as an internal CRM concept and are out of scope here.
  it('opportunities module sources are free of the "Provider Leads" label', () => {
    const dir = resolve(root, 'src/modules/opportunities');
    const stack = [dir];
    const files: string[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const name of readdirSync(cur)) {
        const full = join(cur, name);
        const st = statSync(full);
        if (st.isDirectory()) stack.push(full);
        else if (/\.tsx?$/.test(name)) files.push(full);
      }
    }
    const offenders: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      if (/Provider Leads/.test(s)) offenders.push(f);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});