# PharmaCore — project guide

Pharmacy management system for a single pharmacy branch in Zambia, with a wholesale side that sells to hospitals, clinics and other pharmacies. All amounts are in Kwacha (ZMW).

Read [DESIGN.md](DESIGN.md) before touching any UI.

## Scope

**In scope (what the product is):**

1. **Retail pharmacy console** — sales counter (POS), inventory with batches and expiry, stock take, patients, prescriptions and dispensing, sales history, supplier purchase orders, reports, staff, activity log, pharmacy details.
2. **Wholesale** — staff manage buyer accounts (institutions) and incoming orders ("consignments"): send a ZMW price and ready date, then move the order through preparation and delivery.
3. **Buyer portal** — institution users place wholesale orders and track them.

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
npm run setup      # prisma generate + db push + seed (first run only)
npm run dev        # http://localhost:3000
npm run build
npm run db:seed    # reseed
npm run db:studio
```

Env (`.env`, see `.env.example`): `DATABASE_URL="file:./dev.db"`, `AUTH_SECRET` (long random string). On Windows PowerShell use `npm.cmd` or `start.cmd`. Demo logins are in [README.md](README.md) and `prisma/seed.ts`.

There is no test suite and no linter configured. Check changes with `npx tsc --noEmit` and by running the app.

## Project map

```
app/
  layout.tsx              Root: fonts (Playfair Display headings, Source Sans 3 body, both via next/font), globals.css
  page.tsx                Redirects to role home or /login
  login/page.tsx          Split-screen sign-in
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
    purchases/            Supplier purchase orders; "Receive delivery" records the supplier delivery note
    reports/              Analytics
    staff/                Users (ADMIN only)
    audit/                Activity log
    settings/             Pharmacy details, bank details, logo (ADMIN, WHOLESALE_ADMIN can edit)
    wholesale/            Orders list, [id] detail (quote/status), accounts/ (buyers)
  documents/              Printable pages (no Shell): [id]/[kind] wholesale quotation/invoice/delivery note,
                          sales/[id] retail receipt; buyers may open these
  (portal)/portal/        Buyer area; layout.tsx requires role BUYER
    page.tsx              My orders
    new/                  New order
    orders/[id]/          Order tracking
  api/                    Route handlers (POST unless noted)
    auth/login, auth/logout
    sales, patients, prescriptions, prescriptions/[id]/dispense
    stock/receive, stock-take, purchases/[id]/receive, staff
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
    pharmacy, pharmacy/logo (GET+POST)   Pharmacy details and logo (canWholesale)
    search (GET)          Header search, scoped by role
components/
  Shell.tsx               Sidebar + header; role-based nav lives here
  PageHeader, StatCard, Badge, SalesChart, MixChart
  documents/              TradeDocument, InvoiceSheet, CompanyMark, DocumentFrame, PrintButton
  inventory/              InventoryTable (add, CSV, row edit), EditItemRow, IntakeQueue, SheetLineFields
  stock/                  StockSheet (close qty count + finish only)
  forms/, pos/, search/, wholesale/   Client components per feature
lib/
  auth.ts                 Session sign/read/cookie, requireUser(), role guards
  paths.ts                homePath(role)
  utils.ts                cn(), money(), ref(), stockOf(), ROLES, ROLE_LABEL
  stocksheet.ts           Item/sheet rules: OTC/DDA, RX_OPTIONS, IMPORT_COLUMNS, CSV/table parser, csvCell, zod schemas (client-safe, no db)
  items.ts                saveItems(): shared add/update logic for the form and file imports
  deletion.ts             Delete queue: RETENTION_DAYS (30), purgeExpiredDeletions(), daysLeft()
  xlsx.ts                 buildItemsTemplate(), readItemsWorkbook() (server only)
  inventory.ts            onHand(), deductStock(tx, ...) (FEFO), setStockLevel(tx, ...), receiveBatch(), expiryWindow() (90 days)
  documents.ts            Helpers for printable trade documents
  wholesale.ts            Consignment statuses, labels, statusTone(), adminNextStatuses()
  audit.ts                audit() writes AuditLog
  db.ts                   Prisma singleton
middleware.ts             Auth gate + role routing (BUYER confined to /portal)
prisma/schema.prisma, seed.ts
scripts/rename-pharmacy.ts  One-off: resets pharmacy name
```

## Domain model

- **User** — staff or buyer; `role` is a string from `ROLES`; buyers link to an **Institution**.
- **Product** → many **Batch** (lot, expiry, quantity). Stock on hand = sum of batch quantities; there is no stock column on Product.
- **Sale** → SaleItem; **Prescription** → PrescriptionItem (status PENDING → DISPENSED); **PurchaseOrder** → PurchaseOrderItem; **StockTake** → StockTakeItem (`systemQty` = open qty, `countedQty` = close qty, `unitPrice` snapshot).
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

| Role | Home | Can |
| --- | --- | --- |
| ADMIN | /dashboard | Everything, including staff and wholesale |
| WHOLESALE_ADMIN | /wholesale | Wholesale orders, buyers, inventory, audit, settings |
| PHARMACIST | /dashboard | Retail + dispense + adjust stock |
| TECHNICIAN, CASHIER | /dashboard | Retail console |
| INVENTORY | /dashboard | Retail + adjust stock |
| BUYER | /portal | Own institution's orders only |

Guards in `lib/auth.ts`: `isStaff` (any non-buyer), `canManageStaff`, `canWholesale`, `canDispense`, `canAdjustStock`, `isBuyer`. Middleware lets every signed-in role reach `/api/*`, so **every route needs its own role guard**; staff-only routes use at least `isStaff`. A new role or permission means updating `ROLES`/`ROLE_LABEL`, the guard, `Shell.tsx` nav, `homePath`, and `middleware.ts` together.

Wholesale flow: `REQUESTED → QUOTED → ACCEPTED → PREPARING → READY → DISPATCHED → DELIVERED`, with `DECLINED`/`CANCELLED` exits. Staff transitions come from `adminNextStatuses()`; the buyer can accept a quote (`QUOTED → ACCEPTED`) or cancel while `REQUESTED`/`QUOTED`. Every transition writes a ConsignmentEvent.

## Conventions

- **Pages are server components** that query Prisma directly. Interactive pieces are `"use client"` components in `components/<feature>/` that `fetch` an API route, then `router.refresh()`.
- **API routes** follow `app/api/sales/route.ts`: `requireUser()` → 401; role guard → 403; `zod.safeParse` → 400 with a plain-English `error`; multi-row writes in `db.$transaction`; then `audit({ action: "UPPER_SNAKE", entity, entityId, details })`; respond `NextResponse.json(...)`.
- Every state-changing action writes an audit entry.
- References come from `ref(prefix)` (`INV` sale, `RX` prescription, `CN` consignment, `ST` stock take). Money is formatted with `money()` (ZMW). Dates use `date-fns` `format(d, "dd MMM yyyy")`.
- Stock leaves via `deductStock(tx, productId, qty)` (earliest expiry first), always inside `db.$transaction` with the `tx` client so a failure rolls back every batch and enters as a new Batch. Never write a quantity onto Product.
- Imports use the `@/` alias. Use `cn()` for conditional classes.
- UI copy is plain English for pharmacy staff ("Sales counter", not "POS"; "Price sent", not "QUOTED"). See DESIGN.md.
- Schema changes: edit `schema.prisma`, run `npm run db:push`, update `seed.ts` so a fresh setup still works.

## Known issues

None open. Add new ones here when found, and remove them once fixed.
