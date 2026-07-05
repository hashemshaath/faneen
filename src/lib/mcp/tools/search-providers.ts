import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_providers",
  title: "Search providers",
  description:
    "Search Qitaat industrial service providers by keyword. Returns public directory entries (name, city, slug).",
  inputSchema: {
    query: z.string().trim().min(1).describe("Keyword to match against provider name (Arabic or English)."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return { content: [{ type: "text", text: "Backend not configured." }], isError: true };
    }
    const n = limit ?? 10;
    const like = encodeURIComponent(`*${query}*`);
    const endpoint = `${url}/rest/v1/businesses_public?or=(name_ar.ilike.${like},name_en.ilike.${like})&limit=${n}&select=id,slug,name_ar,name_en,city_ar,city_en`;
    const res = await fetch(endpoint, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Search failed: HTTP ${res.status}` }], isError: true };
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { results: rows, count: rows.length },
    };
  },
});