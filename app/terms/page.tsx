import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms and conditions · Parallax" };

// Starting text written from how the software works. Have it reviewed by a lawyer before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms and conditions" updated="19 November 2026">
      <section>
        <h2>What Parallax is</h2>
        <p className="mt-2">
          Parallax is software for medical wholesalers in Zambia. A wholesaler uses it to manage stock, purchase orders
          and dispatch. The pharmacies, hospitals, clinics and other buyers it supplies use it to place orders and
          follow them through to delivery.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <ul className="mt-2">
          <li>Give accurate details when you create an account, and keep your password to yourself.</li>
          <li>You are responsible for what is done with your account. Tell the wholesaler straight away if you think someone else has used it.</li>
          <li>The wholesaler may deactivate staff or customer accounts, for example when someone leaves an organisation.</li>
        </ul>
      </section>
      <section>
        <h2>Orders, prices and delivery</h2>
        <ul className="mt-2">
          <li>An order placed in Parallax is a request. It becomes an agreement only when the wholesaler sends a price and ready date and the buyer accepts it.</li>
          <li>Prices are in Zambian Kwacha (ZMW). Quotations, invoices and delivery notes are issued by the wholesaler, not by Parallax.</li>
          <li>Supply, delivery, returns and any dispute about an order are between the wholesaler and the buyer.</li>
        </ul>
      </section>
      <section>
        <h2>Payments</h2>
        <p className="mt-2">
          Parallax does not take, hold or move money. Bank details entered by a wholesaler are printed on its
          quotations and invoices so buyers can pay the wholesaler directly. Payment methods recorded in Parallax are
          notes only.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <ul className="mt-2">
          <li>Use Parallax only for lawful trade in medicines and medical supplies, in line with Zambian law and the licences you hold.</li>
          <li>Do not try to reach data you are not meant to see, disrupt the service, or share your access with others.</li>
        </ul>
      </section>
      <section>
        <h2>Availability and changes</h2>
        <p className="mt-2">
          We work to keep Parallax available and accurate but cannot promise it will never be interrupted. Keep your
          own records of anything you rely on. We may update these terms; the date at the top shows when they last
          changed.
        </p>
      </section>
    </LegalPage>
  );
}
