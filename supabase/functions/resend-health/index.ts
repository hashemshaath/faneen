// SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 (Phase 2)
import { healthCors, healthJson, probeHttp, requireAdminHealth } from "../_shared/health/probe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: healthCors });
  const gate = await requireAdminHealth(req);
  if (!gate.ok) return gate.res;
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  const out = await probeHttp(
    key ? [] : ["RESEND_API_KEY"],
    "https://api.resend.com/domains",
    { headers: { Authorization: `Bearer ${key}` } },
    (status, body) => {
      if (status === 200) return null;
      // Restricted/send-only API keys can't list /domains but ARE valid.
      if (status === 401 && /restricted_api_key/i.test(body)) return null;
      return `http_${status}`;
    },
  );
  return healthJson({ service: "resend", ...out, restricted: out.status === 401 });
});