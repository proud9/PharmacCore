import { z } from "zod";
import { ORG_KINDS } from "./capabilities";

/** A private contact: a customer or supplier for documents, often not on Parallax. */
export const contactSchema = z.object({
  role: z.enum(["CUSTOMER", "SUPPLIER"]),
  kind: z.enum(ORG_KINDS),
  name: z.string().trim().min(2, "Enter the name.").max(150),
  town: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(254).optional(),
  tpin: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export function contactData(data: z.infer<typeof contactSchema>) {
  return {
    role: data.role,
    kind: data.kind,
    name: data.name,
    town: data.town || null,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    tpin: data.tpin || null,
    notes: data.notes || null,
  };
}

