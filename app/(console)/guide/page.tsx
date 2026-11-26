import type { Metadata } from "next";
import { pageTenant } from "@/lib/tenant";
import { BusinessGuide } from "@/components/guide/BusinessGuide";
import { isOrgKind } from "@/lib/capabilities";

export const metadata: Metadata = { title: "Guide · Parallax" };

/** How Parallax works for this business's account type. */
export default async function GuidePage() {
  const { org } = await pageTenant();
  if (!isOrgKind(org.kind)) throw new Error(`Unknown account type ${org.kind}`);
  return <BusinessGuide kind={org.kind} />;
}
