import { pageTenant } from "@/lib/tenant";
import { PartnersPage } from "@/components/trade/PartnersPage";

export default async function CustomersPage() {
  const t = await pageTenant("sell");
  return <PartnersPage t={t} side="seller" />;
}
