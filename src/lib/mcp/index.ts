import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchProviders from "./tools/search-providers";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "qitaat-mcp",
  title: "Qitaat Directory MCP",
  version: "0.1.0",
  instructions:
    "Read-only access to the Qitaat industrial B2B directory. Use `search_providers` to find providers by keyword and `list_categories` to browse the taxonomy.",
  // Require OAuth so the MCP server is not publicly callable once published.
  // Tokens are minted by Supabase GoTrue; the `authenticated` audience is the
  // project-wide audience for signed-in end users.
  auth: auth.oauth.issuer({
    issuer: "https://hckpxwhjycmdflaneihd.supabase.co/auth/v1",
    acceptedAudiences: ["authenticated"],
    resourceName: "Qitaat Directory MCP",
  }),
  tools: [searchProviders, listCategories],
});