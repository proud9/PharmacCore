/** Example dispatches for the landing page's label feed. Display only: fictional customers and orders. */
export type Dispatch = {
  name: string;
  pack: string;
  batch: string;
  expires: string;
  quantity: string;
  to: string;
  dept: string;
  amount: string;
};

export const FROM = { name: "Kafue Wholesale", place: "Lusaka warehouse" };

export const DISPATCHES: Dispatch[] = [
  { name: "Amoxicillin 500 mg", pack: "Capsules, pack of 21", batch: "AMX-762", expires: "06/2027", quantity: "120 packs", to: "Chilenje Pharmacy", dept: "Retail counter", amount: "K 12,480" },
  { name: "Paracetamol 500 mg", pack: "Tablets, box of 100", batch: "PCM-418", expires: "11/2027", quantity: "300 boxes", to: "Mtendere Clinic", dept: "Outpatients", amount: "K 8,950" },
  { name: "Malaria rapid tests", pack: "Test kits, box of 25", batch: "MRD-905", expires: "03/2027", quantity: "80 boxes", to: "Riverside Hospital, Kitwe", dept: "Laboratory", amount: "K 21,600" },
  { name: "Oral rehydration salts", pack: "Sachets, carton of 50", batch: "ORS-233", expires: "09/2028", quantity: "60 cartons", to: "Kalingalinga Clinic", dept: "Paediatrics", amount: "K 4,320" },
  { name: "Nitrile gloves, medium", pack: "Box of 100", batch: "GLV-571", expires: "01/2029", quantity: "150 boxes", to: "Northgate Hospital", dept: "Theatre", amount: "K 18,750" },
  { name: "Ceftriaxone 1 g", pack: "Injection vials, pack of 10", batch: "CTX-310", expires: "04/2027", quantity: "40 packs", to: "Riverside Hospital, Kitwe", dept: "Ward supplies", amount: "K 9,800" },
  { name: "Metformin 500 mg", pack: "Tablets, pack of 56", batch: "MET-882", expires: "08/2027", quantity: "200 packs", to: "Livingstone Pharmacy", dept: "Retail counter", amount: "K 7,400" },
  { name: "Insulin NPH 100 IU", pack: "10 ml vials, cold chain", batch: "INS-207", expires: "02/2027", quantity: "30 vials", to: "Northgate Hospital", dept: "Diabetes clinic", amount: "K 6,300" },
  { name: "Amlodipine 5 mg", pack: "Tablets, pack of 30", batch: "AML-145", expires: "10/2027", quantity: "180 packs", to: "Ndola Central Pharmacy", dept: "Retail counter", amount: "K 5,940" },
  { name: "IV giving sets", pack: "Sterile, box of 50", batch: "IVS-660", expires: "05/2029", quantity: "45 boxes", to: "Mansa District Hospital", dept: "Ward supplies", amount: "K 11,250" },
  { name: "Ibuprofen 400 mg", pack: "Tablets, pack of 24", batch: "IBU-118", expires: "07/2027", quantity: "240 packs", to: "Woodlands Pharmacy", dept: "Retail counter", amount: "K 3,840" },
  { name: "Salbutamol inhaler", pack: "100 mcg, 200 doses", batch: "SAL-390", expires: "12/2027", quantity: "90 inhalers", to: "Mtendere Clinic", dept: "Outpatients", amount: "K 6,750" },
  { name: "Cotrimoxazole 480 mg", pack: "Tablets, pack of 100", batch: "CTM-552", expires: "03/2028", quantity: "70 packs", to: "Solwezi Clinic", dept: "Dispensary", amount: "K 2,940" },
  { name: "Syringes, 5 ml", pack: "Luer lock, box of 100", batch: "SYR-204", expires: "06/2029", quantity: "120 boxes", to: "Kabwe General Hospital", dept: "Ward supplies", amount: "K 9,000" },
  { name: "Zinc sulphate 20 mg", pack: "Dispersible, pack of 10", batch: "ZNC-071", expires: "01/2028", quantity: "400 packs", to: "Kalingalinga Clinic", dept: "Paediatrics", amount: "K 2,800" },
  { name: "Gauze swabs", pack: "10 × 10 cm, pack of 100", batch: "GZS-318", expires: "11/2029", quantity: "200 packs", to: "Kabwe General Hospital", dept: "Theatre", amount: "K 5,200" },
];
