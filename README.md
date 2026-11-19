# Parallax

Parallax runs a medical wholesale: inventory with batches and expiry dates, purchase orders from manufacturers, and orders from pharmacies, hospitals and clinics through to dispatch. It also covers retail counter sales and prescriptions. Amounts are in Kwacha (ZMW).

The name: parallax is the way one object looks different from different points of view. Management, warehouse staff and finance each get their own view of the same live data.

## Setting up for a real wholesale

For a live installation, create the database without demo data, start the app, and open it in a browser:

```powershell
npm.cmd install
npm.cmd run setup:empty
npm.cmd run dev
```

Choose **Create an account** (or go to `/setup`) and follow the four steps: owner account, company details, logo and bank details. Logo and bank details can be added later under Pharmacy details. Once a wholesale is set up, the page offers sign-in and your customers can create their own accounts.

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

The development server (`npm run dev`, Turbopack) compiles each page on first visit. For day-to-day use, run the production build instead, which is much faster:

```powershell
npm.cmd run build
npm.cmd start
```

In Claude Code's desktop app, the `parallax-prod` preview in `.claude/launch.json` runs the built app on port 3100 over plain HTTP.

Production sign-in cookies are HTTPS-only. To use `npm start` over plain HTTP on a trusted local network, set `COOKIE_SECURE="false"` in `.env`.

`npm run setup` creates or updates the local database and seeds demonstration data. Seeding resets the demo database; do not use it against production data.

## Demo on a local network

Run Parallax on this computer and let other computers on the same Wi-Fi or office network use it:

```bash
npm run demo -- --reset
```

The command prints an address such as `http://192.168.0.100:3000`. Open it on the other computers. The first person to open it sets up the wholesale (owner account, company, logo and bank details). That owner then adds Finance and Sales staff under **Staff**. Client organisations sign up from the landing page, or Sales creates them under **Buyers**.

- Leave the window open during the demo; `Ctrl+C` stops it. Run `npm run demo` (without `--reset`) to carry on with the same data later.
- `npm run demo -- --seed` starts with the sample stock, orders and demo logins instead of an empty installation.
- If other computers can't connect, check:
  - all the computers are on the same network (not a guest network that isolates devices);
  - the computer's firewall allows incoming connections for Node;
  - the address printed is the current one (it can change when you reconnect to Wi-Fi).
- The demo runs over plain HTTP on a trusted network only. Don't expose it to the internet.

## Tests

```bash
npm test -- --build
```

This plays every account type's work end to end on throwaway databases, and checks each role's pages and permissions. Your own data in `prisma/dev.db` is not touched. Drop `--build` when the code hasn't changed since the last build.

## Sign-in accounts

These are local demonstration accounts created by the seed script. Change or remove demo credentials before exposing an installation to other users.

| Who | Email | Password |
| --- | --- | --- |
| Administrator | admin@pharmacore.local | Admin123! |
| Finance | finance@pharmacore.local | Finance123! |
| Sales | sales@pharmacore.local | Sales123! |
| Manufacturer (MedLine) | medline@pharmacore.local | Maker123! |
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
