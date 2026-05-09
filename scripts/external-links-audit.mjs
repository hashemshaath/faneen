#!/usr/bin/env node
/**
 * External Links Audit
 * ─────────────────────
 * Scans all .tsx/.ts source files for external URLs (https://...)
 * and verifies each returns a 2xx/3xx status code.
 *
 * Exit 1 on any broken external link found.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/* ── Config ── */
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;
const MAX_RETRIES = 2;

// Domains / patterns to skip (CDNs, analytics, dynamic URLs, etc.)
const SKIP_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdn\.jsdelivr\.net/,
  /unpkg\.com/,
  /cdnjs\.cloudflare\.com/,
  /googleapis\.com\/auth/,
  /accounts\.google\.com/,
  /maps\.google\.com/,
  /google\.com\/maps/,
  /play\.google\.com/,
  /apps\.apple\.com/,
  /schema\.org/,
  /twitter\.com/,
  /x\.com/,
  /facebook\.com/,
  /instagram\.com/,
  /linkedin\.com/,
  /youtube\.com/,
  /youtu\.be/,
  /vimeo\.com/,
  /wa\.me/,
  /api\.whatsapp\.com/,
  /t\.me/,
  /example\.com/,
  /localhost/,
  /127\.0\.0\.1/,
  /placeholder/,
  /supabase\.co/,
  /lovable\.app/,
  /lovable\.dev/,
  /qitaat\.com/,
  /faneen\.com/,
  // OpenAI / Anthropic / Google AI docs hard-block non-browser UAs (HTTP 403).
  // The links themselves are valid — skip them in CI to avoid false positives.
  /platform\.openai\.com/,
  /docs\.anthropic\.com/,
  /ai\.google\.dev/,
];

/* ── Helpers ── */

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      files.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/* ── 1. Collect external URLs ── */

const urlRe = /https?:\/\/[^\s"'`<>)\]},;]+/g;
const urlMap = new Map(); // url -> Set<file>

for (const file of walk(SRC)) {
  const source = fs.readFileSync(file, "utf-8");
  const relFile = path.relative(ROOT, file);
  let match;
  urlRe.lastIndex = 0;
  while ((match = urlRe.exec(source))) {
    let url = match[0].replace(/[.)]+$/, ""); // trim trailing punctuation
    if (SKIP_PATTERNS.some((p) => p.test(url))) continue;
    // Skip template literals (contain ${), SVG namespaces, and incomplete URLs
    if (/\$\{/.test(url)) continue;
    if (/w3\.org/.test(url)) continue;
    if (/\{[a-z]/.test(url)) continue;
    if (url === "https://" || url === "http://") continue;
    // Skip URLs that are clearly part of code patterns
    if (url.length < 12) continue;
    if (!urlMap.has(url)) urlMap.set(url, new Set());
    urlMap.get(url).add(relFile);
  }
}

/* ── 2. Check URLs ── */

async function checkUrl(url, retries = 0) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "QitaatLinkChecker/1.0" },
    });
    clearTimeout(timer);
    if (res.status >= 400) {
      // Retry with GET (some servers reject HEAD)
      if (retries < 1) {
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
        const res2 = await fetch(url, {
          method: "GET",
          signal: controller2.signal,
          redirect: "follow",
          headers: { "User-Agent": "QitaatLinkChecker/1.0" },
        });
        clearTimeout(timer2);
        return { url, status: res2.status, ok: res2.status < 400 };
      }
      return { url, status: res.status, ok: false };
    }
    return { url, status: res.status, ok: true };
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (retries + 1)));
      return checkUrl(url, retries + 1);
    }
    return { url, status: err.code || "TIMEOUT", ok: false };
  }
}

async function checkAll(urls) {
  const results = [];
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      results.push(await checkUrl(url));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

const urls = [...urlMap.keys()];
console.log(`Checking ${urls.length} unique external URLs...`);
const results = await checkAll(urls);
const broken = results.filter((r) => !r.ok);

/* ── 3. Report ── */

const summary = `## 🌐 External Links Audit

| Metric | Value |
|--------|-------|
| Unique external URLs checked | ${urls.length} |
| Broken links | ${broken.length} |

`;

if (broken.length > 0) {
  const rows = broken
    .map((b) => {
      const files = [...urlMap.get(b.url)].join(", ");
      return `| \`${b.url}\` | ${b.status} | ${files} |`;
    })
    .join("\n");

  const report =
    summary +
    `### ❌ Broken External Links\n\n| URL | Status | Files |\n|-----|--------|-------|\n${rows}\n`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(`\n❌ Found ${broken.length} broken external link(s).`);
  process.exit(1);
} else {
  const report = summary + "✅ All external links are reachable.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}