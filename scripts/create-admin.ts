/**
 * Creates a Parallax team (ADMIN) login. There is no public way to make one.
 *   npm run admin:create -- --email you@parallax.example --name "Your Name"
 * Prints a temporary password, which must be changed at first sign-in.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./db";
import { temporaryPassword } from "../lib/passwords";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  loadEnv();
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
