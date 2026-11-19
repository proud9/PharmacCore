/**
 * Runs Parallax for a live demo on the local network, on its own database (prisma/demo.db) so
 * dev data is untouched. Other computers on the same Wi-Fi/LAN open the address it prints.
 *
 *   npm run demo              start (creates an empty installation the first time)
 *   npm run demo -- --reset   wipe the demo and start again from an empty installation
 *   npm run demo -- --seed    start from the demo data instead (sample stock, orders, logins)
 *   npm run demo -- --build   rebuild first (after code changes)
 *   npm run demo -- --port 8080
 *
 * The first person to open it on an empty installation sets up the wholesale at /setup.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const NODE = process.execPath;
const bin = (...p: string[]) => path.join(ROOT, "node_modules", ...p);
const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const port = portArg >= 0 ? Number(args[portArg + 1]) : 3000;
const DB_FILE = "demo.db";
const dbPath = path.join(ROOT, "prisma", DB_FILE);
const env = { ...process.env, DATABASE_URL: `file:./${DB_FILE}`, COOKIE_SECURE: "false", NODE_ENV: "production" as const };

function run(label: string, cmd: string[]) {
  console.log(`• ${label}`);
  const result = spawnSync(NODE, cmd, { cwd: ROOT, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (args.includes("--reset") || args.includes("--seed")) {
  for (const suffix of ["", "-journal"]) if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix);
}
if (!existsSync(dbPath)) {
  run("Creating the demo database (prisma/demo.db)", [bin("prisma", "build", "index.js"), "db", "push", "--skip-generate"]);
  if (args.includes("--seed")) run("Loading demo data", [bin("tsx", "dist", "cli.mjs"), "prisma/seed.ts"]);
}
if (args.includes("--build") || !existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
  run("Building the app", [bin("next", "dist", "bin", "next"), "build"]);
}

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
server.on("exit", (code) => process.exit(code ?? 0));
