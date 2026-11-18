import Link from "next/link";
import { ArrowRight, Building2, Clock3, MapPin, Phone, Pill } from "lucide-react";
import AccountForm from "@/components/auth/AccountForm";

const participantGroups = [
  "Retail pharmacies",
  "Wholesale pharmacies",
  "Hospitals",
  "Clinics",
];

export default function Home() {
  return (
    <main>
      <header className="border-b border-pine-900/10 bg-parchment/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="PharmaCore home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-800 text-white">
              <Pill className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-semibold text-pine-950">PharmaCore</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-5 lg:gap-7">
            <a href="#who-it-connects" className="hidden text-sm text-ink/70 hover:text-pine-800 lg:inline">
              Who it connects
            </a>
            <a href="#about" className="hidden text-sm text-ink/70 hover:text-pine-800 lg:inline">
              Our purpose
            </a>
            <a href="#contact" className="hidden text-sm text-ink/70 hover:text-pine-800 lg:inline">
              Contact
            </a>
            <Link href="/login" className="hidden text-sm font-semibold text-pine-800 hover:text-pine-600 sm:inline">
              Sign in
            </Link>
            <Link href="#account-access" className="btn btn-primary px-3 py-2 text-xs sm:text-sm">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <section className="overflow-hidden bg-parchment">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div className="w-full max-w-2xl text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine-700">One shared system</p>
            <h1 className="mt-4 font-display text-3xl leading-tight text-pine-950 sm:text-4xl lg:text-5xl">
              CONNECTING ORGANIZATIONS THAT KEEP HELTHCARE MOVING
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink/70">
              One shared system to support a more synchronized medical industry.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#account-access" className="btn btn-primary min-h-12 px-6">
                Create account
              </a>
              <a href="#contact" className="btn btn-ghost min-h-12 px-6">
                Contact PharmaCore <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-lg rounded-[2rem] bg-sage-100 p-4 sm:p-6 lg:ml-auto">
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pine-800 text-white">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-pine-950">PharmaCore</p>
                <p className="text-sm text-ink/65">One shared system</p>
              </div>
            </div>
            <div className="my-3 flex flex-col items-center text-pine-700">
              <span className="h-4 w-px bg-pine-800/25" aria-hidden="true" />
              <span className="rounded-full bg-parchment px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                Connects
              </span>
              <span className="h-4 w-px bg-pine-800/25" aria-hidden="true" />
            </div>
            <ul aria-label="Organizations connected by PharmaCore" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {participantGroups.map((group) => (
                <li key={group} className="flex min-h-16 items-center gap-3 rounded-xl bg-white/80 px-4 py-3">
                  <Building2 className="h-4 w-4 shrink-0 text-pine-700" aria-hidden="true" />
                  <span className="text-sm text-pine-950">{group}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="who-it-connects" className="scroll-mt-8 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine-700">Who it connects</p>
            <h2 className="mt-3 font-display text-2xl text-pine-950 sm:text-3xl">
              The organizations PharmaCore brings together
            </h2>
            <p className="mt-4 leading-7 text-ink/70">
              Retail pharmacies, wholesale pharmacies, hospitals, and clinics are part of one shared system.
            </p>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {participantGroups.map((group) => (
              <article key={group} className="rounded-2xl border border-pine-900/10 bg-parchment/50 p-5 sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sage-100 text-pine-800">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-lg text-pine-950">{group}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-8 bg-sage-100/70 py-16 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine-700">Our purpose</p>
            <h2 className="mt-3 font-display text-2xl leading-tight text-pine-950 sm:text-3xl">
              Supporting a more synchronized medical industry.
            </h2>
          </div>
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <div>
              <p className="leading-7 text-ink/70">
                By bringing retail pharmacies, wholesale pharmacies, hospitals, and clinics into one system, PharmaCore
                aims to support more synchronized work across the medical industry.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="account-access" className="scroll-mt-8 bg-parchment py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine-700">Account access</p>
            <h2 className="mt-3 font-display text-2xl text-pine-950 sm:text-3xl">
              Sign in or create an account for your organization.
            </h2>
            <p className="mt-4 leading-7 text-ink/70">
              Create an institution account for a pharmacy, hospital, or clinic, or sign in to an existing account.
            </p>
          </div>
          <AccountForm allowRegistration initialMode="register" />
        </div>
      </section>

      <section id="contact" className="scroll-mt-8 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine-700">Get in touch</p>
            <h2 className="mt-3 font-display text-2xl text-pine-950 sm:text-3xl">Contact PharmaCore</h2>
            <p className="mt-4 leading-7 text-ink/70">Use the details below to get in touch.</p>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ContactDetail icon={MapPin} label="Business address" value="[Add business address]" />
            <ContactDetail icon={Phone} label="Phone" value="[Add phone number]" />
            <ContactDetail icon={Clock3} label="Contact hours" value="[Add contact hours]" />
          </div>
        </div>
      </section>

      <footer className="border-t border-pine-900/10 bg-parchment">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-center text-sm text-ink/60 sm:px-8">
          <span className="font-display text-base text-pine-950">PharmaCore</span>
          <span>Bringing retail pharmacies, wholesale pharmacies, hospitals, and clinics into one system.</span>
        </div>
      </footer>
    </main>
  );
}

function ContactDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="h-full rounded-2xl border border-pine-900/10 p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-pine-800">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm text-pine-950">{label}</h3>
          <p className="mt-1 text-sm leading-6 text-ink/65">{value}</p>
        </div>
      </div>
    </div>
  );
}
