export function homePath(role: string) {
  if (role === "BUYER") return "/portal";
  if (role === "MANUFACTURER") return "/supplier";
  if (role === "FINANCE") return "/wholesale/payments";
  if (role === "SALES") return "/wholesale";
  return "/dashboard";
}
