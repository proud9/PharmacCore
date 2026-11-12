export type PricedLine = {
  quantity: number;
  unitPrice: number | null;
};

export function documentTotals(items: PricedLine[], taxRate: number, quotedAmount: number | null) {
  const priced = items.length > 0 && items.every((item) => item.unitPrice != null);
  const subtotal = priced
    ? items.reduce((sum, item) => sum + item.quantity * (item.unitPrice ?? 0), 0)
    : (quotedAmount ?? 0);
  const tax = priced ? subtotal * (taxRate / 100) : 0;
  const total = priced ? subtotal + tax : (quotedAmount ?? subtotal);
  return { priced, subtotal, tax, total };
}

export function zmw(value: number) {
  return `ZMW ${value.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const QUOTE_STATUSES = ["QUOTED", "ACCEPTED", "PREPARING", "READY", "DISPATCHED", "DELIVERED"];
export const INVOICE_STATUSES = ["ACCEPTED", "PREPARING", "READY", "DISPATCHED", "DELIVERED"];
export const DELIVERY_STATUSES = ["PREPARING", "READY", "DISPATCHED", "DELIVERED"];
