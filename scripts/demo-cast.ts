/**
 * Who plays which account in the LAN presentation, and the items they use. docs/demo/README.md
 * walks through the same names; scripts/demo-rehearsal.ts plays them end to end.
 * All fictional.
 */
export const DEMO_PASSWORD = "Parallax-Demo-26";

export const TEAM = { device: "Server laptop", email: "team@demo.local", name: "Parallax Team" };

export const CAST = {
  manufacturer: {
    device: "Device 1",
    kind: "MANUFACTURER",
    businessName: "Zambezi Pharmaceuticals",
    town: "Lusaka",
    phone: "0977 100 001",
    name: "Mutinta Hamoonga",
    email: "maker@demo.local",
  },
  wholesaler: {
    device: "Device 2",
    kind: "WHOLESALER",
    businessName: "Lusaka Medical Wholesale",
    town: "Lusaka",
    phone: "0977 100 002",
    name: "Chanda Mwila",
    email: "wholesale@demo.local",
  },
  retailer: {
    device: "Device 3",
    kind: "RETAILER",
    businessName: "Kabulonga Pharmacy",
    town: "Lusaka",
    phone: "0977 100 003",
    name: "Natasha Banda",
    email: "pharmacy@demo.local",
  },
  client: {
    device: "Device 4",
    kind: "CLIENT",
    businessName: "Chongwe Rural Health Centre",
    town: "Chongwe",
    phone: "0977 100 004",
    name: "Sister Ruth Phiri",
    email: "clinic@demo.local",
  },
} as const;

/** The manufacturer's item list (Items → Add item). Prices are its private list prices. */
export const MAKER_ITEMS = [
  { sku: "ZP-AMX", name: "Amoxicillin 500 mg capsules", genericName: "Amoxicillin", strength: "500 mg", form: "capsule", unit: "box of 100", sellingPrice: 92 },
  { sku: "ZP-MET", name: "Metformin tablets", genericName: "Metformin", strength: "500 mg", form: "tablet", unit: "box of 60", sellingPrice: 48 },
  { sku: "ZP-CTX", name: "Ceftriaxone injection", genericName: "Ceftriaxone", strength: "1 g", form: "vial", unit: "pack of 10", sellingPrice: 140 },
];

/** The wholesaler's opening stock, uploaded as docs/demo/wholesaler-opening-stock.xlsx. */
export const OPENING_STOCK = [
  { stockCode: "W-PCM", description: "Paracetamol 500 mg tablets", type: "OTC", unit: "box of 100", price: 55, prescription: "Not required", openingStock: 200, batch: "PCM-2411", expiryMonths: 18 },
  { stockCode: "W-AMX", description: "Amoxicillin 500 mg capsules", type: "OTC", unit: "box of 100", price: 150, prescription: "Required", openingStock: 40, batch: "AMX-2409", expiryMonths: 12 },
  { stockCode: "W-ORS", description: "Oral rehydration salts", type: "OTC", unit: "box of 50", price: 75, prescription: "Not required", openingStock: 100, batch: "ORS-2410", expiryMonths: 24 },
  { stockCode: "W-GLV", description: "Examination gloves, medium", type: "OTC", unit: "box of 100", price: 110, prescription: "Not required", openingStock: 80, batch: "GLV-2408", expiryMonths: 36 },
];
