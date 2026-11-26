import Link from "next/link";
import AccountForm from "@/components/auth/AccountForm";
import { isOrgKind } from "@/lib/capabilities";

/** PUBLIC: create a business account (manufacturer, wholesaler, retailer or client). */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const kind = type && isOrgKind(type.toUpperCase()) ? (type.toUpperCase() as Parameters<typeof AccountForm>[0]["initialKind"]) : undefined;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-parchment p-5 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 ring-1 ring-rule">
          <img src="/brand/parallax-logo-96.png" alt="" width={36} height={36} className="h-9 w-9" />
        </span>
        <span className="font-display text-2xl font-semibold text-pine-800">Parallax</span>
      </Link>
      <AccountForm allowRegistration initialMode="register" initialKind={kind} />
    </div>
  );
}
