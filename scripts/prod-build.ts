/**
 * Production builds for `npm run demo` and `npm test`, each in its own folder (`.next-demo`,
 * `.next-test`). `npm run dev` writes to `.next`, so it can no longer overwrite the build these
 * servers run from (which made `next start` crash with "routesManifest.dataRoutes is not iterable").
 * A build is redone automatically when any source file is newer than it.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(__dirname, "..");
export const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const SOURCES = ["app", "components", "lib", "prisma/schema.prisma", "public", "middleware.ts", "next.config.ts", "tailwind.config.ts", "package.json"];

function newestChange(target: string): number {
  if (!existsSync(target)) return 0;
  const info = statSync(target);
  if (!info.isDirectory()) return info.mtimeMs;
  let newest = info.mtimeMs;
  for (const entry of readdirSync(target)) newest = Math.max(newest, newestChange(path.join(target, entry)));
  return newest;
}

/** A complete production build in `distDir` that is newer than every source file. */
function isCurrent(distDir: string) {
  const buildId = path.join(ROOT, distDir, "BUILD_ID");
  const manifest = path.join(ROOT, distDir, "prerender-manifest.json");
  if (!existsSync(buildId) || !existsSync(manifest)) return false;
  const built = statSync(buildId).mtimeMs;
  return SOURCES.every((source) => newestChange(path.join(ROOT, source)) <= built);
}

export function ensureProdBuild(distDir: string, force = false) {
  if (!force && isCurrent(distDir)) return;
  console.log(`• Building the app into ${distDir} (about a minute)…`);
  const build = spawnSync(process.execPath, [NEXT_BIN, "build"], {
    cwd: ROOT,
    env: { ...process.env, NEXT_DIST_DIR: distDir, NODE_ENV: "production" },
    stdio: "inherit",
  });
  if (build.status !== 0) throw new Error("Build failed");
}
