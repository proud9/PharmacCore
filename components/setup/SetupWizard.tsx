"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import { Building2, Check, ImagePlus, Landmark, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Your account", icon: UserRound },
  { title: "Company details", icon: Building2 },
  { title: "Logo", icon: ImagePlus },
  { title: "Bank details", icon: Landmark },
];

const labelClass = "mb-1.5 block text-[15px] font-semibold normal-case tracking-normal text-ink";
const hintClass = "mt-1.5 text-sm text-foil";

type Owner = { name: string; email: string; password: string };
type Company = { name: string; phone: string; address: string; email: string; license: string; tpin: string; website: string };

/**
 * Wholesale set-up: owner account, company details (these go straight onto quotations,
 * invoices and delivery notes), then the optional logo and bank details. The account is
 * created when step 2 is submitted; steps 3 and 4 can be skipped and finished later from
 * Pharmacy details.
 */
export function SetupWizard({ bankNote }: { bankNote: string }) {
  const [step, setStep] = useState(0);
  const [owner, setOwner] = useState<Owner>({ name: "", email: "", password: "" });
  const [company, setCompany] = useState<Company>({ name: "", phone: "", address: "", email: "", license: "", tpin: "", website: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSaved, setLogoSaved] = useState(false);

  async function createWholesale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, company }),
    }).catch(() => null);
    setBusy(false);
    if (!response) return setError("Couldn't reach Parallax. Check your connection and try again.");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Couldn't set up your wholesale.");
      // A taken email belongs to step 1.
      if (response.status === 409 && String(data.error).includes("email")) setStep(0);
      return;
    }
    setStep(2);
  }

  async function uploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const response = await fetch("/api/pharmacy/logo", { method: "POST", body: new FormData(event.currentTarget) }).catch(() => null);
    setBusy(false);
    const data = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) return setError(data.error ?? "Couldn't upload the logo.");
    setLogoSaved(true);
    setStep(3);
  }

  async function saveBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/pharmacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: company.name, ...form }),
    }).catch(() => null);
    setBusy(false);
    const data = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) return setError(data.error ?? "Couldn't save your bank details.");
    finish();
  }

  function finish() {
    window.location.assign("/dashboard");
  }

  function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <div className="w-full max-w-2xl">
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Set-up steps">
        {STEPS.map(({ title, icon: Icon }, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={title} className="flex flex-col gap-2" aria-current={current ? "step" : undefined}>
              <span className={cn("h-1 rounded-full", done || current ? "bg-dispensary" : "bg-rule")} />
              <span className={cn("flex items-center gap-2 text-sm font-semibold", current ? "text-pine-800" : done ? "text-dispensary" : "text-foil")}>
                {done ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span className="hidden sm:inline">{title}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <section className="rounded-2xl border border-rule bg-white p-6 shadow-panel sm:p-8">
        <p className="text-sm font-semibold text-foil">
          Step {step + 1} of {STEPS.length}
        </p>

        {step === 0 ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              setStep(1);
            }}
          >
            <h2 className="mt-1 font-display text-3xl text-pine-800">Create your owner account</h2>
            <p className="mt-2 text-ink/70">This is the administrator account for your wholesale. You can add staff later.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="o-name" className={labelClass}>Your name</label>
                <input id="o-name" required minLength={2} maxLength={100} autoComplete="name" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="o-email" className={labelClass}>Work email</label>
                <input id="o-email" type="email" required autoComplete="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
                <p className={hintClass}>You&apos;ll sign in with this.</p>
              </div>
              <div>
                <label htmlFor="o-password" className={labelClass}>Password</label>
                <input id="o-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} />
                <p className={hintClass}>At least 8 characters.</p>
              </div>
            </div>
            <Footer error={error}>
              <button className="btn btn-primary h-12 px-6 text-base">Continue</button>
            </Footer>
          </form>
        ) : null}

        {step === 1 ? (
          <form onSubmit={createWholesale}>
            <h2 className="mt-1 font-display text-3xl text-pine-800">Tell us about your wholesale</h2>
            <p className="mt-2 text-ink/70">These details print on your quotations, invoices and delivery notes, so your documents are ready from day one.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="c-name" className={labelClass}>Trading name</label>
                <input id="c-name" required minLength={2} maxLength={150} autoComplete="organization" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-license" className={labelClass}>Licence number <span className="font-normal text-foil">Optional</span></label>
                <input id="c-license" maxLength={80} placeholder="e.g. ZAMRA licence" value={company.license} onChange={(e) => setCompany({ ...company, license: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-tpin" className={labelClass}>TPIN <span className="font-normal text-foil">Optional</span></label>
                <input id="c-tpin" maxLength={40} inputMode="numeric" value={company.tpin} onChange={(e) => setCompany({ ...company, tpin: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-phone" className={labelClass}>Phone</label>
                <input id="c-phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-email" className={labelClass}>Company email <span className="font-normal text-foil">Optional</span></label>
                <input id="c-email" type="email" maxLength={254} placeholder={owner.email || "orders@yourwholesale.co.zm"} value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="c-address" className={labelClass}>Business address</label>
                <textarea id="c-address" required minLength={5} maxLength={300} rows={2} autoComplete="street-address" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="c-website" className={labelClass}>Website <span className="font-normal text-foil">Optional</span></label>
                <input id="c-website" maxLength={150} placeholder="www.yourwholesale.co.zm" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
              </div>
            </div>
            <Footer error={error} back={() => { setError(""); setStep(0); }}>
              <button className="btn btn-primary h-12 px-6 text-base" disabled={busy}>
                {busy ? "Setting up…" : "Create my wholesale"}
              </button>
            </Footer>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={uploadLogo}>
            <h2 className="mt-1 font-display text-3xl text-pine-800">Add your company logo</h2>
            <p className="mt-2 text-ink/70">Your wholesale is set up. Add your logo and it will appear at the top of every quotation, invoice and delivery note.</p>
            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-rule bg-shelf">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-foil" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="logo" className={labelClass}>Logo file</label>
                <input id="logo" name="logo" type="file" required accept="image/png,image/jpeg,image/webp" onChange={pickLogo} />
                <p className={hintClass}>PNG, JPG or WebP. A square image with a plain background works best.</p>
              </div>
            </div>
            <Footer error={error} skip={() => { setError(""); setStep(3); }}>
              <button className="btn btn-primary h-12 px-6 text-base" disabled={busy}>
                {busy ? "Uploading…" : "Save logo"}
              </button>
            </Footer>
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={saveBank}>
            <h2 className="mt-1 font-display text-3xl text-pine-800">Where should customers pay you?</h2>
            <p className="mt-2 text-ink/70">
              Add your bank details to print them on quotations and invoices.{logoSaved ? " Your logo is saved." : ""}
            </p>
            <div className="mt-5 flex gap-3 rounded-xl bg-dispensary-soft p-4 text-[15px] text-pine-800">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dispensary" aria-hidden="true" />
              <p>{bankNote}</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="b-bank" className={labelClass}>Bank name</label>
                <input id="b-bank" name="bankName" required maxLength={100} placeholder="e.g. Zanaco" />
              </div>
              <div>
                <label htmlFor="b-branch" className={labelClass}>Branch <span className="font-normal text-foil">Optional</span></label>
                <input id="b-branch" name="bankBranch" maxLength={100} />
              </div>
              <div>
                <label htmlFor="b-account-name" className={labelClass}>Account name</label>
                <input id="b-account-name" name="accountName" required maxLength={150} defaultValue={company.name} />
              </div>
              <div>
                <label htmlFor="b-account-number" className={labelClass}>Account number</label>
                <input id="b-account-number" name="accountNumber" required maxLength={40} inputMode="numeric" autoComplete="off" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-swift" className={labelClass}>SWIFT or sort code <span className="font-normal text-foil">Optional</span></label>
                <input id="b-swift" name="swiftCode" maxLength={40} autoComplete="off" />
              </div>
            </div>
            <Footer error={error} skip={finish}>
              <button className="btn btn-primary h-12 px-6 text-base" disabled={busy}>
                {busy ? "Saving…" : "Save and finish"}
              </button>
            </Footer>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function Footer({
  error,
  back,
  skip,
  children,
}: {
  error: string;
  back?: () => void;
  skip?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {error ? (
        <p className="mt-4 text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          {back ? (
            <button type="button" className="btn btn-ghost h-12" onClick={back}>
              Back
            </button>
          ) : null}
          {skip ? (
            <button type="button" className="text-[15px] font-semibold text-pine-800 underline underline-offset-4" onClick={skip}>
              Skip for now
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </>
  );
}
