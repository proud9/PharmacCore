import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { Prisma, type PrismaClient } from "@prisma/client";
import { base, withCrypto } from "./db";
import { requireUser, type CurrentUser } from "./auth";
import { can, homePath, type Capability } from "./capabilities";
import { READ_ONLY_MESSAGE, subscriptionState } from "./subscription";

/**
 * The tenant data layer: the only way pages and routes touch a business's data.
 *
 * Two locks work together here:
 * 1. Every query on a business-owned model gets `orgId` added to its `where` (OWNED below).
 * 2. Every query runs in a transaction that sets `app.org_id`, so Postgres row-level security
 *    (prisma/rls.sql) only returns this business's rows, and trade rows it is a party to.
 *
 * Use `t.db` for single queries and `t.tx(async (tx) => …)` for multi-step writes. Raw SQL
 * ($queryRaw) only sees rows inside `t.tx`, because only there is app.org_id set.
 * Creates must still pass `orgId: t.org.id` (Prisma's types require it; RLS rejects any other).
 */
export const OWNED = new Set<string>([
  "SubscriptionPayment",
  "Category",
  "Product",
  "Batch",
  "StockIntake",
  "StockTake",
  "StockTakeItem",
  "Patient",
  "Prescription",
  "PrescriptionItem",
  "Sale",
  "SaleItem",
  "AuditLog",
  "Contact",
  "Notification",
  "ProductLink",
]);

const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);

function scopeArgs(model: string | undefined, operation: string, args: unknown, orgId: string) {
  if (!model || !OWNED.has(model) || !WHERE_OPS.has(operation)) return args;
  const a = { ...(args as Record<string, unknown>) };
  a.where = { ...((a.where as object | undefined) ?? {}), orgId };
  return a;
}

function setOrg(client: { $executeRaw: PrismaClient["$executeRaw"] }, orgId: string) {
  return client.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
}

/** Owned-model scoping + encryption, without the per-query transaction (used inside `tx`). */
function scopedClient(orgId: string) {
  return withCrypto(base).$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          return query(scopeArgs(model, operation, args, orgId) as typeof args);
        },
      },
    },
  });
}

/** Wraps each top-level query in a transaction that sets app.org_id for row-level security. */
function rlsClient<C extends ReturnType<typeof scopedClient> | ReturnType<typeof withCrypto>>(client: C, orgId: string) {
  return client.$extends(
    Prisma.defineExtension((inner) =>
      inner.$extends({
        name: "tenant-rls",
        query: {
          $allModels: {
            async $allOperations({ args, query }) {
              const [, result] = await base.$transaction([setOrg(base, orgId), query(args)]);
              return result;
            },
          },
        },
      }),
    ),
  );
}

export function forOrg(orgId: string) {
  const scoped = scopedClient(orgId);
  const db = rlsClient(scoped, orgId);
  function tx<R>(fn: (tx: Tx) => Promise<R>, options?: { timeout?: number; maxWait?: number }) {
    return scoped.$transaction(
      async (client) => {
        await setOrg(client, orgId);
        return fn(client as unknown as Tx);
      },
      { timeout: options?.timeout ?? 15_000, maxWait: options?.maxWait ?? 10_000 },
    );
  }
  return { db: db as unknown as TenantDb, tx };
}

/**
 * Row-level security only, no owned-model scoping: for reading a connected seller's item list
 * (the "catalog" policy) and trade tables. Select names only (lib/trade.ts CATALOG_SELECT).
 */
export function partyDb(orgId: string) {
  return rlsClient(withCrypto(base), orgId) as unknown as TenantDb;
}

/** Same model API as the base client; the extensions don't change types. */
export type TenantDb = Omit<PrismaClient, "$transaction" | "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;
export type Tx = Prisma.TransactionClient;

export type Tenant = {
  user: CurrentUser;
  org: NonNullable<CurrentUser["org"]>;
  db: TenantDb;
  tx: <R>(fn: (tx: Tx) => Promise<R>, options?: { timeout?: number; maxWait?: number }) => Promise<R>;
  readOnly: boolean;
};

/** The signed-in business for this request, or null (Parallax team logins have none). */
export const getTenant = cache(async (): Promise<Tenant | null> => {
  const user = await requireUser();
  if (!user || !user.org) return null;
  const { db, tx } = forOrg(user.org.id);
  const readOnly = subscriptionState(user.org.kind, user.org.subscription).state === "READ_ONLY";
  return { user, org: user.org, db, tx, readOnly };
});

/** For pages: the business, or a redirect away (sign-in, or home if it lacks the capability). */
export async function pageTenant(capability?: Capability): Promise<Tenant> {
  const t = await getTenant();
  if (!t) {
    const user = await requireUser();
    if (user) redirect(homePath(user.role));
    redirect("/api/auth/signout");
  }
  if (capability && !can(t.org.kind, capability)) redirect("/dashboard");
  return t;
}

export type ApiAuth = { ok: true; t: Tenant } | { ok: false; response: NextResponse };

/**
 * For API routes: 401 when signed out, 403 without the capability, 403 for writes on a
 * read-only (lapsed) account. Pass `{ write: false }` for read-only GET routes.
 */
export async function apiTenant(capability?: Capability | Capability[], options: { write?: boolean } = {}): Promise<ApiAuth> {
  const t = await getTenant();
  if (!t) return { ok: false, response: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  const needed = capability === undefined ? [] : Array.isArray(capability) ? capability : [capability];
  if (needed.length && !needed.some((cap) => can(t.org.kind, cap))) {
    return { ok: false, response: NextResponse.json({ error: "Your account can't do that." }, { status: 403 }) };
  }
  if (options.write !== false && t.readOnly) {
    return { ok: false, response: NextResponse.json({ error: READ_ONLY_MESSAGE }, { status: 403 }) };
  }
  return { ok: true, t };
}

/** A business's record that isn't there, or isn't theirs: always 404, never "forbidden". */
export function notFound(what = "That record") {
  return NextResponse.json({ error: `${what} was not found.` }, { status: 404 });
}
