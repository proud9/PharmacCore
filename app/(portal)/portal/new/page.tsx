import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { ConsignmentRequestForm } from "@/components/wholesale/ConsignmentRequestForm";

export default async function NewConsignmentPage() {
  const wholesaler = await getPharmacy();
  return (
    <div>
      <PageHeader
        title="New order"
        description={`Choose medicines and equipment. ${wholesaler?.name ?? "Your wholesaler"} will send a price in Kwacha and a date the order can be ready.`}
      />
      <ConsignmentRequestForm />
    </div>
  );
}
