import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · Parallax" };

// Starting text written from what the software actually stores. Have it reviewed (Zambia's
// Data Protection Act, 2021) before launch, and update it whenever the data kept changes.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="19 November 2026">
      <section>
        <h2>What we keep</h2>
        <ul className="mt-2">
          <li><strong>Accounts:</strong> name, email address, role and a scrambled (hashed) password. We never store the password itself.</li>
          <li><strong>Organisations:</strong> the wholesaler&apos;s company details, logo and bank details, and each buyer organisation&apos;s name, type and contact details.</li>
          <li><strong>Trade records:</strong> stock, orders, quotations, invoices, delivery notes and purchase orders.</li>
          <li><strong>Patient records</strong> kept at the wholesaler&apos;s retail counter: names, contact details, allergies, prescriptions and sales.</li>
          <li><strong>Activity log:</strong> who signed in and who changed records, and when.</li>
          <li><strong>Demo requests:</strong> the name, organisation and contact details you send us from the website.</li>
        </ul>
      </section>
      <section>
        <h2>How it is used</h2>
        <p className="mt-2">
          Only to run the service: to process and track orders, print trade documents, keep stock accurate and keep a
          record of who did what. We do not sell your data, use it for advertising, or share it with third parties.
        </p>
      </section>
      <section>
        <h2>Who can see it</h2>
        <ul className="mt-2">
          <li>Wholesaler staff see what their role needs. Bank details are visible only to wholesale administrators and on printed documents.</li>
          <li>Buyers see their own organisation&apos;s orders and documents, never other buyers&apos;.</li>
        </ul>
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
          You can ask to see, correct or delete personal information about you. Patient and staff records are held by
          the wholesaler, so requests about those go to the wholesaler you deal with.
        </p>
      </section>
    </LegalPage>
  );
}
