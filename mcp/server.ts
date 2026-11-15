// Local stdio MCP server exposing searchReferences to Claude Code.
// Register: claude mcp add --transport stdio refsearch -- npx tsx mcp/server.ts
// Never write to stdout here: stdout carries the MCP protocol. Log with console.error.
import "../scripts/env";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT, searchReferences } from "../lib/search";
import { FORMATS, LANGUAGES } from "../lib/taxonomy";

const DESCRIPTION = `Find reference ads for a static ad concept. Use this after you have a
concept (hook, angle, format) and before you describe the layout.
Pass the concept in plain language. Returns up to 5 ads with a reason
each; days_running is a rough signal of what worked, not proof.`;

const server = new McpServer({ name: "refsearch", version: "0.1.0" });

server.registerTool(
  "search_references",
  {
    title: "Search reference ads",
    description: DESCRIPTION,
    inputSchema: {
      concept: z.string().min(1).describe("The ad concept in plain language: product, hook, angle, format, language"),
      format: z.enum(FORMATS).optional().describe("Only return ads in this format"),
      language: z.enum(LANGUAGES).optional().describe("Only return ads in this language"),
      limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe(`Number of ads to return (default ${DEFAULT_LIMIT})`),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ concept, format, language, limit }) => {
    try {
      const { results, stats } = await searchReferences(concept, { format, language, limit });
      const payload = {
        results: results.map((r) => ({
          id: r.id,
          brand: r.brand,
          reason: r.reason,
          tags: {
            hook_type: r.hook_type,
            format: r.format,
            offer: r.offer,
            language: r.language,
            product_visibility: r.product_visibility,
            text_density: r.text_density,
            has_person: r.has_person,
          },
          headline_text: r.headline_text,
          angle: r.angle,
          days_running: r.days_running,
          ad_library_url: r.ad_library_url,
        })),
        search_ms: stats.ms,
      };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    } catch (err) {
      console.error("search_references failed:", err);
      return { isError: true, content: [{ type: "text", text: `Search failed: ${(err as Error).message}` }] };
    }
  },
);

server
  .connect(new StdioServerTransport())
  .then(() => console.error("refsearch MCP server running on stdio"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
