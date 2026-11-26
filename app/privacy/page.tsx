import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { DELETE_RETENTION_DAYS } from "@/lib/org-deletion";

export const metadata: Metadata = { title: "Privacy policy · Parallax" };

// Starting text written from what the software actually stores (see ENCRYPTED_FIELDS in
// lib/crypto.ts). Have it reviewed (Zambia's Data Protection Act, 2021) before launch, and update
// it whenever the data kept changes.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="26 November 2026">
      <section>
        <h2>What we keep</h2>
        <ul className="mt-2">
          <li><strong>Logins:</strong> name, email address, account type and a scrambled (hashed) password. We never store the password itself.</li>
          <li><strong>Businesses:</strong> name, type, town, address, phone, email, website and logo; licence number, TPIN and bank details.</li>
          <li><strong>Trade records:</strong> connections between businesses, inquiries, quotations, purchase orders, invoices, delivery notes, recorded payments and each side&apos;s private notes on an order.</li>
          <li><strong>Private contacts:</strong> the customers and suppliers a business keeps on its own list, with their contact details.</li>
          <li><strong>Stock:</strong> items, batches, expiry dates, deliveries received and stock takes, for wholesalers and pharmacies.</li>
          <li><strong>Patient records</strong> kept by a pharmacy at its sales counter: names, date of birth, contact details, allergies, insurance, prescriptions and sales.</li>
          <li><strong>Notifications and activity logs:</strong> what happened to an order or connection, who signed in and who changed which records, and when. The Parallax team&apos;s own actions are logged too.</li>
          <li><strong>Subscriptions:</strong> plan, dates and payments recorded by the Parallax team. Clients have none.</li>
          <li><strong>Demo requests:</strong> the name, business and contact details you send us from the website.</li>
        </ul>
      </section>
      <section>
        <h2>How it is protected</h2>
        <ul className="mt-2">
          <li>Every business&apos;s records are kept apart. The application and the database itself both check, on every request, which business is asking.</li>
          <li>Licence numbers, TPINs, bank details, private contact details, private order notes and patient details (other than names) are stored encrypted.</li>
          <li>Sign-in uses a secure cookie, attempts are limited, and a password reset signs the login out everywhere.</li>
        </ul>
      </section>
      <section>
        <h2>Who can see it</h2>
        <ul className="mt-2">
          <li><strong>Your business</strong> sees everything it keeps.</li>
          <li><strong>A business you trade with</strong> sees only the orders and documents between the two of you, with your name, contact details and TPIN, and the bank details printed on your own invoices. It never sees your other orders, your prices to anyone else, your stock or your private notes.</li>
          <li><strong>Connected buyers</strong> see the names of the items you choose to offer, never prices or stock.</li>
          <li><strong>Other businesses</strong> see only your name, type and town in the directory, and only if you choose to be listed.</li>
          <li><strong>The Parallax team</strong> sees business names, logins, contact details and subscriptions, so it can run accounts and billing. It cannot see your stock, prices, orders, documents, contacts or patients.</li>
        </ul>
      </section>
      <section>
        <h2>How it is used</h2>
        <p className="mt-2">
          Only to run the service: to carry orders between businesses, print documents, keep stock accurate, send
          in-app notifications and keep a record of who did what. We do not sell your data, use it for advertising,
          or share it with third parties.
        </p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p className="mt-2">
          Records are kept while your account is open. When a business account is closed, its own records are erased
          after {DELETE_RETENTION_DAYS} days. Orders it made with other businesses stay with those businesses, because
          they are part of their records too.
        </p>
      </section>
      <section>
        <h2>Cookies and storage</h2>
        <p className="mt-2">
          Parallax uses a single cookie to keep you signed in; it expires after 12 hours. Your browser may also keep
          unsent drafts, such as a stock count in progress, on your own device. There are no tracking or advertising
          cookies.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p className="mt-2">
          You can ask us to see, correct or delete personal information about you. Patient records are held by the
          pharmacy that keeps them, and records of your orders are also held by the business you traded with, so
          requests about those go to that business.
        </p>
      </section>
    </LegalPage>
  );
}
