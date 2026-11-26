/**
 * Runs Parallax for a live demo on the local network, on its own Postgres database
 * (parallax_demo) so dev data is untouched. Other computers on the same Wi-Fi/LAN open the address it prints.
 *
 *   npm run demo              start (creates an empty installation the first time)
 *   npm run demo -- --reset   wipe the demo and start again from an empty installation
 *   npm run demo -- --seed    start from the demo data instead (sample stock, orders, logins)
 *   npm run demo -- --build   force a rebuild (it rebuilds by itself when the code has changed)
 *   npm run demo -- --port 8080
 *
 * On an empty installation, businesses sign up at /signup; create a Parallax team login with
 * `npm run admin:create` (pointed at the demo database) if you need one.
 */
import { spawn, spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { ensureProdBuild } from "./prod-build";
import { envForDatabase, pushSchema } from "./db";

const ROOT = path.resolve(__dirname, "..");
const NODE = process.execPath;
const bin = (...p: string[]) => path.join(ROOT, "node_modules", ...p);
const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const port = portArg >= 0 ? Number(args[portArg + 1]) : 3000;
const DIST_DIR = ".next-demo";
const env = { ...process.env, ...envForDatabase("parallax_demo"), COOKIE_SECURE: "false", NODE_ENV: "production" as const, NEXT_DIST_DIR: DIST_DIR };

function run(label: string, cmd: string[]) {
  console.log(`• ${label}`);
  const result = spawnSync(NODE, cmd, { cwd: ROOT, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function prepare() {
  const fresh = args.includes("--reset") || args.includes("--seed");
  console.log("• Preparing the demo database (parallax_demo)");
  await pushSchema(env, { recreate: fresh, quiet: true });
  if (args.includes("--seed")) run("Loading demo data", [bin("tsx", "dist", "cli.mjs"), "prisma/seed.ts"]);
}
// Its own build folder, rebuilt when the code changes; `npm run dev` can't break it.
ensureProdBuild(DIST_DIR, args.includes("--build"));

prepare().then(start);

function start() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal)
    .map((a) => a!.address);

  const server = spawn(NODE, [bin("next", "dist", "bin", "next"), "start", "-H", "0.0.0.0", "-p", String(port)], { cwd: ROOT, env, stdio: "inherit" });

  console.log("\nParallax demo is starting. Open it from other computers on this network at:");
  for (const address of addresses) console.log(`   http://${address}:${port}`);
  console.log(`   (on this computer: http://localhost:${port})`);
  console.log("Keep this window open. Press Ctrl+C to stop.\n");

  // Keep a Mac awake while the demo runs (the display may still sleep).
  if (process.platform === "darwin") spawn("caffeinate", ["-i", "-w", String(server.pid)], { stdio: "ignore" });

  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.kill(signal));
  server.on("exit", (code, signal) => {
    if (code && !signal) {
      console.error(`\nThe demo server stopped (exit code ${code}). If the message above mentions the build, run: npm run demo -- --build`);
      console.error(`If it says the port is in use, close the other server or run: npm run demo -- --port 3001`);
    }
    process.exit(code ?? 0);
  });
}
