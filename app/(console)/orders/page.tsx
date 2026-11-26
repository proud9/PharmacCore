import { pageTenant } from "@/lib/tenant";
import type { ListParams } from "@/lib/paging";
import { OrdersList } from "@/components/trade/OrdersList";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant("sell");
  return <OrdersList t={t} side="seller" params={await searchParams} />;
}
