"use client";

import { BANK_DETAILS_NOTE } from "@/lib/bank-note";
import { PAYMENT_TERMS, PAYMENT_TERMS_LABEL } from "@/lib/trade";
import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Details = {
  name: string;
  licenceNo: string;
  town: string;
  listed: boolean;
  defaultPaymentTerms: string;
  creditDays: number;
  phone: string;
  email: string;
  address: string;
  website: string;
  tpin: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankBranch: string;
  swiftCode: string;
};

export function CompanyForm({ details, hasLogo, orgId, sells }: { details: Details; hasLogo: boolean; orgId: string; sells: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const [logoVersion, setLogoVersion] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form.entries());
    body.listed = form.get("listed") === "on";
    if (body.creditDays !== undefined) body.creditDays = Number(body.creditDays) || 0;
    const response = await fetch("/api/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save the details.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function uploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogoMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/company/logo", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      setLogoMessage(data.error ?? "Could not upload the logo");
      return;
    }
    setLogoVersion((value) => value + 1);
    setLogoMessage("Logo saved. It will appear on quotations, invoices, and delivery notes.");
    router.refresh();
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
    <form id="logo" onSubmit={uploadLogo} className="scroll-mt-6 rounded-2xl border border-pine-900/10 bg-white p-6 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Logo</h2>
      <p className="mt-1 text-sm text-ink/60">PNG, JPG, or WebP, up to 1.5 MB. Printed on quotations, invoices, and delivery notes.</p>
      {hasLogo || logoVersion > 0 ? (
        <img src={`/api/company/logo?org=${orgId}&v=${logoVersion}`} alt="Business logo" className="mt-3 h-16 w-16 rounded border border-pine-900/10 object-contain" />
      ) : null}
      <input className="mt-3" name="logo" type="file" accept="image/png,image/jpeg,image/webp" required />
      {logoMessage ? <p className="mt-2 text-sm text-pine-800">{logoMessage}</p> : null}
      <button className="btn btn-ghost mt-3">Upload logo</button>
    </form>
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-pine-900/10 bg-white p-6 shadow-panel">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label>Trading name</label>
          <input name="name" required defaultValue={details.name} />
        </div>
        <div>
          <label>Licence no.</label>
          <input name="licenceNo" defaultValue={details.licenceNo} />
        </div>
        <div>
          <label>Town</label>
          <input name="town" defaultValue={details.town} />
        </div>
        <div>
          <label>Phone</label>
          <input name="phone" defaultValue={details.phone} />
        </div>
        <div>
          <label>Email</label>
          <input name="email" defaultValue={details.email} />
        </div>
        <div className="sm:col-span-2">
          <label>Address</label>
          <input name="address" defaultValue={details.address} />
        </div>
        <div>
          <label>Website</label>
          <input name="website" defaultValue={details.website} />
        </div>
        <div>
          <label>TPIN</label>
          <input name="tpin" defaultValue={details.tpin} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm font-normal normal-case tracking-normal text-ink">
        <input type="checkbox" name="listed" defaultChecked={details.listed} className="mt-1 w-auto" />
        <span>
          Show this business in the Parallax directory, so others can find it and ask to connect. Only your name,
          type and town are shown.
        </span>
      </label>
      {sells ? (
        <>
          <h2 className="font-display text-xl text-pine-900">How customers pay</h2>
          <p className="-mt-2 text-sm text-ink/60">The default for new orders. You can set different terms for one customer on their connection.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label>Payment terms</label>
              <select name="defaultPaymentTerms" defaultValue={details.defaultPaymentTerms}>
                {PAYMENT_TERMS.map((terms) => (
                  <option key={terms} value={terms}>
                    {PAYMENT_TERMS_LABEL[terms]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Credit days (pay on account)</label>
              <input name="creditDays" type="number" min={0} max={365} defaultValue={details.creditDays} />
            </div>
          </div>
        </>
      ) : null}
      <h2 id="bank" className="scroll-mt-6 font-display text-xl text-pine-900">Bank details for invoices</h2>
      <div className="flex gap-3 rounded-xl bg-dispensary-soft p-4 text-sm text-pine-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dispensary" aria-hidden="true" />
        <p>{BANK_DETAILS_NOTE}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label>Bank name</label>
          <input name="bankName" defaultValue={details.bankName} />
        </div>
        <div>
          <label>Account name</label>
          <input name="accountName" defaultValue={details.accountName} />
        </div>
        <div>
          <label>Account number</label>
          <input name="accountNumber" defaultValue={details.accountNumber} />
        </div>
        <div>
          <label>Branch</label>
          <input name="bankBranch" defaultValue={details.bankBranch} />
        </div>
        <div>
          <label>SWIFT / sort code</label>
          <input name="swiftCode" defaultValue={details.swiftCode} />
        </div>
      </div>
      {error ? <p className="text-sm text-rust">{error}</p> : null}
      {saved ? <p className="text-sm text-pine-800">Saved. New quotations and invoices will use these details.</p> : null}
      <button className="btn btn-primary w-fit" disabled={loading}>
        {loading ? "Saving…" : "Save details"}
      </button>
    </form>
    </div>
  );
}
