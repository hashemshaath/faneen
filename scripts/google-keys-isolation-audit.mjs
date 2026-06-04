#!/usr/bin/env node
// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1 — CI scanner for Google key isolation.
import { execSync } from "node:child_process";

const rg = (args) => {
  try { return execSync(`rg ${args} || true`, { encoding: "utf8" }); } catch { return ""; }
};

const offenders = [];

const browserKey = rg("-n 'VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY' src/ -g '!**/*.md'")
  .split("\n").filter(Boolean)
  .filter((l) => !l.startsWith("src/modules/google/mapsService.ts"))
  .filter((l) => !l.includes("googleIntegrationGovernanceAudit1.test"));
if (browserKey.length) offenders.push(["browser key leaked outside mapsService.ts", browserKey]);

const backendViteEnv = rg("-n 'import\\.meta\\.env\\.VITE_' supabase/functions/").split("\n").filter(Boolean);
if (backendViteEnv.length) offenders.push(["edge functions read VITE_ env vars", backendViteEnv]);

const hardcoded = rg("-n 'AIza[0-9A-Za-z_\\-]{20,}' src/ supabase/functions/")
  .split("\n").filter(Boolean).filter((l) => !l.includes(".test."));
if (hardcoded.length) offenders.push(["hardcoded Google API key", hardcoded]);

const directGateway = rg("-n 'connector-gateway\\.lovable\\.dev/google_maps' src/ -g '!**/*.md'")
  .split("\n").filter(Boolean)
  .filter((l) => !l.includes("__tests__") && !l.includes(".test."));
if (directGateway.length) offenders.push(["frontend hits connector gateway directly", directGateway]);

if (offenders.length === 0) {
  console.log("✅ google-keys-isolation: PASS");
  process.exit(0);
}
for (const [label, lines] of offenders) {
  console.error(`\n❌ ${label}`);
  for (const l of lines) console.error("   " + l);
}
process.exit(1);