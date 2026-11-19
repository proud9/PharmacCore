export const CONSIGNMENT_STATUSES = [
  "REQUESTED",
  "QUOTED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
] as const;

export type ConsignmentStatus = (typeof CONSIGNMENT_STATUSES)[number] | "DECLINED" | "CANCELLED";

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested",
  QUOTED: "Price sent",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready for delivery",
  DISPATCHED: "Out for delivery",
  DELIVERED: "Delivered",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

/** Replaces status codes in free text (order history, activity log) with their labels. */
export function plainStatus(text: string | null) {
  if (!text) return "";
  return text.replace(/\b(REQUESTED|QUOTED|ACCEPTED|PREPARING|READY|DISPATCHED|DELIVERED|DECLINED|CANCELLED)\b/g, (code) => STATUS_LABEL[code] ?? code)
    .replace(/\bConsignment request submitted\b/g, "Order request sent")
    .replace(/\bStatus set to\b/g, "Moved to");
}

export const KIND_LABEL: Record<string, string> = {
  HOSPITAL: "Hospital",
  CLINIC: "Clinic",
  PHARMACY: "Pharmacy",
  SCHOOL: "School",
};

/** Client types, in the order shown in forms. */
export const INSTITUTION_KINDS = ["HOSPITAL", "CLINIC", "PHARMACY", "SCHOOL"] as const;

export function statusTone(status: string): "neutral" | "good" | "warn" | "bad" | "brass" {
  if (status === "DELIVERED" || status === "ACCEPTED" || status === "READY") return "good";
  if (status === "DECLINED" || status === "CANCELLED") return "bad";
  if (status === "QUOTED" || status === "PREPARING" || status === "DISPATCHED") return "brass";
  return "warn";
}

export function adminNextStatuses(status: string) {
  switch (status) {
    case "REQUESTED":
      return ["DECLINED"];
    case "QUOTED":
      return ["DECLINED"];
    case "ACCEPTED":
      return ["PREPARING", "DECLINED"];
    case "PREPARING":
      return ["READY"];
    case "READY":
      return ["DISPATCHED"];
    case "DISPATCHED":
      return ["DELIVERED"];
    default:
      return [];
  }
}
