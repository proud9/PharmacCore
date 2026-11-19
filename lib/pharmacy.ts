import { cache } from "react";
import { db } from "./db";

/** The single Pharmacy row, read once per request however many layouts and pages ask for it. */
export const getPharmacy = cache(() => db.pharmacy.findUnique({ where: { id: "main" } }));
