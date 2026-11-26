import { pageTenant } from "@/lib/tenant";
import { PartnersPage } from "@/components/trade/PartnersPage";

export default async function SuppliersPage() {
  const t = await pageTenant("buy");
  return <PartnersPage t={t} side="buyer" />;
}
