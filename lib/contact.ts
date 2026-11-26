/**
 * Parallax's own company details for the landing page footer and the legal pages.
 * Placeholders until real ones are known. Social links stay hidden while their URL is null.
 */
export const CONTACT = {
  address: null as string | null,
  phone: "+260 000 000 000",
  email: "hello@example.com",
  website: "www.example.com",
};

/**
 * Where businesses pay their Parallax subscription, shown on the Billing page and on receipts.
 * Placeholders until the real account is opened; a null field shows as "To be added".
 */
export const BILLING_DETAILS = {
  bankName: null as string | null,
  accountName: "Parallax",
  accountNumber: null as string | null,
  branch: null as string | null,
  mobileMoney: null as string | null,
};

export const SOCIAL_LINKS: Record<"linkedin" | "facebook" | "instagram" | "x", string | null> = {
  linkedin: null,
  facebook: null,
  instagram: null,
  x: null,
};
