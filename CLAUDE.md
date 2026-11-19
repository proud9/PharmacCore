# Parallax — project guide

**Parallax** (formerly PharmaCore) is built primarily for **medical wholesalers** in Zambia: inventory with batches and expiry, purchase orders from manufacturers, and orders from pharmacies, hospitals, clinics and other bulk customers through to dispatch. It also has a retail counter (sales, prescriptions). One installation = one wholesale business. All amounts are in Kwacha (ZMW).

The name: parallax is how one object looks different from different points of view — management, warehouse staff and finance each get their own view of the same live data. Internal identifiers keep the old name on purpose (`pharmacore_session` cookie, `pharmacore:` localStorage keys, `@pharmacore.local` demo logins); renaming them would sign everyone out or lose drafts.

Read [DESIGN.md](DESIGN.md) before touching any UI.

## Scope

**In scope (what the product is):**

1. **Retail pharmacy console** — sales counter (POS), inventory with batches and expiry, stock take, patients, prescriptions and dispensing, sales history, supplier purchase orders, reports, staff, activity log, pharmacy details.
2. **Wholesale** — staff manage buyer accounts (institutions) and incoming orders ("consignments"): send a ZMW price and ready date, then move the order through preparation and delivery.
3. **Buyer portal** — institution users place wholesale orders and track them.
4. **Manufacturer portal** (`/supplier`) — a manufacturer's single account sees the wholesale's purchase orders to it, sends a price, invoices, and dispatches with a delivery note.

**Out of scope unless the user explicitly asks:**

- Multi-branch / multi-tenant pharmacies (there is one `Pharmacy` row, `id = "main"`).
- Online payments, payment gateways, mobile-money integrations (payment is just a recorded method).
- Public storefront, patient-facing app, e-commerce, delivery tracking maps.
- Email/SMS notifications, third-party APIs, AI features.
- Swapping the stack (database, auth library, CSS framework, chart library, ORM).
- Dark mode, theme switchers, new brand colors or fonts (see DESIGN.md).
- New npm dependencies when the existing ones can do the job.

When a request would push past this scope, say so and ask before building.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript (strict) |
| Database | SQLite via Prisma 6 (`prisma/schema.prisma`, file `prisma/dev.db`) |
| Auth | Custom JWT (`jose`, HS256, 12 h) in httpOnly cookie `pharmacore_session`; passwords hashed with `bcryptjs` |
| Validation | `zod` in every API route |
| Styling | Tailwind CSS 3 with custom tokens; shared classes in `app/globals.css` |
| Icons / charts / dates | `lucide-react`, `recharts`, `date-fns` |
| Excel | `exceljs` (server only, `lib/xlsx.ts`): inventory import template and .xlsx uploads |

## Commands

```bash
npm install
npm run setup      # prisma generate + db push + seed (first run only; demo data)
npm run setup:empty  # schema only, no demo data: for a real wholesale, which then signs up at /setup
npm run dev        # http://localhost:3000 (Turbopack; `npm run dev:webpack` if it misbehaves)
npm run build
npm start          # production server after a build: much faster than dev
npm run db:seed    # reseed
npm run db:studio
npm test           # end-to-end tests on throwaway databases (add -- --build after code changes)
npm run demo       # host a demo on the local network (prisma/demo.db; -- --reset for a fresh installation)
```

Env (`.env`, see `.env.example`): `DATABASE_URL="file:./dev.db"`, `AUTH_SECRET` (long random string), optional `COOKIE_SECURE` (production cookies are HTTPS-only; `"false"` allows `npm start` over plain HTTP on a trusted network, otherwise sign-in silently fails there). On Windows PowerShell use `npm.cmd` or `start.cmd`. Demo logins are in [README.md](README.md) and `prisma/seed.ts`.

No linter is configured. Check changes with `npx tsc --noEmit`, `npm test -- --build`, and by running the app.

**Tests** (`scripts/test/`, plain TypeScript run with `tsx`, no framework): `run.ts` gives each suite a fresh SQLite file in `prisma/` and its own `next start` server, so `dev.db` is never touched.
- `workflow.ts` plays the whole business from an empty installation, in order:
  - set-up, staff, stocking;
  - buying from a manufacturer: manufacturer and login, purchase order, manufacturer price, Finance accepts, manufacturer invoice and dispatch, Sales receives and completes the Inventory lines (stock up), Finance pays;
  - clients ordering;
  - price, accept, invoice, delivery note, dispatch (stock leaves), payment;
  - counter sale, dispensing, stock take, activity log.
  It also scans every page it opens for raw codes and retail wording.
- `roles.ts` (seeded demo data) covers account creation, the page and API permission matrix for all five roles (including MANUFACTURER, which only sees its own purchase orders), and the order rules.
- `harness.ts` has the `Client` (cookie per person; follows redirects streamed inside a 200 under `loading.tsx`), `check()`, timings and the wording scan.
- Add a check whenever you add a page, route or role.

## Project map

```
app/
  layout.tsx              Root: fonts (Schibsted Grotesk headings, Source Sans 3 body, both via next/font), metadata, globals.css
  icon.png                Favicon (Parallax logo)
  page.tsx                Public landing page (styles in landing.module.css; components/landing/)
  terms/, privacy/        Public legal pages (components/LegalPage)
  page.tsx                Redirects to role home or /login
  login/page.tsx          Split-screen sign-in (uses components/auth/AccountForm)
  (console)/              Staff area; layout.tsx requires a user and wraps in <Shell>
    dashboard/            Home: KPIs, 14-day sales chart, low stock, expiring soon
    pos/                  Sales counter (components/pos/PosDesk.tsx)
    inventory/            ALL item/stock additions and changes: delivery queue, Add item, CSV import,
                          per-row edit (details + current stock) (components/inventory/)
    inventory/[id]/       Product detail: batches, expiry, receive a batch
    inventory/deleted/    Delete queue: deleted items, days left, Restore
    stock-take/           Count only: close qty sheet + finish, recent takes (components/stock/StockSheet)
    stock-take/[id]/      Stock take report (moved / all lines) with CSV downloads
    patients/             Patient records
    prescriptions/        Record + dispense
    sales/                Receipts
    purchases/            Purchase orders to manufacturers (paged, status filter); new/ (SALES raises one),
                          [id]/ (price, accept, invoice, payments, receive), manufacturers/ (suppliers + their login)
    reports/              Analytics
    staff/                Users (ADMIN only)
    audit/                Activity log
    settings/             Company details, bank details, logo (ADMIN, FINANCE can edit)
    wholesale/            Orders list, [id] detail (quote/status), accounts/ (buyers), payments/ (invoice balances, overdue; FINANCE/ADMIN)
    demo-requests/        "Request a demo" submissions from the landing page (ADMIN only)
  setup/page.tsx          Wholesale set-up wizard (components/setup/SetupWizard): account, company, logo, bank
  documents/              Printable pages (no Shell): [id]/[kind] wholesale quotation/invoice/delivery note,
                          sales/[id] retail receipt; buyers may open these
  (portal)/portal/        Buyer area; layout.tsx requires role BUYER
    page.tsx              My orders
    new/                  New order
    orders/[id]/          Order tracking, invoice balance and bank details
  (supplier)/supplier/    Manufacturer area; layout.tsx requires role MANUFACTURER
    page.tsx              Its purchase orders
    orders/[id]/          Send/change price, decline, invoice, dispatch, see payments
  api/                    Route handlers (POST unless noted)
    auth/login, auth/logout
    auth/signout (GET)    PUBLIC: clears the cookie, redirects to /login?ended=1 (layouts send stale or deactivated sessions here)
    lookup (GET)          Search-as-you-type for pickers: ?kind=products|patients&q= (&rx=1, &type=); max 10; buyers get products without price/stock
    sales, patients, prescriptions, prescriptions/[id]/dispense
    stock/receive, stock-take, staff
    purchases             SALES raises a PO (status SENT)
    purchases/[id]/quote, invoice   Manufacturer, or FINANCE entering a paper one for a manufacturer without a login
    purchases/[id]/dispatch         Manufacturer: delivery note + qty sent
    purchases/[id]/status           ACCEPTED (FINANCE), CANCELLED (staff), DECLINED (manufacturer)
    purchases/[id]/payment          FINANCE: total paid against the manufacturer's invoice
    purchases/[id]/receive          SALES: delivery arrives → StockIntake lines in Inventory
    manufacturers         SALES: add a Supplier and/or its single MANUFACTURER login
    inventory/items       Add/update items from the Add item form (JSON), matched by stock code
    inventory/import      Upload the Excel template (.xlsx) or a CSV; same rules via lib/items.ts
    inventory/items/[id]  Inline edit: details, current stock, and the shown batch's no., entered and expiry; reason required (audited)
    inventory/items/[id]/delete   Move to the delete queue (reason + confirm required)
    inventory/items/[id]/restore  Restore from the delete queue
    inventory/intake/[id]  Complete a queued delivery line: save details, add the batch
    inventory/template (GET)  Excel import template (.xlsx) with Type/Prescription dropdowns
    stock-take/[id]/report (GET)  Report CSV, ?show=moved|all
    wholesale/accounts, consignments, consignments/[id]/quote, consignments/[id]/status,
                          consignments/[id]/invoice, consignments/[id]/delivery
    pharmacy, pharmacy/logo (GET+POST)   Company details and logo (canEditCompany)
    search (GET)          Header search, scoped by role
    demo-requests         PUBLIC: landing page demo form (zod + honeypot field `website`)
    demo-requests/[id]/contacted  Mark contacted / new (ADMIN)
    setup                 PUBLIC: wholesale set-up (owner ADMIN + company details); 409 once set up
    auth/register         PUBLIC: creates a BUYER account + its Institution (landing page sign-up)
components/
  Shell.tsx               Sidebar + header; role-based nav lives here
  PageHeader, StatCard, Badge, SalesChart, MixChart
  PageSkeleton.tsx        Loading outline used by (console)/loading.tsx and (portal)/loading.tsx
  charts.tsx              Lazy (next/dynamic, ssr:false) SalesChart/MixChart: import charts from here so recharts loads on demand
  Pagination.tsx          "Showing 1–50 of N" + page links; keeps the URL's other params
  LegalPage.tsx           Frame for /terms and /privacy
  search/                 ListSearch + ListFilter (URL-driven search/filter for paged lists), LookupPicker + useLookup
                          (server-searched pickers via /api/lookup), HeaderSearch, SearchScope (client filter: small lists only)
  documents/              TradeDocument, InvoiceSheet, CompanyMark, DocumentFrame, PrintButton
  landing/                LandingNav (scroll-spy), DispatchFeed (+ dispatches.ts), DemoRequestDialog
  auth/AccountForm.tsx    Sign in / create account form (landing page + login); #sign-in / #create-account pick the tab
  inventory/              InventoryTable (add, CSV, row edit), EditItemRow, IntakeQueue, SheetLineFields
  stock/                  StockSheet (close qty count + finish only)
  purchasing/             PO forms (NewPurchaseOrderForm, SupplierQuoteForm, SupplierInvoiceForm, DispatchForm,
                          PaymentForm, PoActions, ManufacturerForm) and usePost (POST + error + refresh)
  forms/, pos/, wholesale/   Client components per feature
lib/
  auth.ts                 Session sign/read/cookie, requireUser(), role guards
  paths.ts                homePath(role)
  pharmacy.ts             getPharmacy(): the `main` row, cached per request (React cache); use it instead of db.pharmacy.findUnique
  paging.ts               PAGE_SIZE (50), paging(params, size?) → {page, take, skip}, searchText(params)
  contact.ts              Parallax's own CONTACT details and SOCIAL_LINKS (placeholders; null link = icon hidden)
  utils.ts                cn(), money(), ref(), stockOf(), ROLES, ROLE_LABEL
  stocksheet.ts           Item/sheet rules: OTC/DDA, RX_OPTIONS, IMPORT_COLUMNS, CSV/table parser, csvCell, zod schemas (client-safe, no db)
  items.ts                saveItems(): shared add/update logic for the form and file imports
  setup.ts                isSetUp() (an ADMIN exists), setupGaps() (logo/bank missing)
  bank-note.ts            BANK_DETAILS_NOTE shown wherever bank details are entered (client-safe)
  deletion.ts             Delete queue: RETENTION_DAYS (30), purgeExpiredDeletions(), daysLeft()
  xlsx.ts                 buildItemsTemplate(), readItemsWorkbook() (server only)
  inventory.ts            onHand(), deductStock(tx, ...) (FEFO), setStockLevel(tx, ...), receiveBatch(), expiryWindow() (90 days)
  documents.ts            Helpers for printable trade documents
  wholesale.ts            Consignment statuses, labels, statusTone(), adminNextStatuses()
  audit.ts                audit() writes AuditLog
  db.ts                   Prisma singleton
  purchasing.ts           PO statuses, labels (staff and manufacturer wording), poStatusTone(), poTotal() (client-safe)
  purchase-access.ts      loadPurchaseOrder(id, who): auth + manufacturer-owns-it check for PO routes
middleware.ts             Auth gate + role routing (BUYER confined to /portal, MANUFACTURER to /supplier)
prisma/schema.prisma, seed.ts
scripts/rename-pharmacy.ts  One-off: resets pharmacy name
scripts/migrate-roles.ts    One-off: moves users on removed retail roles to SALES (npm run db:migrate-roles)
```

## Domain model

- **User** — staff or buyer; `role` is a string from `ROLES`; buyers link to an **Institution**.
- **Product** → many **Batch** (lot, expiry, quantity). Stock on hand = sum of batch quantities; there is no stock column on Product.
- **Sale** → SaleItem; **Prescription** → PrescriptionItem (status PENDING → DISPENSED); **PurchaseOrder** → PurchaseOrderItem + PurchaseOrderEvent (status history; `SENT → QUOTED → ACCEPTED → DISPATCHED → RECEIVED`, `DECLINED`/`CANCELLED`; old `DRAFT`/`ORDERED` act as ACCEPTED). Item `unitCost` is the expected cost until the manufacturer prices it; the expected cost is never shown to the manufacturer. A **Supplier** (manufacturer) has at most one MANUFACTURER user (`User.supplierId`); **StockTake** → StockTakeItem (`systemQty` = open qty, `countedQty` = close qty, `unitPrice` snapshot).
- **Page responsibilities:** Inventory is the only place items or stock are added or changed (new items, CSV import, delivery queue, row edits, receiving a batch). Stock take only records close qty, finishes counts and shows reports. Don't add item or stock-entry controls to Stock take.
- **Deleting items:** never hard-delete a Product directly. Delete sets `active=false` + `deletedAt` (delete queue). `purgeExpiredDeletions()` runs when Inventory or the queue loads (there is no scheduler): after 30 days it erases items with no history, and locks items with history (`purgedAt`, sku suffixed `~DEL-xxxxxx`, batches removed) so receipts and reports keep working. Show codes in history with `displayCode()`. Any new product list must filter `active: true`.
- **Dropdown values live in one place:** `DRUG_TYPES` and `RX_OPTIONS` in `lib/stocksheet.ts` feed both the site form selects and the Excel template's dropdowns; `IMPORT_COLUMNS` defines the template columns. Change them there, not in the template or the form.
- **Inventory batch columns:** "Batch no." (`lotNumber`, with "+N more" linking to the product page), "Entered" (`receivedAt`) and "Expiry" all describe the same batch (the earliest-expiring batch with stock). Opening stock from the form/import uses the given Entered date (default today).
- **StockIntake** — a delivered supplier line waiting in Inventory (`PENDING` → `DONE`). Receiving a purchase order stores the supplier `deliveryNoteNo` and creates intakes; **no stock is added until the intake is completed** with expiry/price, which creates the Batch.
- Stock sheet columns map to Product: stock code = `sku`, category no. = `categoryNo`, description = `name`, type DDA = `controlled` (else OTC), unit sale = `unit`, price = `sellingPrice`; expiry = earliest batch with stock. Sold = open − close; amount = sold × price. Finishing a take sets stock to the close qty.
- **Consignment** (wholesale order) → ConsignmentItem + ConsignmentEvent (status history).
- **AuditLog**, **Pharmacy** (single row `main`, currency `ZMW`), **Supplier**, **Category**, **Patient**.

SQLite has no enums: status/role/kind fields are strings. Keep the allowed values in `lib/` constants and validate them with zod.

## Roles and access

| Role | Label | Home | Can |
| --- | --- | --- | --- |
| ADMIN | Administrator | /dashboard | Everything. The owner account is created at `/setup`; only admins manage staff and demo requests |
| FINANCE | Finance | /wholesale/payments | Prices/quotations, invoices and payments received, Payments page, reports, company and bank details; views orders, sales, purchases, inventory, activity log |
| SALES | Sales | /wholesale | Stock intake and inventory, stock take, purchase deliveries, sales counter, patients, prescriptions, buyer accounts, order status and delivery notes; views orders, sales, activity log |
| BUYER | Client account | /portal | One account per client (pharmacy, clinic, hospital, school): place orders, accept or cancel quotes, track, see invoice balance and bank details |
| MANUFACTURER | Manufacturer | /supplier | One account per manufacturer: its own purchase orders only. Send/change a price, decline, invoice, dispatch, see what has been paid |

Purchase orders split the work: SALES raises them, adds manufacturers and receives deliveries; FINANCE accepts prices, records payments (Payments page has a "We owe manufacturers" view) and enters paper quotes/invoices for manufacturers without a login.

Guards in `lib/auth.ts`: `isStaff` (ADMIN/FINANCE/SALES), `canManageStaff` (ADMIN), `canFinance`, `canSell` (`canAdjustStock`/`canDispense` are the same), `canEditCompany`, `isBuyer`, `isManufacturer`. The console layout redirects any non-staff role to its home. The retail roles (WHOLESALE_ADMIN, PHARMACIST, TECHNICIAN, CASHIER, INVENTORY) were removed; `npm run db:migrate-roles` moves their users to SALES, and `requireUser()` treats any left over as SALES (`LEGACY_ROLES`). Middleware lets every signed-in role reach `/api/*`, so **every route needs its own role guard**; staff-only routes use at least `isStaff`. A new role or permission means updating `ROLES`/`ROLE_LABEL`, the guard, `Shell.tsx` nav, `homePath`, and `middleware.ts` together.

Order pages split the work: finance sees the price and invoice forms, sales sees status actions and the delivery note form (admin sees both). A price can change until it is invoiced; changing an accepted price sets the order back to `QUOTED` so the buyer accepts again. **Stock leaves at dispatch:** moving an order to `DISPATCHED` needs a delivery note and deducts its delivered quantities (FEFO) in the same transaction; the note is locked after that. Recording a payment on an issued invoice adds a "Payment recorded" / "Paid in full" event and a `PAYMENT_RECORDED` audit entry. Show statuses with `STATUS_LABEL`, and free text that may hold codes (order history, activity log) through `plainStatus()`. Pages holding private data (Staff, Patients, Prescriptions, Payments, Reports) redirect roles that can't use them; a few others (Buyers, Stock take, Delete queue, Company details) are read-only for roles outside their menu.

Wholesale flow: `REQUESTED → QUOTED → ACCEPTED → PREPARING → READY → DISPATCHED → DELIVERED`, with `DECLINED`/`CANCELLED` exits. Staff transitions come from `adminNextStatuses()`; the buyer can accept a quote (`QUOTED → ACCEPTED`) or cancel while `REQUESTED`/`QUOTED`. Every transition writes a ConsignmentEvent.

## Conventions

- **Lists that grow are paged on the server.** Read `?q=`, `?page=` and filters from `searchParams`, build a Prisma `where` (`contains` is case-insensitive for ASCII in SQLite), load one page with `paging()` plus a `count`, and render `ListSearch`/`ListFilter` + `Pagination`. Totals and KPIs come from `count`/`aggregate`/`groupBy` (or `$queryRaw` with `Prisma.sql`), never from loading every row. Pickers over products/patients use `LookupPicker`/`useLookup`, never a `<select>` of every record. `SearchScope` (client-side filter) is only for lists that stay small (staff, buyer accounts).
- **Navigation and caching:**
  - Internal links use `next/link` (never `<a href="/…">`, which reloads the whole app). Plain `<a>` is right only for downloads, `/api/*`, `/documents/*` opened for print, external URLs, and `#hash` links the landing page and AccountForm listen for.
  - `(console)/loading.tsx` and `(portal)/loading.tsx` let links prefetch the layout and show `PageSkeleton` at once on click.
  - `next.config.ts` `staleTimes` keeps visited pages in the client cache for 30 s (static 5 min). **Every save must call `router.refresh()`**, which empties that cache; a new client component that writes data without it will show stale pages.
  - Sign-in, sign-out and finishing set-up use `window.location.assign()` on purpose: a full load clears one user's cached pages before the next user on a shared PC.
  - `requireUser()` and `getPharmacy()` are wrapped in React `cache()`, so a layout and its page share one query per request.
  - `/brand/*` images are served with a one-week `Cache-Control`; give a changed brand image a new file name.
- **Indexes:** filter and sort columns have `@@index` in the schema; add one when a new list filters or sorts on a new column.
- **Pages are server components** that query Prisma directly. Interactive pieces are `"use client"` components in `components/<feature>/` that `fetch` an API route, then `router.refresh()`.
- **API routes** follow `app/api/sales/route.ts`: `requireUser()` → 401; role guard → 403; `zod.safeParse` → 400 with a plain-English `error`; multi-row writes in `db.$transaction`; then `audit({ action: "UPPER_SNAKE", entity, entityId, details })`; respond `NextResponse.json(...)`.
- Every state-changing action writes an audit entry.
- References come from `ref(prefix)` (`INV` sale, `RX` prescription, `CN` consignment, `ST` stock take). Money is formatted with `money()` (ZMW). Dates use `date-fns` `format(d, "dd MMM yyyy")`.
- Stock leaves via `deductStock(tx, productId, qty)` (earliest expiry first), always inside `db.$transaction` with the `tx` client so a failure rolls back every batch and enters as a new Batch. Never write a quantity onto Product.
- Imports use the `@/` alias. Use `cn()` for conditional classes.
- UI copy is plain English for pharmacy staff ("Sales counter", not "POS"; "Price sent", not "QUOTED"). See DESIGN.md.
- Schema changes: edit `schema.prisma`, run `npm run db:push`, update `seed.ts` so a fresh setup still works.

## Landing page and brand

- `app/page.tsx` is the public marketing page for wholesalers (signed-in visitors see "Open Parallax" instead of sign-in). Its copy speaks to wholesalers; the sign-up form creates **customer** (BUYER) accounts, and wholesalers are pointed to "Request a demo".
- Company contact details are placeholders (`CONTACT` in `lib/contact.ts`). Social icons show only once their URL is set in `SOCIAL_LINKS`. `/terms` and `/privacy` are public starter texts written from what the app stores: have them legally reviewed before launch and update them when the data kept changes.
- Logo files live in `public/brand/` (`parallax-logo.svg` master, `parallax-logo.png` large, `-512`, `-96` and `-64` PNGs with transparent backgrounds). The SVG wraps embedded PNGs (not true vectors). On pages use `parallax-logo-96.png` (13 KB) for marks up to ~48 px; the large files are for print or social images.

## Wholesale set-up (one wholesale per installation)

- An installation is **set up** once an ADMIN user exists (`isSetUp()`). Before that: the landing page's "Create an account" goes to `/setup`, the account section invites the wholesaler to set up, and customer sign-up (`/api/auth/register`) returns 409.
- `/setup` (public) creates the owner's ADMIN account and the `Pharmacy` row (name, phone, address, email, licence, TPIN, website) in one transaction, signs them in, then offers the logo (`/api/pharmacy/logo`) and bank details (`/api/pharmacy`). Both can be skipped; `FinishSetup` on the dashboard and wholesale pages reminds administrators until they are added.
- Once set up, `/setup` redirects to sign-in and a second set-up is refused. Several wholesalers sharing one installation is **not** supported (would need a tenant on every record).
- Bank details are stored as plain fields in the database, readable only through wholesale-admin routes. `BANK_DETAILS_NOTE` promises they are only printed on documents and that Parallax never takes money; keep it true (no payment features).
- To look around after `npm test`: `.claude/launch.json` has `parallax-test` (port 3200 on `prisma/test-workflow.db`, the installation the workflow test built; logins use password `Passw0rd!`, e.g. `owner@kilmers.test`, `chanda@kilmers.test`, `noah@kilmers.test`, `grace@banda.test`).
- **Network demo:** `npm run demo` (`scripts/demo.ts`) builds if needed and serves on `0.0.0.0:3000` from `prisma/demo.db` with `COOKIE_SECURE=false`. It prints the LAN address(es) and keeps a Mac awake. `--reset` gives a fresh empty installation, `--seed` loads demo data instead, and `--port` changes the port.
- To try set-up locally without touching dev data: `.claude/launch.json` has `parallax-setup-test` (runs against `prisma/setup-test.db`; create it with `DATABASE_URL="file:./setup-test.db" npx prisma db push`).

## Known issues

- Wording: staff screens say "Buyers" and "Create buyer account" while the role label and portal say "Client account".
