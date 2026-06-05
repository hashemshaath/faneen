// SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 (Phase 2)
import { healthCors, healthJson, probeHttp, requireAdminHealth } from "../_shared/health/probe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: healthCors });
  const gate = await requireAdminHealth(req);
  if (!gate.ok) return gate.res;
  const key = Deno.env.get("MOYASAR_SECRET_KEY") ?? "";
  const webhook = Deno.env.get("MOYASAR_WEBHOOK_SECRET") ?? "";
  const auth = "Basic " + btoa(`${key}:`);
  const out = await probeHttp(
    key ? [] : ["MOYASAR_SECRET_KEY"],
    "https://api.moyasar.com/v1/payments?page=1&per=1",
    { headers: { Authorization: auth } },
    (status) => (status === 200 ? null : `http_${status}`),
  );
  return healthJson({
    service: "moyasar",
    ...out,
    warnings: webhook ? [] : ["MOYASAR_WEBHOOK_SECRET missing"],
  });
});