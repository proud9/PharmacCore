/**
 * Serves the installation a test suite left behind, to look around after `npm test`.
 *   npx tsx scripts/serve-test.ts workflow   (port 3200; .claude/launch.json "parallax-test")
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { testEnv } from "./test/harness";

const name = process.argv[2] ?? "workflow";
const env = testEnv(name);
const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
spawn(process.execPath, [next, "start", "-p", "3200"], {
  stdio: "inherit",
  env: { ...process.env, ...env, NEXT_DIST_DIR: ".next-test", COOKIE_SECURE: "false", NODE_ENV: "production" },
});
