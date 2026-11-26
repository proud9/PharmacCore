import { redirect } from "next/navigation";
import { pageAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageAdmin();
  if (user.mustChangePassword) redirect("/account/password");
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
