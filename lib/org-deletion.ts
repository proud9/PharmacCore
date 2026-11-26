import { subDays } from "date-fns";
import { adminDb } from "./db";
import { forOrg } from "./tenant";

/**
 * Deleting a business: status DELETED, logins switched off at once. After DELETE_RETENTION_DAYS
 * its own records (items, stock, patients, counter sales, contacts, activity log) are erased.
 * Orders with other businesses are kept: they belong to the other side's history too, and carry
 * the deleted business's name as it was. Runs when the admin Businesses page loads (no scheduler).
 */
export const DELETE_RETENTION_DAYS = 30;

export async function purgeDeletedOrgs(now = new Date()) {
  const due = await adminDb().organization.findMany({
    where: { status: "DELETED", deletedAt: { lte: subDays(now, DELETE_RETENTION_DAYS) }, name: { not: { startsWith: "[erased]" } } },
    select: { id: true, name: true },
  });
  for (const org of due) {
    await forOrg(org.id).tx(
      async (tx) => {
        await tx.saleItem.deleteMany({});
        await tx.sale.deleteMany({});
        await tx.prescriptionItem.deleteMany({});
        await tx.prescription.deleteMany({});
        await tx.patient.deleteMany({});
        await tx.stockTakeItem.deleteMany({});
        await tx.stockTake.deleteMany({});
        await tx.stockIntake.deleteMany({});
        await tx.batch.deleteMany({});
        await tx.productLink.deleteMany({});
        await tx.product.deleteMany({});
        await tx.category.deleteMany({});
        await tx.contact.deleteMany({});
        await tx.notification.deleteMany({});
        await tx.auditLog.deleteMany({});
      },
      { timeout: 120_000 },
    );
    await adminDb().organization.update({
      where: { id: org.id },
      data: {
        name: `[erased] ${org.name}`,
        listed: false,
        phone: null,
        email: null,
        address: null,
        licenceNo: null,
        tpin: null,
        bankName: null,
        accountName: null,
        accountNumber: null,
        bankBranch: null,
        swiftCode: null,
      },
    });
  }
  return due.length;
}
