// scripts/prettier-hook.js
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { resolve, extname, dirname } from "path";
import { fileURLToPath } from "url";

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
  ".md",
  ".yaml",
  ".yml",
]);

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRETTIER_BIN = resolve(PROJECT_ROOT, "node_modules/.bin/prettier");

const input = JSON.parse(
  await new Promise((r) => {
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => r(d));
  }),
);

const filePath =
  input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!filePath) process.exit(0);

// Resolve to absolute and verify it's real file, not a path traversal
const resolved = resolve(filePath);
if (!existsSync(resolved)) process.exit(0);

// Ensure the file is within the project root
if (!resolved.startsWith(PROJECT_ROOT + "/")) process.exit(0);

// Only process allowed file extensions
if (!ALLOWED_EXTENSIONS.has(extname(resolved))) process.exit(0);

// Use execFile not exec — args are passed directly, no shell interpolation
// Use direct binary path instead of npx to avoid PATH shadowing
try {
  execFileSync(PRETTIER_BIN, ["--write", resolved], { stdio: "inherit" });
} catch {
  process.exit(0);
}
