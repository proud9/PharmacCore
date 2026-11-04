import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { homePath } from "@/lib/paths";

export default async function Home() {
  const session = await readSession();
  redirect(session ? homePath(session.role) : "/login");
}
