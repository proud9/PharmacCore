import { z } from "zod";

/** An item's catalogue details (no stock): used by manufacturers' item lists and any seller. */
export const catalogItemSchema = z.object({
  sku: z.string().trim().min(1, "Enter a stock code.").max(40),
  name: z.string().trim().min(2, "Enter the item name.").max(200),
  genericName: z.string().trim().max(200).optional(),
  form: z.string().trim().max(60).optional(),
  strength: z.string().trim().max(60).optional(),
  unit: z.string().trim().min(1, "Enter the pack size.").max(60),
  sellingPrice: z.number().min(0, "Prices can't be negative."),
  offered: z.boolean().default(true),
});

export function catalogData(data: z.infer<typeof catalogItemSchema>) {
  return {
    sku: data.sku,
    name: data.name,
    genericName: data.genericName || null,
    form: data.form || null,
    strength: data.strength || null,
    unit: data.unit,
    sellingPrice: data.sellingPrice,
    offered: data.offered,
  };
}
