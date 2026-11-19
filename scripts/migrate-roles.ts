/**
 * One-off: moves users off the removed roles onto the wholesale roles.
 * WHOLESALE_ADMIN, PHARMACIST, TECHNICIAN, CASHIER and INVENTORY all become SALES.
 * An administrator can then make anyone FINANCE on the Staff page.
 * Run with: npx tsx scripts/migrate-roles.ts   (safe to run more than once)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const LEGACY = ["WHOLESALE_ADMIN", "PHARMACIST", "TECHNICIAN", "CASHIER", "INVENTORY"];

async function main() {
  const moved = await db.user.findMany({ where: { role: { in: LEGACY } }, select: { id: true, email: true, role: true } });
  if (moved.length === 0) {
    console.log("No users on old roles.");
    return;
  }
  await db.$transaction([
    db.user.updateMany({ where: { role: { in: LEGACY } }, data: { role: "SALES" } }),
    db.auditLog.create({
      data: {
        action: "ROLES_MIGRATED",
        entity: "User",
        details: moved.map((user) => `${user.email}: ${user.role} → SALES`).join("; ").slice(0, 2000),
      },
    }),
  ]);
  for (const user of moved) console.log(`${user.email}: ${user.role} → SALES`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
