import { db } from "./db";

/**
 * One Parallax installation runs one wholesale. It counts as set up once an administrator
 * exists. Until then the landing page sends sign-ups to the wholesale set-up (/setup), and
 * customer (buyer) sign-up stays closed because there is no wholesale to order from.
 */
export async function isSetUp() {
  return (await db.user.count({ where: { role: "ADMIN" } })) > 0;
}

/** What a newly set-up wholesale still needs, for the "Finish setting up" reminder. */
export async function setupGaps() {
  const pharmacy = await db.pharmacy.findUnique({ where: { id: "main" } });
  return {
    logo: !pharmacy?.logoPath,
    bank: !(pharmacy?.bankName && pharmacy?.accountNumber),
  };
}

export { BANK_DETAILS_NOTE } from "./bank-note";
