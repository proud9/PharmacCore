import { Pill } from "lucide-react";
import AccountForm from "@/components/auth/AccountForm";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-pine-950 p-12 text-parchment lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass text-pine-950">
            <Pill aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-semibold">PharmaCore</p>
        </div>
        <div>
          <h1 className="mt-4 max-w-md font-display text-3xl leading-tight sm:text-4xl">PharmaCore management system</h1>
          <p className="mt-4 max-w-md text-sage-300">
            Stock, sales, patient records, and wholesale orders for hospitals, clinics, and pharmacies — priced in
            Kwacha (ZMW).
          </p>
        </div>
        <p className="text-sm text-sage-300">&nbsp;</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-8">
        <AccountForm />
      </section>
    </div>
  );
}
