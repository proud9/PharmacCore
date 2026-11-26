# Backlog

Open work left after the multi-business rebuild, guides and billing (26 Nov 2026). Each item is
self-contained enough to start in a fresh session: read CLAUDE.md and DESIGN.md first. Nothing here
is a known bug; the test suite (`npm test -- --build`) is green.

## Planned, not built

### 1. Trade report
Reports (`/reports`) cover only the retail counter. Sellers and buyers have no report on trade
between businesses.
- Sellers want sales by customer and by item, quotes won and lost, invoiced vs paid, and overdue.
- Buyers want spend by supplier and outstanding invoices.
- Build from `TradeOrder`/`TradeOrderItem`/`TradePayment` through `t.db`. Totals must come from
  `groupBy`/`aggregate`, never from loading every row.
- Add a CSV download, in the same style as the stock-take report.
- Show it to every type with `sell` or `buy`. It needs a capability or nav decision for
  manufacturers and clients, who have no Reports item today.

### 2. Per-business encryption keys
`lib/crypto.ts` uses one `DATA_KEY` for every business. The plan was a subkey per business
(HKDF of `DATA_KEY` with the orgId), so one leaked subkey exposes one business.
- The stored format is `enc:1:iv:tag:data`. Use `enc:2:` for subkeyed values, keep reading `enc:1:`, and
  add a script that re-encrypts every value in `ENCRYPTED_FIELDS`.
- Do this together with key rotation (`DATA_KEY_PREVIOUS` read-only during a rotation).

### 3. Setup steps after sign-up
New businesses land on Home with a reminder card (`components/FinishSetup.tsx`) for logo and bank
details.
- The plan had short steps right after sign-up instead: details, logo, bank, then the directory
  listing.
- It is optional polish; keep the card for anyone who skips the steps.

### 4. Online subscription payments
Planned in `docs/payment-integration.md`; needs a provider chosen and the user's go-ahead
(out of scope in CLAUDE.md until then).

## Known limitations

- **Sign-in rate limit is in memory** (`lib/rate-limit.ts`): per server process. With more than one
  server, move it to Postgres (a small table with expiry) or a shared store.
- **Clean-ups run on page load**, not on a schedule:
  - `purgeDeletedOrgs()` runs when the team opens Businesses.
  - `purgeExpiredDeletions(t)` runs when a business opens Inventory.
  - Bell reminders are worked out when a business opens a page (`lib/reminders.ts`).
  - Fine for now. If a scheduler is added (cron calling an internal route), move all three there.
- **No key rotation tool** for `DATA_KEY` (see item 2).
- **Email and SMS** are not sent; notifications and announcements are in-app only (planned to go out
  through the same records).
- **One login per business** (by design for now; `User.orgId` allows more later).

## Waiting on someone outside

- Real company contact details: `CONTACT` and `BILLING_DETAILS` in `lib/contact.ts` (placeholders show
  "to be added").
- Legal review of `/terms` and `/privacy`, including against Zambia's Data Protection Act 2021.

## Cosmetic

- Demo data repeats the strength in some item names ("Metformin 500 mg tablets 500 mg") because the seed's
  item names already include it. Either drop the strength from the seed names or from the line label.
