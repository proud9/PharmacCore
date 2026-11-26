/**
 * Takes the screenshots for the in-app guides (public/guide/*.jpg) from real screens.
 *
 *   npx tsx scripts/guide-shots.ts            (builds .next-test first if the code changed)
 *
 * It seeds a throwaway database (parallax_test_guide) with the demo data, serves the production
 * build on port 3300, moves a few demo orders along so every step has something to show, and
 * captures each screen at 1280×800, 2× pixel density, with headless Google Chrome (driven over the
 * DevTools protocol; no extra npm packages). Re-run it whenever a pictured screen changes.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client, ROOT, ensureBuild, freshDatabase, startServer } from "./test/harness";

const PORT = 3300;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(ROOT, "public", "guide");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PASSWORD = "Parallax2026!";
const WIDTH = 1280;
const HEIGHT = 800;

// ---------------------------------------------------------------------------------------------
// A minimal DevTools-protocol client.

class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private waiters: { method: string; resolve: () => void }[] = [];
  constructor(private ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else if (msg.method) {
        this.waiters = this.waiters.filter((w) => (w.method === msg.method ? (w.resolve(), false) : true));
      }
    });
  }
  static async connect(url: string) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new Cdp(ws);
  }
  send<T = any>(method: string, params: object = {}): Promise<T> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  once(method: string, timeoutMs = 15_000) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      this.waiters.push({ method, resolve: () => (clearTimeout(timer), resolve()) });
    });
  }
  async evaluate<T = unknown>(expression: string): Promise<T> {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return result.result?.value as T;
  }
  close() {
    this.ws.close();
  }
}

async function launchChrome(): Promise<{ chrome: ChildProcess; page: Cdp; profile: string }> {
  const profile = mkdtempSync(path.join(os.tmpdir(), "parallax-shots-"));
  const debugPort = 9333;
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${WIDTH},${HEIGHT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let pageUrl = "";
  for (let i = 0; i < 60 && !pageUrl; i++) {
    try {
      const targets = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      pageUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? "";
    } catch {
      // Chrome is still starting.
    }
    if (!pageUrl) await new Promise((r) => setTimeout(r, 250));
  }
  if (!pageUrl) throw new Error(`Could not start Chrome at ${CHROME} (set CHROME_PATH).`);
  const page = await Cdp.connect(pageUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  await page.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: false });
  // Motion off, so every capture is a still, settled frame.
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  return { chrome, page, profile };
}

// ---------------------------------------------------------------------------------------------

type Shot = {
  file: string;
  who: string;
  path: string | (() => string);
  /** Scroll so the first heading containing this text sits near the top. */
  focus?: string;
};

async function main() {
  ensureBuild(process.argv.includes("--build"));
  console.log("Seeding parallax_test_guide…");
  const { env, db } = await freshDatabase("guide", true);
  const server = await startServer(env, PORT);
  const { chrome, page, profile } = await launchChrome();
  mkdirSync(OUT, { recursive: true });

  const people = new Map<string, Client>();
  async function as(email: string) {
    if (!people.has(email)) {
      const client = new Client(BASE, email.split("@")[0]);
      const { status } = await client.login(email, PASSWORD);
      if (status !== 200) throw new Error(`Sign-in failed for ${email}`);
      people.set(email, client);
    }
    return people.get(email)!;
  }

  const org = (name: string) => db.organization.findFirstOrThrow({ where: { name } });
  const [zpi, kilmers] = await Promise.all([org("Zambia Pharma Industries"), org("Kilmer's Medical Wholesale")]);
  const orderWhere = (status: string, buyerName: string) =>
    db.tradeOrder.findFirstOrThrow({ where: { status, buyerName }, include: { items: true } });
  const closed = await orderWhere("CLOSED", "Lusaka Central Pharmacy");
  const inquiry = await orderWhere("INQUIRY", "Lusaka Central Pharmacy");
  const quoted = await orderWhere("QUOTED", "University Teaching Hospital");
  const onTheWay = await orderWhere("DISPATCHED", "Kilmer's Medical Wholesale");

  async function capture(shot: Shot) {
    const client = await as(shot.who);
    await page.send("Network.clearBrowserCookies");
    await page.send("Network.setCookie", { name: "pharmacore_session", value: client.cookie, domain: "localhost", path: "/" });
    const url = BASE + (typeof shot.path === "function" ? shot.path() : shot.path);
    const loaded = page.once("Page.loadEventFired");
    await page.send("Page.navigate", { url });
    await loaded;
    await page.evaluate("document.fonts.ready.then(() => true)");
    await new Promise((r) => setTimeout(r, 900));
    if (shot.focus) {
      const found = await page.evaluate<boolean>(`(() => {
        const el = [...document.querySelectorAll("main h1, main h2, main h3, main legend")].find((e) => e.textContent.includes(${JSON.stringify(shot.focus)}));
        if (!el) return false;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96);
        return true;
      })()`);
      if (!found) console.warn(`  ! "${shot.focus}" not found on ${url}`);
      await new Promise((r) => setTimeout(r, 300));
    }
    const { data } = await page.send<{ data: string }>("Page.captureScreenshot", { format: "jpeg", quality: 80 });
    writeFileSync(path.join(OUT, `${shot.file}.jpg`), Buffer.from(data, "base64"));
    console.log(`  ${shot.file}.jpg  ${url.replace(BASE, "")}`);
  }

  const zpiMail = "zpi@parallax.local";
  const kilmersMail = "kilmers@parallax.local";
  const centralMail = "central@parallax.local";
  const uthMail = "uth@parallax.local";
  const teamMail = "team@parallax.local";

  try {
    console.log("Capturing:");
    // Home screens
    await capture({ file: "home-manufacturer", who: zpiMail, path: "/dashboard" });
    await capture({ file: "home-wholesaler", who: kilmersMail, path: "/dashboard" });
    await capture({ file: "home-retailer", who: centralMail, path: "/dashboard" });
    await capture({ file: "home-client", who: uthMail, path: "/dashboard" });

    // Connecting
    await capture({ file: "directory", who: centralMail, path: "/directory" });
    await capture({ file: "customers", who: kilmersMail, path: "/customers" });
    await capture({ file: "suppliers", who: centralMail, path: "/suppliers" });

    // Items offered to buyers
    await capture({ file: "items-manufacturer", who: zpiMail, path: "/items" });

    // Buying: inquiry from a supplier's item list
    await capture({ file: "inquiry-builder", who: centralMail, path: `/suppliers/${kilmers.id}` });
    await capture({ file: "inquiry-builder-wholesaler", who: kilmersMail, path: `/suppliers/${zpi.id}` });

    // Selling: answer an inquiry with a quote
    await capture({ file: "orders-list", who: kilmersMail, path: "/orders" });
    await capture({ file: "quote-form", who: kilmersMail, path: `/orders/${inquiry.id}`, focus: "Send a quotation" });

    // Buyer accepts the quote (picture first, then do it)
    await capture({ file: "accept-quote", who: uthMail, path: `/purchases/${quoted.id}`, focus: "Accept the quote" });
    const accepted = await (await as(uthMail)).json("POST", `/api/trade/orders/${quoted.id}`, { action: "ACCEPT" });
    if (accepted.status !== 200) throw new Error(`accept failed: ${JSON.stringify(accepted.data)}`);

    // Seller invoices and dispatches
    await capture({ file: "invoice-dispatch", who: kilmersMail, path: `/orders/${quoted.id}`, focus: "Issue the invoice" });

    // Buyer confirms a delivery (picture first, then do it), then completes the delivery queue
    await capture({ file: "receive", who: kilmersMail, path: `/purchases/${onTheWay.id}`, focus: "Confirm what arrived" });
    const received = await (await as(kilmersMail)).json("POST", `/api/trade/orders/${onTheWay.id}`, {
      action: "RECEIVE",
      lines: onTheWay.items.map((line) => ({ id: line.id, qtyReceived: line.qtyDispatched ?? line.quantity })),
    });
    if (received.status !== 200) throw new Error(`receive failed: ${JSON.stringify(received.data)}`);
    await capture({ file: "delivery-queue", who: kilmersMail, path: "/inventory", focus: "Waiting from deliveries" });
    await capture({ file: "inventory", who: centralMail, path: "/inventory" });
    await capture({ file: "stock-take", who: centralMail, path: "/stock-take" });

    // Money and documents
    await capture({ file: "order-closed", who: kilmersMail, path: `/orders/${closed.id}` });
    await capture({ file: "payments", who: kilmersMail, path: "/payments" });
    await capture({ file: "document-quotation", who: kilmersMail, path: `/documents/${closed.id}/quotation` });
    await capture({ file: "document-invoice", who: kilmersMail, path: `/documents/${closed.id}/invoice` });
    await capture({ file: "purchases-client", who: uthMail, path: "/purchases" });

    // Retail counter
    await capture({ file: "pos", who: centralMail, path: "/pos" });
    await capture({ file: "prescriptions", who: centralMail, path: "/prescriptions" });
    await capture({ file: "reports", who: centralMail, path: "/reports" });

    // Settings and notifications
    await capture({ file: "settings", who: kilmersMail, path: "/settings" });
    await capture({ file: "notifications", who: kilmersMail, path: "/notifications" });

    // Parallax team
    await capture({ file: "team-overview", who: teamMail, path: "/admin" });
    await capture({ file: "team-businesses", who: teamMail, path: "/admin/businesses" });
    await capture({ file: "team-business", who: teamMail, path: `/admin/businesses/${kilmers.id}` });
    await capture({ file: "team-announcements", who: teamMail, path: "/admin/announcements" });
    await capture({ file: "team-demo-requests", who: teamMail, path: "/admin/demo-requests" });
    console.log(`Saved to ${path.relative(ROOT, OUT)}/`);
  } finally {
    page.close();
    const exited = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill();
    await exited;
    server.kill();
    await db.$disconnect();
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
