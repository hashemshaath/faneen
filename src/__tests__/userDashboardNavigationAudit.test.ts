import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * USER DASHBOARD NAVIGATION + LINKS + ACTIONS AUDIT
 * Guards against re-introduction of broken navigation patterns inside
 * the user-facing dashboard surface.
 */

const ROOTS = ['src/pages/dashboard', 'src/components/dashboard'];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\.|\.spec\./.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));

describe('USER DASHBOARD NAVIGATION + LINKS + ACTIONS AUDIT', () => {
  it('collects a non-empty dashboard file set', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('contains no literal href="#" anchors in dashboard code', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // Strip block comments and line comments cheaply
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/[^\n]*/g, '$1');
      if (/href\s*=\s*("#"|\{`#`\}|\{"#"\})/.test(stripped)) {
        offenders.push(f);
      }
    }
    expect(offenders, `href="#" found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('contains no Link to={undefined|null} or href={undefined|null}', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (/(to|href)\s*=\s*\{?\s*(undefined|null)\s*\}?/.test(src)) {
        offenders.push(f);
      }
    }
    expect(offenders, `undefined/null link target found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('external links (target="_blank") always pair with rel="noopener" or rel="noreferrer"', () => {
    const offenders: { file: string; line: number }[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const lines = src.split('\n');
      lines.forEach((line, idx) => {
        if (!/target\s*=\s*"_blank"/.test(line)) return;
        // Look at a small neighborhood for rel attribute on multi-line tags
        const window = lines.slice(Math.max(0, idx - 4), Math.min(lines.length, idx + 5)).join('\n');
        if (!/rel\s*=\s*"[^"]*(noopener|noreferrer)[^"]*"/.test(window)) {
          offenders.push({ file: f, line: idx + 1 });
        }
      });
    }
    expect(
      offenders,
      `target="_blank" without rel noopener/noreferrer at: ${offenders
        .map((o) => `${o.file}:${o.line}`)
        .join(', ')}`,
    ).toEqual([]);
  });
});