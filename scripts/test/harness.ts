/**
 * Small HTTP test harness for Parallax's end-to-end checks (no test framework needed).
 * A Client keeps one person's session cookie; check() records a pass or fail; every request is
 * timed so slow steps show up in the summary.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ensureProdBuild } from "../prod-build";
import { envForDatabase, pushSchema } from "../db";

export const ROOT = path.resolve(__dirname, "..", "..");
const NODE = process.execPath;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const TSX_BIN = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

/** Requests slower than this are listed as possible bottlenecks. */
export const SLOW_MS = 800;

type Result = { suite: string; name: string; ok: boolean; detail: string };
export const results: Result[] = [];
export const timings: { label: string; ms: number }[] = [];
let suite = "";

export function section(title: string) {
  console.log(`\n== ${title}`);
  suite = title;
}

export function check(name: string, ok: unknown, detail = "") {
  results.push({ suite, name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? `  [${detail}]` : ""}`);
}

/** A finding that is not pass/fail: a label or wording worth a human look. */
export const notes: string[] = [];
export function note(text: string) {
  if (!notes.includes(text)) notes.push(text);
}

export class Client {
  cookie: string | null = null;
  constructor(
    public base: string,
    public label: string,
  ) {}

  async req(method: string, url: string, body?: unknown, raw?: { data: BodyInit; type?: string }) {
    const headers: Record<string, string> = {};
    let data: BodyInit | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      data = JSON.stringify(body);
    }
    if (raw) {
      data = raw.data;
      if (raw.type) headers["Content-Type"] = raw.type;
    }
    if (this.cookie) headers.Cookie = `pharmacore_session=${this.cookie}`;
    const started = performance.now();
    const response = await fetch(this.base + url, { method, headers, body: data, redirect: "manual" });
    const text = await response.text();
    timings.push({ label: `${this.label} ${method} ${url.split("?")[0]}`, ms: Math.round(performance.now() - started) });
    for (const cookie of response.headers.getSetCookie()) {
      const match = /^pharmacore_session=([^;]*)/.exec(cookie);
      if (match) this.cookie = match[1] || null;
    }
    return { status: response.status, headers: response.headers, text };
  }

  async json<T = any>(method: string, url: string, body?: unknown): Promise<{ status: number; data: T }> {
    const { status, text } = await this.req(method, url, body);
    try {
      return { status, data: JSON.parse(text) };
    } catch {
      return { status, data: { _raw: text.slice(0, 200) } as T };
    }
  }

  /** GET a page, following redirects, including the ones streamed inside a 200 under loading.tsx. */
  async page(url: string): Promise<{ status: number; path: string; html: string }> {
    let current = url;
    for (let hop = 0; hop < 10; hop++) {
      const { status, headers, text } = await this.req("GET", current);
      if ([301, 302, 303, 307, 308].includes(status)) {
        current = (headers.get("location") ?? "/").replace(/^https?:\/\/[^/]+/, "");
        continue;
      }
      const streamed = /NEXT_REDIRECT;(?:replace|push);([^;]+);/.exec(text);
      if (status === 200 && streamed) {
        current = streamed[1];
        continue;
      }
      if (status === 200 && text.includes("NEXT_HTTP_ERROR_FALLBACK;404")) return { status: 404, path: current, html: text };
      return { status, path: current, html: text };
    }
    return { status: 0, path: current, html: "redirect loop" };
  }

  async login(email: string, password: string) {
    return this.json("POST", "/api/auth/login", { email, password });
  }
}

export async function signedIn(base: string, email: string, password: string) {
  const client = new Client(base, email.split("@")[0]);
  const { status, data } = await client.login(email, password);
  if (status !== 200) throw new Error(`Sign-in failed for ${email}: ${status} ${JSON.stringify(data)}`);
  return client;
}

/** The text a person would read on the page: no scripts, styles or tags. */
export function visibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function heading(html: string) {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  return match ? visibleText(match[1]) : "";
}

/** Raw codes and broken values that should never reach the screen. */
const RAW = /\b(INQUIRY|QUOTED|ORDERED|PREPARING|DISPATCHED|RECEIVED|DECLINED|CANCELLED|PENDING|DISPENSED|COMPLETED|PREPAY|ON_DELIVERY|CREDIT|WHOLESALER|RETAILER|MANUFACTURER|BANK_TRANSFER|CASH|CARD|INSURANCE|MEDICINE|EQUIPMENT|undefined|null|NaN|Invalid Date)\b/g;

/** Notes wording problems on a page: raw codes, "undefined", and retail words on wholesale screens. */
export function scanLabels(who: string, url: string, html: string, extraWords: RegExp[] = []) {
  const text = visibleText(html);
  const raw = [...new Set([...text.matchAll(RAW)].map((m) => m[1]))];
  if (raw.length) note(`${who} ${url}: shows raw value(s) ${raw.join(", ")}`);
  for (const word of extraWords) {
    const found = [...new Set([...text.matchAll(word)].map((m) => m[0]))];
    if (found.length) note(`${who} ${url}: wording "${found.join('", "')}"`);
  }
}

// ---------------------------------------------------------------------------------------------
// Disposable database + server

/**
 * Connection settings for a throwaway test database `parallax_test_<name>`, using the same
 * server, roles and passwords as .env (roles are shared by every database on a server).
 */
export function testEnv(name: string): NodeJS.ProcessEnv {
  return envForDatabase(`parallax_test_${name}`);
}

/** Drops and recreates the suite's database (schema + row-level security), optionally seeded. */
export async function freshDatabase(name: string, seed: boolean) {
  const env = testEnv(name);
  await pushSchema(env, { recreate: true, quiet: true });
  if (seed) {
    const run = spawnSync(NODE, [TSX_BIN, "prisma/seed.ts"], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
    if (run.status !== 0) throw new Error(`seed failed:\n${run.stdout}\n${run.stderr}`);
  }
  // The owner connection: for checks that look past row-level security.
  return { env, db: new PrismaClient({ datasourceUrl: env.DIRECT_URL }) };
}

/** Runs a script (tsx) against the suite's database. */
export function runScript(env: NodeJS.ProcessEnv, script: string, args: string[] = []) {
  return spawnSync(NODE, [TSX_BIN, script, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
}

const DIST_DIR = ".next-test";

/** Builds into .next-test when it is missing or older than the code (see scripts/prod-build.ts). */
export function ensureBuild(force: boolean) {
  ensureProdBuild(DIST_DIR, force);
}

export async function startServer(env: NodeJS.ProcessEnv, port: number): Promise<ChildProcess> {
  const server = spawn(NODE, [NEXT_BIN, "start", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, ...env, COOKIE_SECURE: "false", NODE_ENV: "production", NEXT_DIST_DIR: DIST_DIR },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout?.on("data", (chunk) => (log += chunk));
  server.stderr?.on("data", (chunk) => (log += chunk));
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/login`, { redirect: "manual" });
      if (response.status < 500) return server;
    } catch {
      // not up yet
    }
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error(`Server on port ${port} did not start:\n${log}`);
}

export function summary() {
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length} passed, ${fails.length} failed`);
  for (const f of fails) console.log(`  FAIL [${f.suite}] ${f.name}  ${f.detail}`);

  const slow = [...timings].sort((a, b) => b.ms - a.ms).filter((t) => t.ms >= SLOW_MS);
  console.log(`\nSlowest requests (${timings.length} timed):`);
  for (const t of [...timings].sort((a, b) => b.ms - a.ms).slice(0, 8)) console.log(`  ${String(t.ms).padStart(5)} ms  ${t.label}`);
  if (slow.length) console.log(`  ${slow.length} request(s) took ${SLOW_MS} ms or more.`);

  if (notes.length) {
    console.log(`\nWording to review (${notes.length}):`);
    for (const n of notes) console.log(`  - ${n}`);
  }
  return fails.length;
}

export const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
