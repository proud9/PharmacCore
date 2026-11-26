import { PrismaClient } from "@prisma/client";
import { ENCRYPTED_FIELDS, openResult, sealData } from "./crypto";

/**
 * Database clients.
 * - `db`: the app's connection (role parallax_app). Use it for platform tables (Organization, User,
 *   DemoRequest…). Tenant tables read through it return nothing: row-level security needs a
 *   business set, which only lib/tenant.ts does.
 * - `adminDb()`: the Parallax team's connection (role parallax_admin). It has no grants on
 *   tenant tables, so the admin area cannot read a business's stock, quotes or invoices.
 * Both encrypt and decrypt the fields in lib/crypto.ts ENCRYPTED_FIELDS transparently.
 */

const log: ("error" | "warn")[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

export function withCrypto(client: PrismaClient) {
  return client.$extends({
    name: "crypto",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model in ENCRYPTED_FIELDS) {
            const a = args as Record<string, unknown>;
            if ("data" in a) a.data = sealData(model, a.data);
            if (operation === "upsert") {
              a.create = sealData(model, a.create);
              a.update = sealData(model, a.update);
            }
          }
          return openResult(await query(args));
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient; prismaAdmin?: PrismaClient };

/** The raw app connection, without encryption. Only lib/tenant.ts and lib/db.ts use it. */
export const base = globalForPrisma.prismaBase ?? new PrismaClient({ log });
if (process.env.NODE_ENV !== "production") globalForPrisma.prismaBase = base;

export const db = withCrypto(base);
export type Db = typeof db;

let admin: ReturnType<typeof withCrypto> | null = null;
export function adminDb() {
  if (admin) return admin;
  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) throw new Error("ADMIN_DATABASE_URL is not set. See .env.example.");
  const client = globalForPrisma.prismaAdmin ?? new PrismaClient({ log, datasourceUrl: url });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prismaAdmin = client;
  admin = withCrypto(client);
  return admin;
}
