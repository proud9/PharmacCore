import Link from "next/link";
import {
  CalendarClock,
  ClipboardCheck,
  Facebook,
  Factory,
  FileSpreadsheet,
  Globe,
  HandCoins,
  History,
  Hospital,
  Instagram,
  Linkedin,
  LockKeyhole,
  Mail,
  MapPin,
  MonitorSmartphone,
  Phone,
  Printer,
  Stethoscope,
  Store,
  UsersRound,
  Warehouse,
  ArrowRight,
  Building2,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import AccountForm from "@/components/auth/AccountForm";
import { DispatchFeed } from "@/components/landing/DispatchFeed";
import { DemoRequestDialog } from "@/components/landing/DemoRequestDialog";
import { LandingNav } from "@/components/landing/LandingNav";
import { requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { isSetUp } from "@/lib/setup";
import { CONTACT, SOCIAL_LINKS } from "@/lib/contact";
import styles from "./landing.module.css";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Factory, title: "Purchase orders", text: "Order from manufacturers and suppliers, then receive each delivery against its delivery note." },
  { icon: CalendarClock, title: "Batches and expiry dates", text: "Every lot number and expiry date in the warehouse. Stock always leaves earliest-expiry first." },
  { icon: HandCoins, title: "Customer orders and pricing", text: "Price incoming orders in Kwacha and set a ready date. Customers accept online." },
  { icon: Printer, title: "Invoices and delivery notes", text: "Created from the order itself, ready to print or save as PDF." },
  { icon: ClipboardCheck, title: "Stock takes", text: "Count the warehouse; quantities moved and their value are worked out for you." },
  { icon: UsersRound, title: "Customer accounts", text: "Each pharmacy, hospital or clinic gets its own login and sees only its own orders." },
  { icon: FileSpreadsheet, title: "Excel import", text: "Bring in your existing stock sheet with one upload." },
  { icon: History, title: "Activity log", text: "Every order, price change and stock correction, with who made it and why." },
];

const STEPS = [
  { title: "Request", text: "A pharmacy, hospital or clinic lists the medicines and quantities it needs.", party: "Customer" },
  { title: "Price", text: "You send a Kwacha price and a ready date.", party: "You" },
  { title: "Accept", text: "The customer accepts your price online.", party: "Customer" },
  { title: "Dispatch", text: "You pick the stock, earliest expiry first, and issue the delivery note.", party: "You" },
  { title: "Delivered", text: "The order arrives, with its invoice and delivery note on file for both of you.", party: "Both" },
];


export default async function Home() {
  // requireUser checks the account still exists and is active, not just the cookie.
  const [session, setUp] = await Promise.all([requireUser(), isSetUp()]);
  const year = new Date().getFullYear();
  // Before a wholesale owns this installation, "Create an account" means setting it up.
  const createHref = setUp ? "#create-account" : "/setup";

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
                Parallax runs your medical wholesale: stock in from manufacturers, orders in from pharmacies, hospitals
                and clinics, and every batch out of the warehouse on time.
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
              <h2>Between the manufacturer and the ward.</h2>
              <p>Your wholesale sits in the middle of the supply chain. Parallax connects you to both ends of it.</p>
            </div>
            <div className={styles.chain}>
              <article className={styles.stage}>
                <Factory className={styles.icon} aria-hidden="true" />
                <h3>Manufacturers and suppliers</h3>
                <p>Raise purchase orders, then receive each delivery against its delivery note, batch by batch.</p>
              </article>
              <ChainLink label="Stock in" detail="Purchase orders" />
              <article className={`${styles.stage} ${styles.you}`}>
                <Warehouse className={styles.icon} aria-hidden="true" />
                <h3>Your wholesale</h3>
                <p>Every batch and expiry date in your warehouse, every customer order and every invoice, in one place.</p>
              </article>
              <ChainLink label="Orders out" detail="Dispatch and delivery" />
              <article className={styles.stage}>
                <span className={styles.icons}>
                  <Store className={styles.icon} aria-hidden="true" />
                  <Hospital className={styles.icon} aria-hidden="true" />
                  <Stethoscope className={styles.icon} aria-hidden="true" />
                </span>
                <h3>Pharmacies, hospitals and clinics</h3>
                <p>Your bulk customers order online, accept your prices and follow each delivery to their door.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.band} id="how">
          <div className={styles.wrap}>
            <div className={styles.head}>
              <h2>How a customer order moves.</h2>
              <p>
                Your customers see the same order, price and status as you do, so they stop phoning to ask where their
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
              <h2>Everything a medical wholesale runs on.</h2>
              <p>From the delivery arriving from the manufacturer to the order leaving for the ward.</p>
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
          {setUp ? (
            <div className={`${styles.wrap} ${styles.accountGrid}`}>
              <div className={styles.accountCopy}>
                <h2>Order from your wholesaler online.</h2>
                <p className={styles.intro}>
                  Pharmacies, hospitals and clinics: create a customer account to place orders, accept prices and follow
                  deliveries.
                </p>
                <ul className={styles.points}>
                  <li>
                    <MonitorSmartphone className={styles.icon} aria-hidden="true" />
                    <span>Nothing to install. Parallax runs in your browser, on a computer or phone.</span>
                  </li>
                  <li>
                    <LockKeyhole className={styles.icon} aria-hidden="true" />
                    <span>Your orders and documents are visible only to you and your wholesaler.</span>
                  </li>
                  <li>
                    <Warehouse className={styles.icon} aria-hidden="true" />
                    <span>
                      Running a wholesale?{" "}
                      <button type="button" className={styles.inlineLink} data-demo>
                        Request a demo
                      </button>{" "}
                      to see Parallax with your own stock.
                    </span>
                  </li>
                </ul>
              </div>
              <AccountForm allowRegistration initialMode="register" />
            </div>
          ) : (
            <div className={`${styles.wrap} ${styles.accountGrid}`}>
              <div className={styles.accountCopy}>
                <h2>Set up your wholesale.</h2>
                <p className={styles.intro}>
                  Four short steps: your owner account, company details, logo and bank details. Your documents are ready
                  to send as soon as you finish.
                </p>
                <ul className={styles.points}>
                  <li>
                    <Building2 className={styles.icon} aria-hidden="true" />
                    <span>Company details go straight onto your quotations, invoices and delivery notes.</span>
                  </li>
                  <li>
                    <Landmark className={styles.icon} aria-hidden="true" />
                    <span>Bank details print on invoices so customers can pay you. Parallax never takes money out.</span>
                  </li>
                  <li>
                    <UsersRound className={styles.icon} aria-hidden="true" />
                    <span>Once you&apos;re set up, your pharmacies, hospitals and clinics can create accounts to order from you.</span>
                  </li>
                </ul>
              </div>
              <div className={styles.setupCard}>
                <h3>Ready when you are</h3>
                <p>It takes about five minutes. You can add the logo and bank details later if you don&apos;t have them to hand.</p>
                <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/setup">
                  Set up your wholesale
                </Link>
                <p className={styles.setupAlt}>
                  Already set up? <Link href="/login">Sign in</Link>
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer} id="contact">
        <div className={styles.wrap}>
          <div className={styles.demoBanner}>
            <div>
              <h2>Setting up a wholesale? See Parallax with your own stock.</h2>
              <p>We&apos;ll walk your team through orders, batches and dispatch, and help you bring your stock sheet across.</p>
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
              <p>Inventory, ordering and dispatch for medical wholesalers in Zambia.</p>
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
