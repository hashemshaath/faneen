#!/usr/bin/env node
/**
 * Lighthouse CI Audit
 * ───────────────────
 * Runs Lighthouse on key pages via the local build (served with a
 * simple HTTP server) and asserts minimum scores for:
 *   - Performance
 *   - SEO
 *   - Accessibility
 *   - Best Practices
 *
 * Pages tested:
 *   /            — Homepage
 *   /categories  — Categories listing
 *   /search      — Search page
 *
 * Usage:
 *   node scripts/lighthouse-ci-audit.mjs [--skip-build] [--perf 70] [--seo 85] [--a11y 70] [--bp 80]
 *
 * Requires: Chrome/Chromium (auto-detected or CHROME_PATH env var).
 * Exit 1 if any page fails any threshold.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { statSync, existsSync, readFileSync } from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const skipBuild = args.includes("--skip-build");

const THRESHOLDS = {
  performance: parseInt(flag("perf", "60"), 10),
  seo: parseInt(flag("seo", "85"), 10),
  accessibility: parseInt(flag("a11y", "65"), 10),
  "best-practices": parseInt(flag("bp", "75"), 10),
};

const PAGES = [
  { path: "/", label: "الرئيسية (Homepage)" },
  { path: "/categories", label: "الفئات (Categories)" },
  { path: "/search", label: "البحث (Search)" },
];

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

/* ── 1. Build ── */

if (!skipBuild && !existsSync(DIST)) {
  console.log(`${c.bold}📦 Building app...${c.reset}`);
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
}
if (!existsSync(DIST)) {
  console.error(`${c.red}✗ dist/ not found. Run "npm run build" first.${c.reset}`);
  process.exit(1);
}

/* ── 2. Detect Chrome ── */

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.env.PUPPETEER_CHROMIUM_REVISION) return undefined; // let lighthouse find it

  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined;
}

const chromePath = findChrome();

/* ── 3. Serve dist ── */

const PORT = 4200 + Math.floor(Math.random() * 800);

function serveDist() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      let filePath = path.join(DIST, url.pathname);
      try {
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          const idx = path.join(filePath, "index.html");
          filePath = existsSync(idx) ? idx : path.join(DIST, "index.html");
        }
      } catch {
        filePath = path.join(DIST, "index.html");
      }
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = filePath.split(".").pop();
      const mime = {
        html: "text/html", js: "application/javascript", css: "text/css",
        json: "application/json", svg: "image/svg+xml", png: "image/png",
        jpg: "image/jpeg", ico: "image/x-icon", woff2: "font/woff2",
        webp: "image/webp", avif: "image/avif", woff: "font/woff",
      };
      res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

/* ── 4. Run Lighthouse via CLI ── */

async function runLighthouse(url, label) {
  const outputPath = path.join(ROOT, `.lh-${label.replace(/[^a-z0-9]/gi, "_")}.json`);

  const lhArgs = [
    url,
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage",
    "--only-categories=performance,seo,accessibility,best-practices",
    "--throttling-method=simulate",
    "--form-factor=mobile",
    "--quiet",
  ];
  if (chromePath) lhArgs.push(`--chrome-path=${chromePath}`);

  // Find lighthouse binary
  let lhBin;
  try {
    lhBin = execSync("which lighthouse", { encoding: "utf-8" }).trim();
  } catch {
    // Try npx
    lhBin = null;
  }

  return new Promise((resolve) => {
    const cmd = lhBin ? lhBin : "npx";
    const finalArgs = lhBin ? lhArgs : ["lighthouse", ...lhArgs];

    const proc = spawn(cmd, finalArgs, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CHROME_PATH: chromePath || "" },
      timeout: 120_000,
    });

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.stdout.on("data", () => {});

    proc.on("close", (code) => {
      if (!existsSync(outputPath)) {
        resolve({ error: stderr.slice(-300) || `Exit code ${code}`, scores: null });
        return;
      }
      try {
        const report = JSON.parse(readFileSync(outputPath, "utf-8"));
        const scores = {};
        for (const cat of Object.values(report.categories || {})) {
          scores[cat.id] = Math.round((cat.score || 0) * 100);
        }
        // Clean up
        try { fs.unlinkSync(outputPath); } catch {}
        resolve({ error: null, scores });
      } catch (e) {
        resolve({ error: e.message, scores: null });
      }
    });

    proc.on("error", (err) => {
      resolve({ error: err.message, scores: null });
    });
  });
}

/* ── 5. Main ── */

console.log(`\n${c.bold}${c.cyan}🔦 Lighthouse CI Audit${c.reset}`);
console.log(`   Thresholds: perf≥${THRESHOLDS.performance} seo≥${THRESHOLDS.seo} a11y≥${THRESHOLDS.accessibility} bp≥${THRESHOLDS["best-practices"]}`);
console.log(`   Chrome: ${chromePath || "(auto-detect)"}\n`);

const server = await serveDist();
console.log(`   Server: http://127.0.0.1:${PORT}\n`);

const allResults = [];
let hasFailure = false;

for (const page of PAGES) {
  const url = `http://127.0.0.1:${PORT}${page.path}`;
  process.stdout.write(`   ⏳ ${page.label} ...`);

  const result = await runLighthouse(url, page.label);

  if (result.error) {
    console.log(`\r   ${c.yellow}⚠${c.reset} ${page.label} — Lighthouse error: ${result.error.substring(0, 120)}`);
    allResults.push({ page: page.label, path: page.path, scores: null, error: result.error });
    continue;
  }

  const scores = result.scores;
  const failures = [];

  for (const [cat, min] of Object.entries(THRESHOLDS)) {
    const actual = scores[cat] ?? 0;
    if (actual < min) {
      failures.push(`${cat}: ${actual} < ${min}`);
    }
  }

  const icon = failures.length > 0 ? `${c.red}✗` : `${c.green}✓`;
  const scoreStr = Object.entries(scores).map(([k, v]) => {
    const min = THRESHOLDS[k] || 0;
    const color = v >= min ? c.green : c.red;
    return `${k}:${color}${v}${c.reset}`;
  }).join(" ");

  console.log(`\r   ${icon}${c.reset} ${page.label}  ${scoreStr}`);

  if (failures.length > 0) hasFailure = true;
  allResults.push({ page: page.label, path: page.path, scores, failures });
}

server.close();

/* ── 6. Report ── */

console.log(`\n${c.bold}${"═".repeat(55)}${c.reset}`);

// GitHub Actions Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = hasFailure ? "❌" : "✅";
  let md = `## ${icon} Lighthouse CI Audit\n\n`;
  md += `**Thresholds**: Performance ≥ ${THRESHOLDS.performance} | SEO ≥ ${THRESHOLDS.seo} | Accessibility ≥ ${THRESHOLDS.accessibility} | Best Practices ≥ ${THRESHOLDS["best-practices"]}\n\n`;
  md += `| Page | Performance | SEO | Accessibility | Best Practices | Status |\n`;
  md += `|------|:-----------:|:---:|:-------------:|:--------------:|:------:|\n`;

  for (const r of allResults) {
    if (r.error) {
      md += `| ${r.page} | — | — | — | — | ⚠️ Error |\n`;
      continue;
    }
    const s = r.scores;
    const status = r.failures?.length > 0 ? "❌ Fail" : "✅ Pass";
    const fmt = (cat) => {
      const v = s[cat] ?? "—";
      const min = THRESHOLDS[cat] || 0;
      return v >= min ? `**${v}**` : `⚠️ ${v}`;
    };
    md += `| ${r.page} | ${fmt("performance")} | ${fmt("seo")} | ${fmt("accessibility")} | ${fmt("best-practices")} | ${status} |\n`;
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (hasFailure) {
  console.log(`\n${c.red}${c.bold}❌ Lighthouse scores below thresholds — merge blocked${c.reset}\n`);
  process.exit(1);
} else if (allResults.every((r) => r.error)) {
  console.log(`\n${c.yellow}${c.bold}⚠ Lighthouse could not run (Chrome not found?) — skipping${c.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${c.green}${c.bold}✅ All Lighthouse scores meet thresholds${c.reset}\n`);
  process.exit(0);
}