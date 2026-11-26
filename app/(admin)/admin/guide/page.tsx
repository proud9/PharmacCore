import type { Metadata } from "next";
import { pageAdmin } from "@/lib/admin";
import { TeamGuide } from "@/components/guide/TeamGuide";

export const metadata: Metadata = { title: "Guide · Parallax team" };

/** How the team area works. */
export default async function TeamGuidePage() {
  await pageAdmin();
  return <TeamGuide />;
}
