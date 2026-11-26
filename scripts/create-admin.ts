/**
 * Creates a Parallax team (ADMIN) login. There is no public way to make one.
 *   npm run admin:create -- --email you@parallax.example --name "Your Name"
 *   npm run demo:admin -- --email team@demo.local --name "Parallax Team"   (the LAN demo's database)
 * Prints a temporary password, which must be changed at first sign-in.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { envForDatabase, loadEnv } from "./db";
import { temporaryPassword } from "../lib/passwords";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  loadEnv();
  // --demo: the LAN demo's own database (scripts/demo.ts), not the one in .env.
  if (process.argv.includes("--demo")) Object.assign(process.env, envForDatabase("parallax_demo"));
  const email = arg("email")?.toLowerCase();
  const name = arg("name");
  if (!email || !name) {
    console.log('Usage: npm run admin:create -- --email you@parallax.example --name "Your Name"');
    process.exit(1);
  }
  const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  const password = arg("password") ?? temporaryPassword();
  try {
    await db.user.create({
      data: { email, name, role: "ADMIN", passwordHash: await bcrypt.hash(password, 10), mustChangePassword: !arg("password") },
    });
    console.log(`Created Parallax team login ${email}. Temporary password: ${password}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
