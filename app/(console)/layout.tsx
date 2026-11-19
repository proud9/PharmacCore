import { redirect } from "next/navigation";
import { isStaff, requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { getPharmacy } from "@/lib/pharmacy";
import { Shell } from "@/components/Shell";
import { ROLE_LABEL } from "@/lib/utils";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // A valid cookie for a deactivated or deleted account: clear it, or /login and this page bounce forever.
  if (!user) redirect("/api/auth/signout");
  // Clients and manufacturers have their own areas; the console is for wholesale staff only.
  if (!isStaff(user.role)) redirect(homePath(user.role));
  const pharmacy = await getPharmacy();

  return (
    <Shell
      name={user.name}
      role={ROLE_LABEL[user.role] ?? user.role}
      roleCode={user.role}
      pharmacy={pharmacy?.name ?? "Pharmacy"}
    >
      {children}
    </Shell>
  );
}
