import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { GRACE_DAYS, TRIAL_DAYS } from "@/lib/subscription";
import { DELETE_RETENTION_DAYS } from "@/lib/org-deletion";

export const metadata: Metadata = { title: "Terms and conditions · Parallax" };

// Starting text written from how the software works. Have it reviewed by a lawyer before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms and conditions" updated="26 November 2026">
      <section>
        <h2>What Parallax is</h2>
        <p className="mt-2">
          Parallax is a trading network for medicine supply in Zambia. Manufacturers, wholesalers, pharmacies (retailers)
          and clients such as hospitals, clinics, schools and NGOs each have their own business account. They use it to
          connect with each other, ask for and send quotes, place orders, issue invoices and delivery notes, record
          payments and, where they hold stock, keep their inventory.
        </p>
      </section>
      <section>
        <h2>Business accounts</h2>
        <ul className="mt-2">
          <li>Each business has one account with one login. Give accurate details about your business when you sign up, and keep your password to yourself.</li>
          <li>You are responsible for what is done with your login. Tell us straight away if you think someone else has used it.</li>
          <li>Only list your business in the directory if you are allowed to trade in what you offer. Other businesses see only your name, type and town there.</li>
          <li>The Parallax team may suspend an account that breaks these terms, and may reset a login&apos;s password when you ask. We cannot see your prices, stock or trade documents.</li>
        </ul>
      </section>
      <section>
        <h2>Trading with other businesses</h2>
        <ul className="mt-2">
          <li>Parallax is the place where businesses trade, not a party to their trade. Quotations, purchase orders, invoices and delivery notes are issued by the businesses themselves.</li>
          <li>An inquiry is a request. An order is agreed when the seller sends a quote and the buyer accepts it, which issues the purchase order. Prices are in Zambian Kwacha (ZMW).</li>
          <li>Payment terms (pay before delivery, on delivery or on credit) are set by the seller and shown on the quote.</li>
          <li>Supply, quality, delivery, returns and any dispute about an order are between the seller and the buyer.</li>
          <li>A connection can be ended by either business. Orders already made stay on record for both.</li>
        </ul>
      </section>
      <section>
        <h2>Payments</h2>
        <p className="mt-2">
          Parallax does not take, hold or move money between businesses. Bank details a business enters are printed on
          its own quotations and invoices so buyers pay it directly. Payments recorded in Parallax are records only.
        </p>
      </section>
      <section>
        <h2>Subscriptions</h2>
        <ul className="mt-2">
          <li>Manufacturers, wholesalers and pharmacies pay a subscription. New accounts start with a {TRIAL_DAYS}-day free trial.</li>
          <li>Hospitals, clinics, schools, NGOs and other client accounts use Parallax free of charge.</li>
          <li>If a subscription is not renewed, the account keeps working for {GRACE_DAYS} days with a reminder. After that it becomes read-only: you can sign in, view and print your records, but not create new ones, until it is renewed.</li>
        </ul>
      </section>
      <section>
        <h2>Closing an account</h2>
        <p className="mt-2">
          When a business account is closed, its logins stop working at once and its own records (items, stock,
          contacts, patients and logs) are erased after {DELETE_RETENTION_DAYS} days. Orders it made with other
          businesses stay on record for those businesses, under the name it had at the time.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <ul className="mt-2">
          <li>Use Parallax only for lawful trade in medicines and medical supplies, in line with Zambian law and the licences you hold.</li>
          <li>Do not try to reach another business&apos;s data, disrupt the service, or share your login with people outside your business.</li>
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
