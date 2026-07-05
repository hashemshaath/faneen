import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_categories",
  title: "List industrial categories",
  description: "List published Qitaat taxonomy categories (industrial sectors and services).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return { content: [{ type: "text", text: "Backend not configured." }], isError: true };
    }
    const n = limit ?? 50;
    const endpoint = `${url}/rest/v1/taxonomy_categories?limit=${n}&select=id,slug,name_ar,name_en,parent_id`;
    const res = await fetch(endpoint, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) {
      return { content: [{ type: "text", text: `List failed: HTTP ${res.status}` }], isError: true };
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { categories: rows, count: rows.length },
    };
  },
});