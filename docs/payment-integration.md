# Online subscription payments (plan)

Status: **not built**. Today the Parallax team records every subscription payment by hand on
`/admin/billing`. This is the plan for letting manufacturers, wholesalers and pharmacies pay by
card or mobile money from their own Billing page, with the record and receipt made automatically.
It only covers what businesses pay Parallax. Payments between businesses stay records only.

## What is already in place

- **One write path.** `recordSubscriptionPayment()` in `lib/billing-server.ts` extends the paid-up
  period, numbers the receipt (`RCT-<year>-<00001>`) and writes the `SubscriptionPayment` row in one
  transaction. The team's "Mark as paid" calls it with `source: "MANUAL"`. A provider calls the
  same function with `source: "ONLINE"`.
- **Fields on `SubscriptionPayment`:**
  - `source`: `MANUAL` or `ONLINE`.
  - `status`: `PAID`, `PENDING` or `FAILED`. Only `PAID` rows count anywhere.
  - `method`: includes `CARD` and `MOBILE_MONEY`.
  - `provider` and `providerRef`: unique together, so a webhook delivered twice can't record twice.
  - `orgName`: the business's name at the time, as printed on the receipt.
- **Where the money is due.**
  - Business side: `Subscription.monthlyFee` is the amount due per month.
  - Business UI: `/billing` already has a disabled **Pay now** button behind
    `ONLINE_PAYMENTS_ENABLED` in `lib/billing.ts`.
  - Team UI: `/admin/billing` shows "Paid online" against those rows.
- **Who may write.**
  - The app's database role (`parallax_app`) can only *read* a business's own payments (RLS in
    `prisma/rls.sql`).
  - Payment rows are written through `adminDb()` (`parallax_admin`). That role is also what a
    webhook handler must use: it has no access to business trade data.

## What to build

1. **Choose a provider** that takes Zambian card and mobile money (Airtel Money, MTN MoMo,
   Zamtel Kwacha) in ZMW with hosted checkout and signed webhooks.
   - Candidates to evaluate: DPO Pay, Flutterwave, Lipila, Pawapay.
   - This is a new dependency or API and is out of scope until approved (CLAUDE.md).
2. **Checkout:** `POST /api/billing/checkout` (business, `apiTenant("billing", { write: false })`).
   - Read-only accounts must be able to pay, since paying is how they get out of read-only.
   - Body: `{ months }`. The amount is `monthlyFee × months`, computed on the server and never
     taken from the client.
   - Create a `PENDING` payment intent with the provider and return its hosted checkout URL.
   - Keep only the provider's reference.
   - **Never store card numbers or mobile-money PINs.** The hosted page collects them.
3. **Webhook:** `POST /api/billing/webhook/<provider>`.
   - Public, but verify the provider's signature before doing anything.
   - Look the payment up with the provider's API and never trust the webhook body for the amount.
   - On success, call `recordSubscriptionPayment({ source: "ONLINE", method, provider, providerRef, … })`
     with `adminDb()`. On failure, store a `FAILED` row if useful.
   - Respond 200 for duplicates; the unique `(provider, providerRef)` index catches them.
   - Add `/api/billing/webhook` to `PUBLIC` in `middleware.ts`.
4. **Return page:** `/billing?paid=<ref>` shows "Payment received, receipt RCT-…", or "still processing"
   while the row is `PENDING`.
5. **Notify both sides.**
   - Send a `Notification` to the business ("Payment received, thank you") with `notify()`.
   - Write a `platformAudit` entry with `action: "SUBSCRIPTION_PAID_ONLINE"`.
6. **Turn it on:** set `ONLINE_PAYMENTS_ENABLED` from an env var (e.g. `PAYMENTS_PROVIDER`), and
   keep the provider's secret keys in `.env` only.
7. **Refunds and disputes** stay manual at first. The team can add a negative adjustment later; no
   schema change is needed beyond a `REFUNDED` status.

## Tests to add

- Checkout refuses clients and amounts not equal to fee × months, and works for a read-only account.
- A webhook with a bad signature is refused.
- The same webhook delivered twice records one payment.
- An online payment switches a read-only account back on and shows on both Billing pages.
