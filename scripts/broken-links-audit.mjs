#!/usr/bin/env node
/**
 * Broken Internal Links Audit
 * ────────────────────────────
 * Scans all .tsx/.ts source files for internal links (href="/...", to="/...")
 * and verifies each target matches a defined route in App.tsx.
 *
 * Exit 1 on any broken link found.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/* ── 1. Extract routes from App.tsx ── */

const appSource = fs.readFileSync(path.join(SRC, "App.tsx"), "utf-8");

// Match <Route path="..." />  — collect all static & parameterized paths
const routeRe = /path=["']([^"']+)["']/g;
const routes = [];
let m;
while ((m = routeRe.exec(appSource))) {
  routes.push(m[1]);
}
// Add wildcard catch-all knowledge
const hasWildcard = routes.includes("*");
// /:username is a dynamic catch-all at root level
const hasDynamicRoot = routes.some((r) => r === "/:username");

/**
 * Check if a path matches any defined route.
 */
function matchesRoute(linkPath) {
  // Strip query string and hash
  const clean = linkPath.split("?")[0].split("#")[0];
  if (!clean || clean === "/") return routes.includes("/");

  for (const route of routes) {
    if (route === "*") continue;
    if (route === clean) return true;

    // Convert route pattern to regex
    // /projects/:id  →  /projects/[^/]+
    const pattern = "^" + route.replace(/:[^/]+/g, "[^/]+") + "$";
    if (new RegExp(pattern).test(clean)) return true;
  }

  // /:username catches any single-segment path
  if (hasDynamicRoot && /^\/[^/]+$/.test(clean)) return true;

  return false;
}

/* ── 2. Scan source files for internal links ── */

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

// Patterns that reference internal paths:
//   href="/..."   to="/..."   navigate("/...")   navigate(`/...`)
const linkPatterns = [
  /(?:href|to)=["'](\/([\w\-/:.*]+)?(?:\?[^"']*)?)["']/g,
  /(?:href|to)=\{["'`](\/([\w\-/:.*]+)?(?:\?[^"'`]*)?)["'`]\}/g,
  /navigate\(["'`](\/([\w\-/:.*]+)?(?:\?[^"'`]*)?)["'`]\)/g,
];

// Paths to ignore (external, anchors, dynamic expressions)
const IGNORE = [
  "/functions/v1/",   // edge functions
  "/auth/v1/",        // supabase auth
  "/rest/v1/",        // supabase rest
  "/storage/v1/",     // supabase storage
];

const broken = [];
const checked = new Set();

for (const file of walk(SRC)) {
  const source = fs.readFileSync(file, "utf-8");
  const relFile = path.relative(ROOT, file);

  for (const pattern of linkPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) {
      const linkPath = match[1];
      if (!linkPath || !linkPath.startsWith("/")) continue;
      if (IGNORE.some((ig) => linkPath.startsWith(ig))) continue;

      const key = linkPath.split("?")[0].split("#")[0];
      if (checked.has(key)) {
        // Already validated this path
        if (!matchesRoute(key)) {
          broken.push({ file: relFile, link: linkPath });
        }
        continue;
      }
      checked.add(key);

      if (!matchesRoute(key)) {
        broken.push({ file: relFile, link: linkPath });
      }
    }
  }
}

/* ── 3. Report ── */

const summary = `## 🔗 Broken Internal Links Audit

| Metric | Value |
|--------|-------|
| Routes defined | ${routes.length} |
| Unique internal links checked | ${checked.size} |
| Broken links | ${broken.length} |

`;

if (broken.length > 0) {
  const table = broken
    .map((b) => `| \`${b.file}\` | \`${b.link}\` | ❌ No matching route |`)
    .join("\n");

  const report = summary + `### ❌ Broken Links\n\n| File | Link | Status |\n|------|------|--------|\n${table}\n`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(`\n❌ Found ${broken.length} broken internal link(s).`);
  process.exit(1);
} else {
  const report = summary + "✅ All internal links match defined routes.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}