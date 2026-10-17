import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { ROLE_LABEL } from "@/lib/utils";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const pharmacy = await db.pharmacy.findUnique({ where: { id: "main" } });

  return (
    <Shell name={user.name} role={ROLE_LABEL[user.role] ?? user.role} pharmacy={pharmacy?.name ?? "Pharmacy"}>
      {children}
    </Shell>
  );
}
