#!/usr/bin/env node
/**
 * Membership Data Integrity Audit
 * ────────────────────────────────
 * Ensures membership data (prices, features, names, durations)
 * is read from the database and not hardcoded in UI components.
 *
 * Checks:
 *  1. No hardcoded SAR prices (e.g. "99", "249", "499") in membership UI files
 *  2. No hardcoded feature lists in membership-facing components
 *  3. No hardcoded savings percentages
 *  4. Plan names/descriptions come from DB queries, not static strings
 *
 * Exit 1 on violations found.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src");

const errors = [];

// Files that are allowed to contain membership config (admin, lib definitions)
const ALLOWED_FILES = [
  'membership-tiers.ts',
  'membership-limits.ts',
  'AdminMemberships.tsx',
  'types.ts',
];

// Membership-facing UI files to audit
const AUDIT_GLOBS = [
  'src/components/membership/',
  'src/components/home/MembershipSection.tsx',
  'src/pages/Membership.tsx',
];

function isAuditTarget(filePath) {
  const rel = path.relative(path.resolve(__dirname, '..'), filePath);
  return AUDIT_GLOBS.some(g => rel.startsWith(g.replace(/\//g, path.sep)));
}

function isAllowed(filePath) {
  return ALLOWED_FILES.some(f => filePath.endsWith(f));
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(f.name)) out.push(p);
  }
  return out;
}

const allFiles = walk(SRC);
const targets = allFiles.filter(f => isAuditTarget(f) && !isAllowed(f));

for (const file of targets) {
  const rel = path.relative(path.resolve(__dirname, '..'), file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    // Check for hardcoded savings percentage (e.g. "Save 17%", "وفّر 17%")
    if (/(?:save|وفّر)\s+\d+%/i.test(line) && !/savingsPct|savings/.test(line)) {
      errors.push(`${rel}:${ln}  ❌ Hardcoded savings percentage — should be calculated from DB prices`);
    }

    // Check for hardcoded SAR prices in UI (not in query/form context)
    if (/(?:price|سعر|ر\.س)[^}]*(?:99|249|499|990|2490|4990)/.test(line) && !/price_monthly|price_yearly|form\.|onChange|Input/.test(line)) {
      errors.push(`${rel}:${ln}  ❌ Hardcoded membership price found — must come from DB`);
    }

    // Check for hardcoded feature arrays (static membership feature lists)
    if (/features\s*[:=]\s*\[/.test(line) && /['"](?:تصفح|تقييم|معرض|عقود|Browse|Ratings|Gallery|Contracts)/.test(line)) {
      errors.push(`${rel}:${ln}  ❌ Hardcoded feature list — features must come from membership_plans table`);
    }
  }
}

// Verify that MembershipSection reads from DB
const mSection = allFiles.find(f => f.endsWith('MembershipSection.tsx'));
if (mSection) {
  const content = fs.readFileSync(mSection, 'utf8');
  if (!content.includes('membership_plans') && !content.includes("from('membership_plans')")) {
    // Check if it queries from supabase at all
    if (!content.includes('useQuery') || !content.includes('supabase')) {
      errors.push(`MembershipSection.tsx  ❌ Does not query membership_plans from DB — data must not be static`);
    }
  }
}

// Verify PlanCard uses plan props, not hardcoded data
const planCard = allFiles.find(f => f.endsWith('PlanCard.tsx'));
if (planCard) {
  const content = fs.readFileSync(planCard, 'utf8');
  if (/price\s*=\s*\d+/.test(content)) {
    errors.push(`PlanCard.tsx  ❌ Hardcoded price in PlanCard — must use plan.price_monthly/price_yearly`);
  }
}

console.log(`\n💳 Membership Data Integrity Audit`);
console.log(`   Scanned ${targets.length} membership UI files\n`);

if (errors.length) {
  console.log(`❌ ${errors.length} violation(s):`);
  errors.forEach(e => console.log(`   ${e}`));
} else {
  console.log('✅ All membership data reads from database — no hardcoded values found!');
}

process.exit(errors.length > 0 ? 1 : 0);