/**
 * Database set-up for Postgres: creates the database and the two connection roles if needed,
 * pushes the Prisma schema, then applies row-level security (prisma/rls.sql).
 *
 *   npx tsx scripts/db.ts push      (npm run db:push)
 *
 * Reads DIRECT_URL (owner), DATABASE_URL (role parallax_app) and ADMIN_DATABASE_URL
 * (role parallax_admin) from the environment / .env. The role passwords come from those URLs.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export function loadEnv() {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
    }
  } catch {
    // No .env: rely on the environment.
  }
}

/** The three connection settings from .env, pointed at another database on the same server. */
export function envForDatabase(database: string): NodeJS.ProcessEnv {
  loadEnv();
  const swap = (url: string | undefined) => {
    if (!url) throw new Error("DATABASE_URL, ADMIN_DATABASE_URL and DIRECT_URL must be set (see .env.example).");
    const parsed = new URL(url);
    parsed.pathname = `/${database}`;
    return parsed.toString();
  };
  return {
    DIRECT_URL: swap(process.env.DIRECT_URL),
    DATABASE_URL: swap(process.env.DATABASE_URL),
    ADMIN_DATABASE_URL: swap(process.env.ADMIN_DATABASE_URL),
  } as unknown as NodeJS.ProcessEnv;
}

function need(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Creates the database named in `ownerUrl` if it doesn't exist (connecting to `postgres`). */
export async function ensureDatabase(ownerUrl: string, recreate = false) {
  const url = new URL(ownerUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = "/postgres";
  const server = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    if (recreate) await server.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${quoteIdent(name)} WITH (FORCE)`);
    const found = await server.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM pg_database WHERE datname = ${quoteLiteral(name)}`,
    );
    if (Number(found[0].n) === 0) await server.$executeRawUnsafe(`CREATE DATABASE ${quoteIdent(name)}`);
  } finally {
    await server.$disconnect();
  }
}

async function ensureRole(owner: PrismaClient, roleUrl: string) {
  const url = new URL(roleUrl);
  const role = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const found = await owner.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM pg_roles WHERE rolname = ${quoteLiteral(role)}`,
  );
  const verb = Number(found[0].n) === 0 ? "CREATE" : "ALTER";
  await owner.$executeRawUnsafe(`${verb} ROLE ${quoteIdent(role)} WITH LOGIN PASSWORD ${quoteLiteral(password)} NOSUPERUSER NOBYPASSRLS`);
}

/** Schema push + roles + row-level security, against the database in `env` (DIRECT_URL etc.). */
export async function pushSchema(env: NodeJS.ProcessEnv = process.env, options: { recreate?: boolean; quiet?: boolean } = {}) {
  const ownerUrl = env.DIRECT_URL!;
  await ensureDatabase(ownerUrl, options.recreate);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: options.quiet ? "ignore" : "inherit",
    env: { ...process.env, ...env },
  });
  const owner = new PrismaClient({ datasourceUrl: ownerUrl });
  try {
    await ensureRole(owner, env.DATABASE_URL!);
    await ensureRole(owner, env.ADMIN_DATABASE_URL!);
    const sql = readFileSync(path.join(process.cwd(), "prisma", "rls.sql"), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(/;\s*\n/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of sql) await owner.$executeRawUnsafe(statement);
  } finally {
    await owner.$disconnect();
  }
}

async function main() {
  loadEnv();
  const command = process.argv[2];
  if (command === "push") {
    need("DIRECT_URL");
    need("DATABASE_URL");
    need("ADMIN_DATABASE_URL");
    await pushSchema(process.env, { recreate: process.argv.includes("--reset") });
    console.log("Database ready: schema pushed, roles and row-level security applied.");
  } else {
    console.log("Usage: tsx scripts/db.ts push [--reset]");
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("db.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
