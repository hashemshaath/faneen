#!/usr/bin/env node
/**
 * Sitemap HTTP Audit
 * ──────────────────
 * Builds the app, serves it locally, then fetches every static path
 * listed in the sitemap edge function to verify:
 *   1. HTTP 200 response
 *   2. No redirect to /admin or /dashboard
 *
 * Requires: dist/ folder (run `npm run build` first or pass --skip-build).
 *
 * Exit codes: 0 = pass, 1 = failures found
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { execSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const skipBuild = process.argv.includes('--skip-build');

// ── 1. Build if needed ──────────────────────────────────
if (!skipBuild && !existsSync(DIST)) {
  console.log(`${c.bold}📦 Building app...${c.reset}`);
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}

if (!existsSync(DIST)) {
  console.error(`${c.red}✗ dist/ not found. Run "npm run build" first.${c.reset}`);
  process.exit(1);
}

// ── 2. Extract static paths from sitemap edge function ──
function read(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

const sitemapEdge = read('supabase/functions/sitemap/index.ts');
if (!sitemapEdge) {
  console.error(`${c.red}✗ sitemap edge function not found${c.reset}`);
  process.exit(1);
}

// Extract paths from staticPages array: loc: "/path"
const staticPaths = [...sitemapEdge.matchAll(/loc:\s*"([^"]+)"/g)]
  .map(m => m[1])
  .filter(p => p.startsWith('/'));

// Also extract dynamic route patterns like /${encodeURIComponent(...)
// We won't test those (need real data), only static paths.

// Extract routes from App.tsx for cross-reference
const appTsx = read('src/App.tsx');
const routePaths = appTsx
  ? [...appTsx.matchAll(/path="([^"]+)"/g)].map(m => m[1])
  : [];

// Verify each static sitemap path has a matching route
const FORBIDDEN_PREFIXES = ['/admin', '/dashboard', '/auth'];

console.log(`\n${c.bold}${c.cyan}🌐 Sitemap HTTP Audit${c.reset}\n`);
console.log(`${c.bold}Static paths found: ${staticPaths.length}${c.reset}`);
console.log(`${c.bold}App routes found: ${routePaths.length}${c.reset}\n`);

// ── 3. Serve dist/ with a simple static server ─────────
const PORT = 4173 + Math.floor(Math.random() * 1000);

function serveDist() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      let filePath = join(DIST, url.pathname);

      // SPA fallback: if file doesn't exist, serve index.html
      if (!existsSync(filePath) || (existsSync(filePath) && readFileSync(filePath).length === 0)) {
        // Check if it's a directory
        const indexPath = join(filePath, 'index.html');
        if (existsSync(indexPath)) {
          filePath = indexPath;
        } else {
          filePath = join(DIST, 'index.html');
        }
      }

      // If the path points to a directory, serve index.html
      try {
        const { statSync } = await import('node:fs');
        if (statSync(filePath).isDirectory()) {
          const indexPath = join(filePath, 'index.html');
          filePath = existsSync(indexPath) ? indexPath : join(DIST, 'index.html');
        }
      } catch { /* noop */ }

      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = filePath.split('.').pop();
      const mimeMap = {
        html: 'text/html', js: 'application/javascript', css: 'text/css',
        json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
        jpg: 'image/jpeg', ico: 'image/x-icon', woff2: 'font/woff2',
      };

      res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });

    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// ── 4. Run checks ──────────────────────────────────────
const server = await serveDist();
console.log(`${c.bold}🖥️  Server running on http://127.0.0.1:${PORT}${c.reset}\n`);

const failures = [];
const warnings = [];

for (const path of staticPaths) {
  // Step A: Check path is not forbidden
  const isForbidden = FORBIDDEN_PREFIXES.some(p => path.startsWith(p));
  if (isForbidden) {
    failures.push({ path, reason: 'Forbidden path in sitemap (admin/dashboard/auth)' });
    console.log(`   ${c.red}✗${c.reset}  ${path} → forbidden prefix`);
    continue;
  }

  // Step B: Check path has a matching route in App.tsx
  const hasRoute = routePaths.some(r => {
    if (r === path) return true;
    // Dynamic routes like /:username or /projects/:id
    if (r.includes(':')) {
      const routeRegex = new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$');
      return routeRegex.test(path);
    }
    return false;
  });

  if (!hasRoute && path !== '/') {
    // The catch-all /:username or /* will match, so only warn
    // if it's a specific path that doesn't match any explicit route
    const matchesCatchAll = routePaths.includes('/:username') || routePaths.includes('*');
    if (!matchesCatchAll) {
      warnings.push({ path, reason: 'No matching route in App.tsx' });
    }
  }

  // Step C: Fetch the path and check HTTP status
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { redirect: 'manual' });
    const body = await res.text(); // consume body

    if (res.status !== 200) {
      failures.push({ path, reason: `HTTP ${res.status}` });
      console.log(`   ${c.red}✗${c.reset}  ${path} → HTTP ${res.status}`);
      continue;
    }

    // Check for meta-refresh or JS redirect to admin/dashboard in the HTML
    const hasMetaRedirect = /http-equiv=["']refresh["'][^>]*url=["']?[^"']*\/(admin|dashboard)/i.test(body);
    const hasLocationRedirect = res.headers.get('location');

    if (hasLocationRedirect) {
      const loc = hasLocationRedirect;
      if (/\/(admin|dashboard)/i.test(loc)) {
        failures.push({ path, reason: `Redirects to ${loc}` });
        console.log(`   ${c.red}✗${c.reset}  ${path} → redirect to ${loc}`);
        continue;
      }
    }

    if (hasMetaRedirect) {
      failures.push({ path, reason: 'Meta-refresh redirect to admin/dashboard' });
      console.log(`   ${c.red}✗${c.reset}  ${path} → meta redirect to admin/dashboard`);
      continue;
    }

    // Verify the HTML contains the SPA shell (index.html was served)
    const hasAppShell = body.includes('id="root"') || body.includes('id=\\"root\\"');
    if (!hasAppShell) {
      warnings.push({ path, reason: 'Response does not contain app shell (#root)' });
      console.log(`   ${c.yellow}⚠${c.reset}  ${path} → missing #root`);
      continue;
    }

    console.log(`   ${c.green}✓${c.reset}  ${path} → 200 OK`);
  } catch (err) {
    failures.push({ path, reason: `Fetch error: ${err.message}` });
    console.log(`   ${c.red}✗${c.reset}  ${path} → ${err.message}`);
  }
}

// ── 5. Shutdown & report ────────────────────────────────
server.close();

console.log(`\n${c.bold}${'═'.repeat(55)}${c.reset}`);

if (warnings.length > 0) {
  console.log(`\n${c.yellow}${c.bold}⚠ Warnings (${warnings.length})${c.reset}`);
  for (const w of warnings) {
    console.log(`   ${c.yellow}⚠${c.reset}  ${w.path}: ${w.reason}`);
  }
}

if (failures.length > 0) {
  console.log(`\n${c.red}${c.bold}❌ Failures (${failures.length})${c.reset}`);
  for (const f of failures) {
    console.log(`   ${c.red}✗${c.reset}  ${f.path}: ${f.reason}`);
  }
}

// GitHub Actions Job Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  const icon = failures.length > 0 ? '❌' : '✅';
  let md = `## ${icon} Sitemap HTTP Audit\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Paths tested | ${staticPaths.length} |\n`;
  md += `| Passed | ${staticPaths.length - failures.length} |\n`;
  md += `| Failed | ${failures.length} |\n`;
  md += `| Warnings | ${warnings.length} |\n\n`;

  if (failures.length > 0) {
    md += `### Failures\n\n| Path | Reason |\n|---|---|\n`;
    for (const f of failures) md += `| \`${f.path}\` | ${f.reason} |\n`;
    md += `\n`;
  }
  if (warnings.length > 0) {
    md += `### Warnings\n\n| Path | Reason |\n|---|---|\n`;
    for (const w of warnings) md += `| \`${w.path}\` | ${w.reason} |\n`;
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (failures.length === 0) {
  console.log(`\n${c.green}${c.bold}✅ All ${staticPaths.length} sitemap paths return HTTP 200${c.reset}\n`);
  process.exit(0);
} else {
  console.log();
  process.exit(1);
}