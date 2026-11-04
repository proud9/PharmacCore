import { redirect } from "next/navigation";
import { isBuyer, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { ROLE_LABEL } from "@/lib/utils";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user || !isBuyer(user.role)) redirect("/login");
  const institution = user.institutionId
    ? await db.institution.findUnique({ where: { id: user.institutionId } })
    : null;

  return (
    <Shell
      name={user.name}
      role={ROLE_LABEL[user.role] ?? user.role}
      roleCode={user.role}
      pharmacy={institution?.name ?? "Buyer portal"}
    >
      {children}
    </Shell>
  );
}
