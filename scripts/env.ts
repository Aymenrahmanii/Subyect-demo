import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Project root, independent of the cwd (the MCP server is launched by Claude Code). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// quiet: dotenv otherwise logs to stdout, which would corrupt the MCP stdio stream.
config({ path: path.join(ROOT, ".env.local"), quiet: true });

export const DATA_DIR = path.join(ROOT, "data");
export const TAGS_DIR = path.join(DATA_DIR, "tags");
export const ADS_CSV = path.join(DATA_DIR, "ads.csv");
