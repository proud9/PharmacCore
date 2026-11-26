import { pageTenant } from "@/lib/tenant";
import type { ListParams } from "@/lib/paging";
import { OrdersList } from "@/components/trade/OrdersList";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant("buy");
  return <OrdersList t={t} side="buyer" params={await searchParams} />;
}
