// SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 (Phase 2)
import { healthCors, healthJson, probeHttp, requireAdminHealth } from "../_shared/health/probe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: healthCors });
  const gate = await requireAdminHealth(req);
  if (!gate.ok) return gate.res;
  const key = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const out = await probeHttp(
    key ? [] : ["LOVABLE_API_KEY"],
    "https://ai.gateway.lovable.dev/v1/models",
    { headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "health-probe" } },
    (status) => (status === 200 ? null : `http_${status}`),
  );
  return healthJson({ service: "lovable_ai", ...out });
});