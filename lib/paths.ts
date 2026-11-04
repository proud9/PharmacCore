export function homePath(role: string) {
  if (role === "BUYER") return "/portal";
  if (role === "WHOLESALE_ADMIN") return "/wholesale";
  return "/dashboard";
}
