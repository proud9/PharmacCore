/** How a counter sale was paid. Stored as the code; shown with COUNTER_PAYMENT_LABEL (client-safe). */
export const COUNTER_PAYMENTS = ["CASH", "CARD", "MOBILE", "INSURANCE"] as const;
export type CounterPayment = (typeof COUNTER_PAYMENTS)[number];

export const COUNTER_PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile money",
  INSURANCE: "Insurance",
};

export const counterPaymentLabel = (code: string) => COUNTER_PAYMENT_LABEL[code] ?? code;
