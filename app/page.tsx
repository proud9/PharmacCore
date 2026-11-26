import { Fragment } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ContactRound,
  Facebook,
  Factory,
  Globe,
  HandCoins,
  History,
  Hospital,
  Instagram,
  Linkedin,
  ListChecks,
  LockKeyhole,
  Mail,
  MapPin,
  MonitorSmartphone,
  Network,
  Phone,
  Pill,
  Printer,
  School,
  Stethoscope,
  Store,
  Warehouse,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import AccountForm from "@/components/auth/AccountForm";
import { DispatchFeed } from "@/components/landing/DispatchFeed";
import { DemoRequestDialog } from "@/components/landing/DemoRequestDialog";
import { LandingNav } from "@/components/landing/LandingNav";
import { requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { CONTACT, SOCIAL_LINKS } from "@/lib/contact";
import styles from "./landing.module.css";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: LockKeyhole, title: "Prices kept private", text: "A quote is seen by the one buyer it was sent to. No other business sees your prices, stock or documents." },
  { icon: Network, title: "Connections", text: "Find manufacturers, wholesalers, pharmacies and clients in the directory and ask to connect." },
  { icon: ListChecks, title: "Item lists without prices", text: "Connected buyers see what you offer by name only, tick what they need and send an inquiry." },
  { icon: Printer, title: "Quotes, orders, invoices, delivery notes", text: "Made from the order itself, with your logo and bank details, ready to print or save as PDF." },
  { icon: CalendarClock, title: "Batches and expiry dates", text: "Wholesalers and pharmacies keep every batch and expiry. Stock leaves earliest-expiry first." },
  { icon: Pill, title: "Sales counter", text: "Pharmacies sell at the counter and keep patients and prescriptions in the same account." },
  { icon: ContactRound, title: "Customers not on Parallax", text: "Keep a private list of the businesses you deal with offline and still make their documents." },
  { icon: History, title: "Stock takes and activity log", text: "Count stock, see what moved and its value, and see who changed what and when." },
];

const STEPS = [
  { title: "Connect", text: "Find a supplier in the directory and ask to connect. Once they accept, you see their item list.", party: "Both" },
  { title: "Inquiry", text: "Tick the items and quantities you need from the list and send the inquiry.", party: "Buyer" },
  { title: "Quote", text: "The supplier prices each line in Kwacha. Only you see that quote.", party: "Seller" },
  { title: "Order", text: "Accept the quote and your purchase order goes with it.", party: "Buyer" },
  { title: "Deliver and pay", text: "Invoice and delivery note follow your payment terms. Stock you receive goes into your inventory.", party: "Both" },
];

const STAGES: { icons: LucideIcon[]; title: string; text: string; link?: { label: string; detail: string } }[] = [
  { icons: [Factory], title: "Manufacturers", text: "Offer your item list to wholesalers, quote their inquiries and invoice each delivery.", link: { label: "Sell to", detail: "Wholesalers" } },
  { icons: [Warehouse], title: "Wholesalers", text: "Buy from manufacturers, keep every batch in stock, and supply pharmacies and clients.", link: { label: "Sell to", detail: "Pharmacies, clients" } },
  { icons: [Store], title: "Pharmacies", text: "Order from your wholesalers, run the sales counter, and supply clinics and hospitals.", link: { label: "Sell to", detail: "Clients" } },
  { icons: [Hospital, Stethoscope, School], title: "Hospitals, clinics, schools and NGOs", text: "Ask several suppliers for quotes, accept the best and follow each delivery. Free of charge." },
];

export default async function Home() {
  // requireUser checks the account still exists and is active, not just the cookie.
  const session = await requireUser();
  const year = new Date().getFullYear();
  const createHref = "#create-account";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.wrap} ${styles.nav}`}>
          <Link href="/" className={styles.brand}>
            <img className={styles.logo} src="/brand/parallax-logo-96.png" alt="" width={34} height={34} />
            Parallax
          </Link>
          <LandingNav />
          <div className={styles.navActions}>
            {session ? (
              <Link className={`${styles.btn} ${styles.btnPrimary}`} href={homePath(session.role)}>
                Open Parallax
              </Link>
            ) : (
              <>
                <a className={styles.signin} href="#sign-in">
                  Sign in
                </a>
                <a className={`${styles.btn} ${styles.btnPrimary}`} href={createHref}>
                  Create an account
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div>
              <h1>Medicine supply, kept in order.</h1>
              <p className={styles.lead}>
                Parallax connects manufacturers, wholesalers, pharmacies and the hospitals, clinics, schools and NGOs they
                supply. Ask for quotes, place orders and keep stock, each business in its own private account.
              </p>
              <div className={styles.heroActions}>
                <a className={`${styles.btn} ${styles.btnPrimary}`} href={createHref}>
                  Create an account
                </a>
                <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} data-demo>
                  Request a demo
                </button>
              </div>
            </div>
            <DispatchFeed />
          </div>
        </section>

        <section className={`${styles.band} ${styles.alt}`} id="supply-chain">
          <div className={styles.wrap}>
            <div className={styles.head}>
              <h2>From the manufacturer to the ward.</h2>
              <p>
                Every business on the chain has its own account. Connect with the businesses you buy from and sell to,
                and trade with them the way you would door to door, only on Parallax.
              </p>
            </div>
            <div className={`${styles.chain} ${styles.chain4}`}>
              {STAGES.map((stage) => (
                <Fragment key={stage.title}>
                  <article className={styles.stage}>
                    <span className={styles.icons}>
                      {stage.icons.map((Icon, index) => (
                        <Icon key={index} className={styles.icon} aria-hidden="true" />
                      ))}
                    </span>
                    <h3>{stage.title}</h3>
                    <p>{stage.text}</p>
                  </article>
                  {stage.link ? <ChainLink label={stage.link.label} detail={stage.link.detail} /> : null}
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.band} id="how">
          <div className={styles.wrap}>
            <div className={styles.head}>
              <h2>How an order moves.</h2>
              <p>
                Both businesses see the same order, each from its own side, so nobody phones to ask where a quote or a
                delivery is.
              </p>
            </div>
            <ol className={styles.flow}>
              {STEPS.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <span className={styles.party}>{step.party}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${styles.band} ${styles.alt}`} id="included">
          <div className={styles.wrap}>
            <div className={styles.head}>
              <h2>What each business gets.</h2>
              <p>Each account type sees the tools it needs: trading for everyone, stock for wholesalers and pharmacies.</p>
            </div>
            <dl className={styles.features}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div className={styles.feature} key={title}>
                  <Icon className={styles.icon} aria-hidden="true" />
                  <dt>{title}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={styles.band} id="account">
          <span id="sign-in" className={styles.anchor} aria-hidden="true" />
          <span id="create-account" className={styles.anchor} aria-hidden="true" />
          <div className={`${styles.wrap} ${styles.accountGrid}`}>
            <div className={styles.accountCopy}>
              <h2>Create your business account.</h2>
              <p className={styles.intro}>
                Manufacturers, wholesalers, pharmacies, hospitals, clinics, schools and NGOs sign up here. One login per
                business.
              </p>
              <ul className={styles.points}>
                <li>
                  <MonitorSmartphone className={styles.icon} aria-hidden="true" />
                  <span>Nothing to install. Parallax runs in your browser, on a computer or phone, from anywhere.</span>
                </li>
                <li>
                  <LockKeyhole className={styles.icon} aria-hidden="true" />
                  <span>
                    Your prices, stock and documents are yours alone. Bank details, private contacts and patient records
                    are stored encrypted.
                  </span>
                </li>
                <li>
                  <HandCoins className={styles.icon} aria-hidden="true" />
                  <span>
                    Free for hospitals, clinics, schools and NGOs. Manufacturers, wholesalers and pharmacies start with a
                    30-day free trial.
                  </span>
                </li>
              </ul>
            </div>
            <AccountForm allowRegistration initialMode="register" />
          </div>
        </section>
      </main>

      <footer className={styles.footer} id="contact">
        <div className={styles.wrap}>
          <div className={styles.demoBanner}>
            <div>
              <h2>Bringing your business onto Parallax? See it with your own items.</h2>
              <p>We&apos;ll walk you through connections, quotes, orders and stock, and help you bring your stock sheet across.</p>
            </div>
            <button type="button" className={`${styles.btn} ${styles.btnLight}`} data-demo>
              Request a demo
            </button>
          </div>

          <div className={styles.footGrid}>
            <div className={styles.footBrand}>
              <Link href="/" className={styles.brand}>
                <img className={styles.logo} src="/brand/parallax-logo-96.png" alt="" width={38} height={38} />
                Parallax
              </Link>
              <p>The trading network for medicine supply in Zambia.</p>
            </div>
            <div>
              <h3>Contact</h3>
              <ul className={styles.footList}>
                <li>
                  <MapPin aria-hidden="true" />
                  <span>
                    Business address
                    <br />
                    <em>{CONTACT.address ?? "To be added"}</em>
                  </span>
                </li>
                <li>
                  <Phone aria-hidden="true" />
                  <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a>
                </li>
                <li>
                  <Mail aria-hidden="true" />
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                </li>
              </ul>
            </div>
            <div>
              <h3>Online</h3>
              <ul className={styles.footList}>
                <li>
                  <Globe aria-hidden="true" />
                  <a href={`https://${CONTACT.website}`}>{CONTACT.website}</a>
                </li>
              </ul>
              {/* Each icon shows once its URL is set in lib/contact.ts. */}
              {Object.values(SOCIAL_LINKS).some(Boolean) ? (
                <div className={styles.socials}>
                  {SOCIAL_LINKS.linkedin ? (
                    <a href={SOCIAL_LINKS.linkedin} aria-label="Parallax on LinkedIn">
                      <Linkedin aria-hidden="true" />
                    </a>
                  ) : null}
                  {SOCIAL_LINKS.facebook ? (
                    <a href={SOCIAL_LINKS.facebook} aria-label="Parallax on Facebook">
                      <Facebook aria-hidden="true" />
                    </a>
                  ) : null}
                  {SOCIAL_LINKS.instagram ? (
                    <a href={SOCIAL_LINKS.instagram} aria-label="Parallax on Instagram">
                      <Instagram aria-hidden="true" />
                    </a>
                  ) : null}
                  {SOCIAL_LINKS.x ? (
                    <a href={SOCIAL_LINKS.x} aria-label="Parallax on X">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                        <path d="M4 4l16 16M20 4L4 20" />
                      </svg>
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.legal}>
            <span>© {year} Parallax. All rights reserved.</span>
            <nav aria-label="Legal">
              <Link href="/terms">Terms and conditions</Link>
              <Link href="/privacy">Privacy policy</Link>
            </nav>
          </div>
        </div>
      </footer>

      <DemoRequestDialog />
    </div>
  );
}

function ChainLink({ label, detail }: { label: string; detail: string }) {
  return (
    <div className={styles.link} aria-hidden="true">
      <span className={styles.headIc}>
        <ArrowRight />
      </span>
      <span className={styles.tag}>
        {label}
        <small>{detail}</small>
      </span>
    </div>
  );
}
