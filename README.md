# PharmaCore

PharmaCore is a pharmacy management system for stock, sales, patient records, and wholesale orders. Amounts are in Kwacha (ZMW).

## Setup and start

Requirements: Node.js and npm.

```powershell
npm.cmd install
npm.cmd run setup
npm.cmd run dev
```

Open http://localhost:3000. Stop the development server with `Ctrl+C`.

For an existing database, apply schema changes before starting the updated app:

```powershell
npm.cmd run db:push
```

`npm run setup` creates or updates the local database and seeds demonstration data. Seeding resets the demo database; do not use it against production data.

## Sign-in accounts

These are local demonstration accounts created by the seed script. Change or remove demo credentials before exposing an installation to other users.

| Who | Email | Password |
| --- | --- | --- |
| Administrator | admin@pharmacore.local | Admin123! |
| Wholesale manager | wholesale@pharmacore.local | Whole123! |
| Pharmacist | pharmacist@pharmacore.local | Pharma123! |
| Cashier | cashier@pharmacore.local | Cash123! |
| Hospital buyer (UTH) | uth@pharmacore.local | Buyer123! |
| Clinic buyer | clinic@pharmacore.local | Buyer123! |
| Pharmacy buyer | partner@pharmacore.local | Buyer123! |

## Wholesale trade documents

Wholesale managers can prepare printable quotations, invoices, and delivery notes from an order. Buyers can view issued documents on their order in the portal.

1. Sign in as the wholesale manager and open **Wholesale orders**, then select an order.
2. Send or update a quotation. Set a unit price for every order line, tax rate, ready date, quotation expiry date, and buyer message. Optional terms are included on the document.
3. The buyer signs in to the portal, opens the order, reviews the quotation, and accepts it. The invoice action is available after acceptance.
4. Issue or update the invoice with its due date, amount already paid, and payment terms.
5. Once the order is being prepared, issue or update the delivery note. Enter quantities delivered, delivery method, driver/vehicle, dispatch location, line remarks, and any delivery exceptions.
6. Open each issued document and select **Print or save PDF**.

The order page includes document links for wholesale staff. Buyers see links to their quotation, invoice, and delivery note as each document is issued. Buyers can only access orders belonging to their institution.

### Pharmacy details, bank information, and logo

Before printing quotations or invoices, a wholesale manager should open **Pharmacy details** and save the correct pharmacy trading details, TPIN, bank name, account name, and account number. Branch and SWIFT/sort code are optional. These values are printed from the pharmacy record; they are not entered on an individual order.

The same page allows an authorized user to upload a PNG, JPG, or WebP logo up to 1.5 MB. The uploaded image is used on trade documents. If no logo is uploaded, the document displays a logo placeholder. Uploaded logo files are stored under `data/branding` and are excluded from Git.

Delivery notes include a receiver acknowledgement and signature line to be completed on paper.

### Sales-counter invoice

Completing a sales-counter transaction creates its invoice number and provides a **Print invoice** link. Saved sales can also be opened from **Sales** by selecting the invoice number. The sales invoice layout includes item lines, tax, discounts, payment method, total paid, and balance. The counter invoice uses the sale date as its due date and records the sale total as paid.

## Other areas

- **Home** — sales, low stock, and items near expiry.
- **Sales counter** — sell items and reduce stock.
- **Inventory** — products, batches, and expiry.
- **Wholesale orders** — manage hospital, clinic, and pharmacy requests.
- **Buyers** — manage organization accounts.
- **Search** — find products, patients, sales, and orders.

## Validation

```powershell
npm.cmd run build
npx.cmd tsc --noEmit
```

For a guided operator walkthrough, see [New features walkthrough](docs/NEW-FEATURES-WALKTHROUGH.docx).
