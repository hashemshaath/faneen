import { defineMcp } from "@lovable.dev/mcp-js";
import searchProviders from "./tools/search-providers";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "qitaat-mcp",
  title: "Qitaat Directory MCP",
  version: "0.1.0",
  instructions:
    "Read-only access to the Qitaat industrial B2B directory. Use `search_providers` to find providers by keyword and `list_categories` to browse the taxonomy.",
  tools: [searchProviders, listCategories],
});