# Parallax — project guide

**Parallax** (formerly PharmaCore) is a trading network for medicine supply in Zambia. Manufacturers, wholesalers, retailers (pharmacies) and clients (hospitals, clinics, schools, NGOs) each have a private business account and trade with each other: inquiry → quotation → purchase order → invoice and delivery note → payment. Wholesalers and retailers keep inventory with batches and expiry; retailers also have a sales counter with patients and prescriptions. All amounts are in Kwacha (ZMW). One hosted installation serves every business.

The name: parallax is how one object looks different from different points of view. Each business sees the same order from its own side, and no business sees another's prices. Internal identifiers keep the old name on purpose (`pharmacore_session` cookie, `pharmacore:` localStorage keys); renaming them would sign everyone out or lose drafts.

Read [DESIGN.md](DESIGN.md) before touching any UI.

## Scope

**In scope:**

1. **Five account types** (`lib/capabilities.ts`): the Parallax team (`ADMIN`, platform only) and four business kinds, `MANUFACTURER`, `WHOLESALER`, `RETAILER`, `CLIENT`. One login per business.
2. **Trade between businesses**: directory and connections, item lists without prices, the unified order flow, printable documents, private contact lists for businesses not on Parallax, payments recorded by the seller.
3. **Inventory** (wholesalers, retailers): items, batches, expiry, delivery queue, stock take, delete queue. **Item list only** for manufacturers.
4. **Retail counter** (retailers only): sales counter, patients, prescriptions, counter sales, reports.
5. **Parallax team area** (`/admin`): businesses, logins (create, reset, switch off), billing (who is due or overdue, mark as paid with numbered receipts, fees, suspend), announcements, demo requests, team activity. It never sees business data.
6. **Billing for paying businesses** (`/billing`): subscription status, due date, fee, how to pay, payment history and receipts. Online card / mobile-money payment is planned (docs/payment-integration.md), not built.
7. **In-app notifications** (order events, connection requests, team announcements).

**Out of scope unless the user explicitly asks:**

- Online payments, payment gateways, mobile-money integrations (payments are recorded, never taken). Subscriptions included: the plan in docs/payment-integration.md is ready, but building it needs the user's go-ahead.
- Email or SMS delivery (planned later behind the same `Notification`/`Announcement` records), third-party APIs, AI features.
- Several logins or staff roles inside one business (the schema allows it later: `User.orgId`).
- Public storefront, patient-facing app, delivery tracking maps.
- Swapping the stack (database, auth library, CSS framework, chart library, ORM).
- Dark mode, theme switchers, new brand colors or fonts (see DESIGN.md).
- New npm dependencies when the existing ones can do the job.

When a request would push past this scope, say so and ask before building.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript (strict) |
| Database | PostgreSQL via Prisma 6 (`prisma/schema.prisma`), row-level security in `prisma/rls.sql` |
| Auth | Custom JWT (`jose`, HS256, 12 h) in httpOnly cookie `pharmacore_session`; carries `orgId` and `sv` (session version); passwords hashed with `bcryptjs` |
| Encryption | AES-256-GCM via `node:crypto` (`lib/crypto.ts`), key `DATA_KEY` |
| Validation | `zod` in every API route |
| Styling | Tailwind CSS 3 with custom tokens; shared classes in `app/globals.css` |
| Icons / charts / dates | `lucide-react`, `recharts`, `date-fns` |
| Excel | `exceljs` (server only, `lib/xlsx.ts`): inventory import template and .xlsx uploads |

## Commands

```bash
npm install
npm run setup        # prisma generate + db (create, push, roles, RLS) + demo seed
npm run setup:empty  # same without demo data
npm run db:push      # after schema changes: push + re-apply prisma/rls.sql
npm run db:reset     # drop, recreate, seed
npm run admin:create -- --email x@y --name "Name"   # a Parallax team login (temporary password)
npm run dev          # http://localhost:3000
npm run build && npm start
npm test             # end-to-end on throwaway Postgres databases (add -- --build after code changes)
npm run demo         # LAN demo on database parallax_demo (-- --reset empty, -- --seed demo data)
npx tsx scripts/test/rls-check.ts   # database-level isolation checks against your own database
npx tsx scripts/guide-shots.ts      # re-take the guide screenshots (public/guide) from a seeded copy
```

Env (`.env`, see `.env.example`): `DIRECT_URL` (database owner: schema and RLS only), `DATABASE_URL` (role `parallax_app`, not the owner, so RLS applies), `ADMIN_DATABASE_URL` (role `parallax_admin`, no grants on business tables), `AUTH_SECRET`, `DATA_KEY` (32 bytes base64; back it up), optional `COOKIE_SECURE`. `scripts/db.ts push` creates both roles with the passwords in those URLs. Local Postgres on this Mac: `brew services start postgresql@17`.

No linter is configured. Check changes with `npx tsc --noEmit`, `npm test -- --build`, and by running the app.

**Tests** (`scripts/test/`, plain TypeScript with `tsx`): `run.ts` gives each suite a fresh database `parallax_test_<suite>` and its own `next start` from `.next-test`.
- `workflow.ts` plays the network from empty: sign-ups of every type, encryption at rest, the team's work (admin:create, forced password change, create business, reset, suspend, announcement, subscription payment), connections and terms, items, manufacturer → wholesaler purchase (intake → stock), wholesaler → retailer on PREPAY, wholesaler → client on CREDIT, retailer → client, price change after acceptance, decline/cancel/expiry, offline customers and suppliers with documents, retail counter, stock take, subscription lapse → read-only (clients stay free). It scans pages for raw codes.
- `access.ts` (seeded): page matrix for every type, cross-business isolation (404s on orders, documents, items, contacts, search, catalog), the team's limits, the grace period, the database checks (`rls-check.ts`), and a code check that no file reads tenant tables through `db` from `lib/db`.
- `harness.ts` has the `Client` (cookie per person; follows redirects streamed inside a 200 under `loading.tsx`), `check()`, timings and the wording scan.
- Add a check whenever you add a page, route or account type.

## Project map

```
app/
  layout.tsx, page.tsx (landing), terms/, privacy/, login/, signup/ (business sign-up)
  account/password/       Change password (forced after a temporary one)
  (console)/              Business area; layout.tsx needs a business login, renders <Shell> with nav by capability
    dashboard/            Per account type: inquiries, to dispatch, owed, quotes to review, low stock, counter sales
    orders/               Selling: list, [id] (OrderDetail, side seller), new/ (quotation for a customer)
    purchases/            Buying: list, [id] (OrderDetail, side buyer), new/ (choose supplier or private contact)
    customers/, suppliers/   Connections + private contacts (components/trade/PartnersPage)
    suppliers/[orgId]/    A connected supplier's item list (names only) → inquiry (OrderBuilder)
    directory/            Find businesses you can trade with; ask to connect
    payments/             Owed to you / you owe (invoices with a balance)
    items/                Item list without stock (manufacturers)
    inventory/, inventory/[id], inventory/deleted/, stock-take/, stock-take/[id]   (wholesalers, retailers)
    pos/, sales/, patients/, prescriptions/, reports/   (retailers)
    audit/, settings/ (business details, bank, logo, terms), notifications/
    guide/                How Parallax works for this account type (components/guide/BusinessGuide)
    billing/              Subscription status, fee, how to pay, payment history + receipts (paying kinds, cap "billing")
  (admin)/admin/          Parallax team: overview, businesses (+[id]), billing (+[orgId]), announcements, demo-requests, activity, guide
  documents/[id]/[kind]   inquiry | quotation | purchase-order | invoice | delivery-note (both parties only)
  documents/sales/[id]    Counter receipt
  documents/subscription/[id]  Subscription receipt (the business that paid, or the team)
  api/
    auth/login (rate-limited), logout, signout (GET), register (PUBLIC sign-up)
    account/password
    company, company/logo (GET ?org=, POST)
    connections (ask), connections/[id] (ACCEPT | DECLINE | END | TERMS)
    contacts, contacts/[id] (edit or {delete:true})
    trade/orders (create), trade/orders/[id] (QUOTE | ACCEPT | DECLINE | CANCEL | PROGRESS | INVOICE | DISPATCH | RECEIVE | PAYMENT | NOTES)
    trade/catalog (GET ?seller=): connected seller's items, CATALOG_SELECT only
    items, items/[id] (details or {offered})
    inventory/*, stock/receive, stock-take, stock-take/[id]/report, sales, patients, prescriptions(+dispense)
    lookup (GET), search (GET), notifications/read
    admin/businesses (+[id], [id]/status), admin/billing/[orgId] (fee), admin/billing/[orgId]/payments (mark as paid), admin/users/[id], admin/announcements
    demo-requests (PUBLIC), demo-requests/[id]/contacted (team)
components/
  SidebarLayout.tsx       Collapsible dark sidebar shared by Shell and AdminShell (icons fixed, labels fade)
  Shell.tsx               Business sidebar/header: nav filtered by capability, notification bell, subscription notice
  admin/                  AdminShell, CreateBusinessForm, BusinessForms, AnnouncementForm
  trade/                  OrdersList, OrderDetail, OrderForms (step forms), OrderBuilder, NewOrderPage, PartnersPage,
                          ConnectionActions, ContactForm
  documents/              TradeDocument (5 kinds), InvoiceSheet, CompanyMark (logo by org id), DocumentFrame
  inventory/              InventoryTable, IntakeQueue, CatalogItems (item list + OfferedToggle), …
  guide/                  BusinessGuide (per account type, built from capabilities), TeamGuide, Blocks (sections, Shot, Steps, Note…),
                          animated NetworkMap, OrderFlow, FlowStrip (useCycle: pause, hover-stop, reduced motion)
  usePost.ts              POST + error + router.refresh()
lib/
  capabilities.ts         ORG_KINDS, ROLES, ROLE_LABEL, TRADE_PAIRS, can(kind, capability), PAYING_KINDS, homePath (client-safe)
  auth.ts                 Session, startSession(), requireUser() (user + org + subscription; checks active, org status, sv)
  tenant.ts               THE data layer: forOrg(), getTenant(), pageTenant(cap), apiTenant(cap, {write}), partyDb(), OWNED
  db.ts                   base (raw app client), db (platform tables), adminDb() (team role), withCrypto()
  crypto.ts               ENCRYPTED_FIELDS, seal/open, applied by withCrypto
  trade.ts                Statuses, side labels, tones, PAYMENT_TERMS, CATALOG_SELECT, balanceOf, plainStatus (client-safe)
  trade-server.ts         loadOrder(t, id) → {order, side}, actsAs(), viewFor(), addEvent(), dueDate(), linesTotal()
  subscription.ts         subscriptionState(), TRIAL_DAYS 30, GRACE_DAYS 14, READ_ONLY_MESSAGE
  billing.ts              BILLING_METHODS, labels, team filters, ONLINE_PAYMENTS_ENABLED (client-safe)
  billing-server.ts       billingWhere() (team filters), recordSubscriptionPayment() (the one write path: period + receipt no.)
  admin.ts, passwords.ts  pageAdmin()/apiAdmin(), temporaryPassword()
  notify.ts               notify(t, orgId, …) (createMany: no RETURNING under RLS)
  audit.ts                audit(t, …) (business log), platformAudit(…) (team log)
  org-deletion.ts         purgeDeletedOrgs() after 30 days (orders with others are kept)
  inventory.ts, items.ts, deletion.ts, stocksheet.ts, xlsx.ts, paging.ts, contacts.ts, item-schema.ts, rate-limit.ts
middleware.ts             Signed in or not; ADMIN confined to /admin, businesses kept out of /admin
prisma/schema.prisma, rls.sql, seed.ts
scripts/db.ts (push, envForDatabase), create-admin.ts, demo.ts, prod-build.ts, serve-test.ts, guide-shots.ts, test/
public/guide/             Guide screenshots (made by scripts/guide-shots.ts; do not edit by hand)
```

## Domain model

- **Platform tables** (no tenant): `Organization` (the business: kind, name, town, listed, defaultPaymentTerms/creditDays, status ACTIVE|SUSPENDED|DELETED; encrypted licence, TPIN, bank fields), `User` (role = `ADMIN` or the org's kind, `orgId`, `mustChangePassword`, `sessionVersion`), `Subscription` (periodEnd, trialEndsAt, monthlyFee; paying kinds only), `Announcement` + `AnnouncementRead`, `PlatformAudit`, `DemoRequest`.
- **`SubscriptionPayment`** carries `orgId` (in `OWNED`): a business reads its own rows through `t.db` (RLS, SELECT only); only `parallax_admin` writes, through `recordSubscriptionPayment()`. Fields for online payments (`source`, `status`, `provider`, `providerRef`) are ready; only `status: "PAID"` rows count.
- **Tenant tables** carry `orgId` (also on child rows): `Category`, `Product` (`offered` = shown to connected buyers; `@@unique([orgId, sku])`), `Batch`, `StockIntake`, `StockTake(+Item)`, `Patient` (encrypted contact/health fields; names plain for search), `Prescription(+Item)`, `Sale(+Item)`, `AuditLog`, `Contact` (private counterparties, encrypted details), `Notification`, `ProductLink` (supplier item → my item).
- **Shared trade tables** (exactly two parties): `TradeLink` (seller, buyer, PENDING|ACTIVE|DECLINED|ENDED, terms override), `TradeOrder` (+ `TradeOrderItem`, `TradeOrderEvent`, `TradePayment`). One side may be a private `Contact` (channel `OFFLINE`); the creating business then takes both sides' steps (`actsAs()`).
- Order flow: `INQUIRY → QUOTED → ORDERED → (PREPARING → READY) → DISPATCHED → RECEIVED → CLOSED`; `DECLINED` (seller), `CANCELLED` (buyer before ORDERED, seller before DISPATCHED); a quote past `validUntil` reads as `EXPIRED`. Changing a price after acceptance returns it to `QUOTED`; a price can't change once invoiced. `PREPAY` orders must be invoiced and paid in full before dispatch; others may dispatch first. **Stock leaves at dispatch** (seller with inventory; each line must be linked to a seller item). **Stock arrives through the delivery queue**: receiving creates `StockIntake` lines (pre-matched via `ProductLink`), and stock is added when a line is completed with batch and expiry. Orders close when received and paid in full.
- Item lines keep a snapshot (name, strength, form, unit); `sellerProductId` is only ever shown to the seller and `buyerProductId` to the buyer (`viewFor()`).
- **Page responsibilities:** Inventory is the only place stocked items or stock are added or changed. Stock take only records close qty and reports. Manufacturers manage items on `/items`.
- **Deleting items:** never hard-delete a Product directly (delete queue, `purgeExpiredDeletions(t)`; any new product list must filter `active: true`). **Deleting a business**: status DELETED, logins off, tenant rows erased after 30 days; trade orders stay (name snapshots).
- Dropdown values live in one place (`DRUG_TYPES`, `RX_OPTIONS`, `IMPORT_COLUMNS` in `lib/stocksheet.ts`; `PAYMENT_TERMS`, `PAYMENT_METHODS`, `TRADE_STATUSES` in `lib/trade.ts`; `ORG_KINDS`, `TRADE_PAIRS` in `lib/capabilities.ts`). Strings in the database, validated with zod.

## Isolation and access (read before writing any query)

1. **Never read or write tenant or trade tables through `db`/`base` from `lib/db`.** Use the business's client: pages `const t = await pageTenant("cap")`, routes `const auth = await apiTenant("cap"); if (!auth.ok) return auth.response; const { t } = auth;`, then `t.db` for single queries and `t.tx(async (tx) => …)` for multi-step writes. `t.db` adds `orgId` to every owned-model `where` and sets `app.org_id` so RLS applies. Creates must still pass `orgId: t.org.id`. Raw SQL only inside `t.tx` (quote identifiers: `"orgId"`). The access test fails on violations.
2. **Records of another business answer 404** (`notFound()` from `lib/tenant.ts`), never 403. Check ownership of every id taken from a request (products, patients, contacts, order lines) before using it in a write.
3. Trade orders: load with `loadOrder(t, id)`, check `actsAs(order, t.org.id, side)` for steps, pass `viewFor(order, side)` to client components. Another business's items are read only via `partyDb(t.org.id)` with `CATALOG_SELECT` (never prices, cost or stock).
4. Writes go through `apiTenant(cap)` which returns 403 for read-only (lapsed) accounts; pass `{ write: false }` for GET routes. Clients never lapse.
5. A notification for another business: `notify()` (createMany). Plain `create` with RETURNING is refused by RLS.
6. The Parallax team uses `pageAdmin()`/`apiAdmin()` and `adminDb()`, which cannot read business tables. Don't add business data to admin screens, and no impersonation.
7. New tenant table: add `orgId`, add it to `OWNED` in `lib/tenant.ts`, add RLS lines to `prisma/rls.sql`, add a check to `access.ts`. New sensitive field: add it to `ENCRYPTED_FIELDS` (it can't be searched or sorted).
8. A new account type or capability means updating `lib/capabilities.ts`, `Shell.tsx` nav, page/route guards, `middleware.ts` if it has its own area, and the access test's page matrix.

## Conventions

- **Lists that grow are paged on the server.** Read `?q=`, `?page=` and filters from `searchParams`, build a Prisma `where` (Postgres `contains` is case-sensitive: add `mode: "insensitive"`), load one page with `paging()` plus a `count`, and render `ListSearch`/`ListFilter` + `Pagination`. Totals come from `count`/`aggregate`/`groupBy`, never from loading every row. Pickers over products/patients use `LookupPicker`/`useLookup`.
- **Navigation and caching:**
  - Internal links use `next/link`. Plain `<a>` is right only for downloads, `/api/*`, `/documents/*` opened for print, external URLs, and `#hash` links.
  - `(console)/loading.tsx` and `(admin)/loading.tsx` show `PageSkeleton` at once on click.
  - `staleTimes` keeps visited pages cached for 30 s. **Every save must call `router.refresh()`** (`usePost` does) or do a full navigation.
  - Sign-in, sign-out and password changes use `window.location.assign()` on purpose (clears one user's cached pages before the next).
  - `requireUser()` and `getTenant()` are wrapped in React `cache()`.
- **Indexes:** filter and sort columns have `@@index`, leading with `orgId` (or `sellerOrgId`/`buyerOrgId`) on tenant and trade tables.
- **Pages are server components** using `t.db`. Interactive pieces are `"use client"` components in `components/<feature>/` that `fetch` an API route, then refresh.
- **API routes**: guard (`apiTenant`/`apiAdmin`) → `zod.safeParse` → 400 with a plain-English `error`; multi-row writes in `t.tx`; then `audit(t, { action: "UPPER_SNAKE", entity, entityId, details })` (team: `platformAudit`). Route files export only HTTP handlers; shared schemas go in `lib/`.
- Every state-changing action writes an audit entry.
- **Guides** (`/guide`, `/admin/guide`) describe each account type's screens and steps with real button names. When you change a flow, a pictured screen or a rule the guide states (terms, retention, trial and grace days come from the constants), update `components/guide/*` and re-run `npx tsx scripts/guide-shots.ts` (seeds `parallax_test_guide`, serves port 3300, captures with headless Chrome at 2×).
- References come from `ref(prefix)` (`INQ`, `QT`, `PO`, `INV`, `DN`, `RX`, `ST`). Money via `money()`. Dates `format(d, "dd MMM yyyy")`.
- Stock leaves via `deductStock(tx, productId, qty)` (earliest expiry first) inside `t.tx`. Never write a quantity onto Product.
- Imports use the `@/` alias. Use `cn()` for conditional classes.
- UI copy is plain English ("Quote sent", not "QUOTED"; "Pay on account (credit)", not "CREDIT"). Each side has its own status wording (`SELLER_LABEL`, `BUYER_LABEL`). See DESIGN.md.
- Schema changes: edit `schema.prisma`, run `npm run db:push`, update `seed.ts` and `rls.sql` as needed.

## Landing page and brand

- `app/page.tsx` is the public marketing page (signed-in visitors see "Open Parallax"). It speaks to all four business types (supply chain, order steps, features per type); sign-up (`/signup`, or AccountForm in register mode on the landing page) creates any of them. "Request a demo" stores a `DemoRequest` for the team.
- Company contact details are placeholders (`CONTACT` in `lib/contact.ts`). `/terms` and `/privacy` are starter texts written from how the network works and what it stores (they read `TRIAL_DAYS`, `GRACE_DAYS`, `DELETE_RETENTION_DAYS`): have them legally reviewed before launch, and update them whenever `ENCRYPTED_FIELDS`, what is stored, or who can see it changes.
- Logo files live in `public/brand/`. Business logos are uploaded per organisation to `data/branding/<orgId>/` and served by `/api/company/logo?org=`.

## Known issues

- Reports cover the retail counter only; there is no trade report yet.
- The sign-in rate limit is in memory (one server process).
