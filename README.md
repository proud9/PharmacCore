# Parallax

Parallax is a trading network for medicine supply in Zambia. Manufacturers, wholesalers, retailers (pharmacies) and clients (hospitals, clinics, schools, NGOs) each have a private account. They trade with each other the way they would going from business to business for quotes, but on the system: inquiry → quotation → purchase order → invoice and delivery note → payment. Wholesalers and retailers also keep inventory with batches and expiry dates, and retailers have a sales counter with patients and prescriptions. Amounts are in Kwacha (ZMW).

No business can see another's prices, stock or documents. A buyer sees a supplier's item names (never prices) only once both have connected. Prices exist only in the quote a seller sends to that one buyer.

## Requirements

- Node.js and npm
- PostgreSQL 15 or newer. On a Mac: `brew install postgresql@17 && brew services start postgresql@17`.

## Setup

1. Copy `.env.example` to `.env` and fill it in:
   - the three database URLs;
   - `AUTH_SECRET`, a long random string;
   - `DATA_KEY`, the field encryption key. Back it up: encrypted fields can't be read without it.
2. Install and create the database:

   ```bash
   npm install
   npm run setup
   ```

   This creates the database and its two roles, pushes the schema, applies row-level security (`prisma/rls.sql`) and loads demo data. Use `npm run setup:empty` for a real installation without demo data.
3. Create a login for the Parallax team (there is no public sign-up for it):

   ```bash
   npm run admin:create -- --email you@example.com --name "Your Name"
   ```

   It prints a temporary password, which you change at first sign-in.
4. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. For day-to-day use, `npm run build` then `npm start` is much faster.

After schema changes, run `npm run db:push`. `npm run db:reset` recreates the database with demo data.

Production sign-in cookies are HTTPS-only. Set `COOKIE_SECURE="false"` only to run `npm start` over plain HTTP on a trusted local network.

## Account types

| Account | Created by | Sells to | Buys from | Has |
| --- | --- | --- | --- | --- |
| **Parallax team** | `npm run admin:create` | — | — | Businesses, logins, subscriptions, announcements, demo requests. No access to any business's stock, prices or documents. |
| **Manufacturer** | Sign-up, or the Parallax team | Wholesalers | — | Item list (no stock), orders, documents |
| **Wholesaler** | Sign-up, or the Parallax team | Retailers, clients | Manufacturers | Inventory and stock take, orders, purchases |
| **Retailer** | Sign-up, or the Parallax team | Clients | Wholesalers | Inventory, sales counter, patients, prescriptions, orders, purchases |
| **Client** | Sign-up, or the Parallax team | — | Wholesalers, retailers | Purchases. Free of charge. |

Each business has one login. Businesses sign up at `/signup` (or "Create an account" on the landing page). Manufacturers, wholesalers and retailers start with a 30-day trial. Their **Billing** page shows when they are due, how to pay, and every receipt. The Parallax team marks accounts as paid on its own **Billing** page, which issues a numbered receipt. Fourteen days after a subscription ends, the account becomes read-only until it is renewed. Paying online by card or mobile money is planned (docs/payment-integration.md).

## How trading works

1. **Connect.** Find businesses in **Find businesses** and ask to connect; the other side accepts. Sellers set payment terms per customer: pay before delivery, on delivery, or on credit.
2. **Inquiry.** The buyer opens a supplier from **Suppliers**, picks items from its list (names only) or types lines, and sends the inquiry.
3. **Quotation.** The seller prices each line in **Orders** and sends the quote. Only that buyer sees it.
4. **Purchase order.** The buyer accepts, which sends the purchase order.
5. **Invoice and delivery note.** These come in the order the terms require: paid first, or delivered first. Dispatching takes the stock out of the seller's inventory (earliest expiry first).
6. **Receiving.** The buyer confirms what arrived. Wholesalers and retailers then finish each line in Inventory (batch and expiry), which adds the stock.
7. **Payment.** The seller records payments. The order closes once it is received and paid in full.

Customers or suppliers who aren't on Parallax go on your private list (**Customers** / **Suppliers**). You can still make their documents and print or save them as PDF; you record their side's steps yourself.

## Keeping businesses apart

- **Sessions** carry the business. Every page and API route checks it, and another business's records answer "not found".
- **Tenant data layer** (`lib/tenant.ts`): every query on business-owned tables is filtered to the signed-in business.
- **Row-level security** in Postgres (`prisma/rls.sql`) applies the same rule inside the database. The app connects as a role that cannot bypass it. The Parallax team's screens use a separate role with no access to business tables at all.
- **Field encryption** (AES-256-GCM, `lib/crypto.ts`): bank details, TPIN, licence numbers, private contact details, private order notes and patient details are encrypted in the database.

## Demo logins

From `npm run setup` (demo data). Every password is `Parallax2026!`.

| Who | Email |
| --- | --- |
| Parallax team | team@parallax.local |
| Manufacturer: Zambia Pharma Industries | zpi@parallax.local |
| Manufacturer: Apex Generics | apex@parallax.local |
| Wholesaler: Kilmer's Medical Wholesale | kilmers@parallax.local |
| Wholesaler: Copperbelt Medical Supplies (payment due) | copperbelt@parallax.local |
| Retailer: Lusaka Central Pharmacy | central@parallax.local |
| Retailer: Kabwe Family Pharmacy (trial, connection pending) | kabwe@parallax.local |
| Client: University Teaching Hospital | uth@parallax.local |
| Client: Hope NGO Clinic | hope@parallax.local |

Change or remove demo logins before exposing an installation to other users.

## Demo on a local network

```bash
npm run demo -- --seed
```

This serves Parallax on `0.0.0.0:3000` from its own database (`parallax_demo`) and prints the address for other computers on the same network. Use `--reset` instead of `--seed` for an empty installation. The demo runs over plain HTTP: use it on a trusted network only.

For a live presentation where each device creates its own account, follow [docs/demo/README.md](docs/demo/README.md):
- `npm run demo:rehearse` plays the whole script over this computer's network address (on its own database) and must pass before the day.
- `npm run demo:files` makes the wholesaler's opening-stock sheet.
- `npm run demo:admin -- --email team@demo.local --name "Parallax Team"` creates the team login on the demo database.

## Tests

```bash
npm test -- --build
```

Each suite runs on its own throwaway Postgres database (`parallax_test_workflow`, `parallax_test_access`), so your data is not touched:

- **workflow** plays the whole network from empty: sign-ups, the Parallax team's work, connections, and orders along the chain with stock and payments;
- **access** checks each account type's pages, that no business reaches another's records, the database-level locks, and that code only reads business tables through `lib/tenant.ts`.

`npx tsx scripts/test/rls-check.ts` runs only the database-level checks against your own database.

Drop `--build` when the code hasn't changed since the last build.

Each account has a **Guide** page (`/guide`, and `/admin/guide` for the team) with screenshots of the real screens. After changing a pictured screen, re-take them with `npx tsx scripts/guide-shots.ts` (needs Google Chrome; it uses its own throwaway database on port 3300). To look around the installation the workflow test built, run `npx tsx scripts/serve-test.ts` (port 3200).
