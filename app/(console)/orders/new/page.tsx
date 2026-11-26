import { pageTenant } from "@/lib/tenant";
import { NewOrderPage } from "@/components/trade/NewOrderPage";

export default async function NewSellerOrderPage({ searchParams }: { searchParams: Promise<{ org?: string; contact?: string }> }) {
  const t = await pageTenant("sell");
  return <NewOrderPage t={t} side="seller" params={await searchParams} />;
}
