import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Field encryption at rest (AES-256-GCM). Encrypted values look like `enc:1:<iv>:<tag>:<data>`
 * (base64url parts); the number is the key version so the key can be rotated later.
 *
 * What this protects: database files, dumps and backups. It does not hide data from whoever runs
 * the server, which holds DATA_KEY; row-level security and the admin connection role cover that.
 *
 * Which fields are encrypted lives in ENCRYPTED_FIELDS; lib/db.ts applies it on every write and
 * read, so pages and routes use plain values.
 */
export const ENCRYPTED_FIELDS: Record<string, readonly string[]> = {
  Organization: ["licenceNo", "tpin", "bankName", "accountName", "accountNumber", "bankBranch", "swiftCode"],
  Contact: ["phone", "email", "tpin", "notes"],
  Patient: ["dateOfBirth", "phone", "email", "address", "allergies", "insurance", "notes"],
  TradeOrder: ["sellerNotes", "buyerNotes"],
};

const ALL_FIELDS = new Set(Object.values(ENCRYPTED_FIELDS).flat());
const PREFIX = "enc:1:";

let cachedKey: Buffer | null = null;
function key() {
  if (cachedKey) return cachedKey;
  const raw = process.env.DATA_KEY;
  if (!raw) throw new Error("DATA_KEY is not set (32 random bytes, base64). See .env.example.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("DATA_KEY must be 32 bytes, base64-encoded.");
  cachedKey = buf;
  return buf;
}

export function seal(value: string): string {
  if (value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`;
}

export function open(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const [iv, tag, data] = value.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Encrypts the model's sensitive fields in a create/update `data` object (top level only). */
export function sealData(model: string, data: unknown): unknown {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((row) => sealData(model, row));
  const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const field of fields) {
    const value = copy[field];
    if (typeof value === "string" && value !== "") copy[field] = seal(value);
    else if (value && typeof value === "object" && "set" in value && typeof (value as { set: unknown }).set === "string") {
      copy[field] = { set: seal((value as { set: string }).set) };
    }
  }
  return copy;
}

/** Decrypts any encrypted field anywhere in a query result (handles includes and lists). */
export function openResult<T>(result: T): T {
  if (!result || typeof result !== "object") return result;
  if (result instanceof Date) return result;
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i++) result[i] = openResult(result[i]);
    return result;
  }
  const row = result as Record<string, unknown>;
  for (const [field, value] of Object.entries(row)) {
    if (typeof value === "string") {
      if (ALL_FIELDS.has(field) && value.startsWith(PREFIX)) row[field] = open(value);
    } else if (value && typeof value === "object") {
      row[field] = openResult(value);
    }
  }
  return result;
}
