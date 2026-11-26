import { pageTenant } from "@/lib/tenant";
import { OrderDetail } from "@/components/trade/OrderDetail";

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await pageTenant("sell");
  const { id } = await params;
  return <OrderDetail t={t} id={id} expect="seller" />;
}
