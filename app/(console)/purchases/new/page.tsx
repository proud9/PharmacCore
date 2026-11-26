import { pageTenant } from "@/lib/tenant";
import { NewOrderPage } from "@/components/trade/NewOrderPage";

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const t = await pageTenant("buy");
  return <NewOrderPage t={t} side="buyer" params={await searchParams} />;
}
