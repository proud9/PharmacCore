# Parallax live demo over a local network

One computer runs Parallax. Four other devices (laptops, tablets or phones) each create one
business account in front of the audience, connect to each other and trade along the supply
chain. The server computer plays the Parallax team.

Every step below is checked by `npm run demo:rehearse`, which plays this exact script over the
server's network address (78 steps). Run it before the day.

```
        Zambezi Pharmaceuticals  (manufacturer, Device 1)
                    │  sells to
                    ▼
        Lusaka Medical Wholesale (wholesaler, Device 2)
              │ sells to                 │ sells to (30 days' credit)
              ▼                          ▼
   Kabulonga Pharmacy (retailer, Device 3) ──sells to──▶ Chongwe Rural Health Centre (client, Device 4)
              │
              └─ sales counter: patients, prescriptions

   Parallax team (server laptop): sees accounts, announcements, billing. Never sees prices or orders.
```

About 25 minutes in total.

## Who plays what

All passwords: **`Parallax-Demo-26`** (the team login gets a temporary one first; see Setup).

| Device | Account type | Business name | Town | Phone | Your name | Email |
| --- | --- | --- | --- | --- | --- | --- |
| Server laptop | Parallax team | (team) | | | Parallax Team | team@demo.local |
| Device 1 | Manufacturer | Zambezi Pharmaceuticals | Lusaka | 0977 100 001 | Mutinta Hamoonga | maker@demo.local |
| Device 2 | Wholesaler | Lusaka Medical Wholesale | Lusaka | 0977 100 002 | Chanda Mwila | wholesale@demo.local |
| Device 3 | Retailer | Kabulonga Pharmacy | Lusaka | 0977 100 003 | Natasha Banda | pharmacy@demo.local |
| Device 4 | Client | Chongwe Rural Health Centre | Chongwe | 0977 100 004 | Sister Ruth Phiri | clinic@demo.local |

These names, items and prices live in `scripts/demo-cast.ts`. Change them there if you change them
here, so the rehearsal keeps matching.

## Setup

### The day before (on the server computer)

1. Postgres is running: `brew services start postgresql@17`.
2. Rehearse: `npm run demo:rehearse`. It builds the demo version, plays every step below over this
   computer's network address on port 3400 and must end with **All 78 steps passed**. It uses its
   own database, so nothing is left behind.
3. Make the wholesaler's stock sheet: `npm run demo:files`. Copy
   `docs/demo/wholesaler-opening-stock.xlsx` to **Device 2** (USB stick, AirDrop or email). The
   wholesaler uploads it from its own device in Act 4.
4. Check every device can reach the server: start the demo (next step), then open the address it
   prints on each device. All devices must be on the **same Wi-Fi or network**. On a Mac server,
   answer **Allow** when macOS asks whether "node" may accept incoming connections (or allow it in
   System Settings → Network → Firewall).

### On the day (on the server computer)

```bash
npm run demo -- --reset
```

It wipes the demo database, starts Parallax on port 3000 and prints the address, e.g.
`http://192.168.0.100:3000`. Write it on the board. Keep this window open; the Mac stays awake
while it runs.

In a second terminal, create the team login:

```bash
npm run demo:admin -- --email team@demo.local --name "Parallax Team"
```

It prints a temporary password. On the server's browser, open `http://localhost:3000`, sign in as
`team@demo.local` with it, and set **`Parallax-Demo-26`** when asked. (This step shows how team
logins work: there is no public sign-up for the team.)

Each device opens the printed address in its browser. Nothing to install.

## The flow, act by act

"→" means click. Status words differ by side on purpose: the same order reads "Inquiry sent" for
the buyer and "New inquiry" for the seller.

### Act 1. Each business creates its account (3 min)

Devices 1–4, at the same time:

1. Open the address → **Create an account**.
2. **Account type**: Manufacturer / Wholesaler / Retailer / Client (from the table), then business
   name, town, phone, your name, email and password → **Create account**.
3. Each lands on **Home**, which shows only what that type needs. The manufacturer has no
   Inventory, the client has no Orders, and only the pharmacy has a Sales counter. Point at the menus side by side.

Device 2 (wholesaler) only: **Business details** → fill in bank name **Zanaco**, account number
**0123456789** → **Save details**. Bank details print on its invoices and are stored encrypted.

*Point out:* one login per business; manufacturers, wholesalers and pharmacies start a 30-day
trial; the clinic is free.

### Act 2. The Parallax team sees them arrive (2 min)

Server laptop (team):

1. **Businesses**: all four new accounts, with type and town. Open one: details and login only;
   no prices, stock or orders.
2. **Billing**: three accounts on trial. The clinic isn't listed because clients don't pay.
3. **Announcements** → Send to **Everyone** → title *Welcome to Parallax*, message *Your accounts are
   ready. Connect with your suppliers and customers in Find businesses.* → **Send announcement**.

Devices 1–4: the **bell** shows 1. Open it to see the announcement.

### Act 3. Connecting (4 min)

Each business only trades with businesses it is connected to.

| Who | Does | Then |
| --- | --- | --- |
| Device 2 (wholesaler) | **Find businesses** → Zambezi Pharmaceuticals → **Ask to connect** | Device 1 gets a bell notification |
| Device 1 (manufacturer) | **Customers** → *Asking to connect* → **Accept** | Wholesaler now lists Zambezi under **Suppliers** |
| Device 3 (pharmacy) | **Find businesses** → Lusaka Medical Wholesale → **Ask to connect** | |
| Device 2 (wholesaler) | **Customers** → **Accept** Kabulonga Pharmacy → set its **Payment terms** to **Pay before delivery** | |
| Device 4 (clinic) | **Find businesses** → **Ask to connect** to both Lusaka Medical Wholesale and Kabulonga Pharmacy | |
| Device 2 (wholesaler) | **Customers** → **Accept** the clinic → **Payment terms**: **Pay on account (credit)**, **30** days | |
| Device 3 (pharmacy) | **Customers** → **Accept** the clinic (leave terms on *Your default*: pay on delivery) | |

*Point out:* the directory shows only name, type and town. Payment terms are per customer: the same
wholesaler sells to the pharmacy on prepayment and to the clinic on credit.

### Act 4. Items and opening stock (3 min)

Device 1 (manufacturer), **Items** → **Add item**, three times. Leave **Show to connected buyers** ticked.

| Item name | Strength | Form | Pack | Stock code | Your list price |
| --- | --- | --- | --- | --- | --- |
| Amoxicillin 500 mg capsules | 500 mg | capsule | box of 100 | ZP-AMX | 92 |
| Metformin tablets | 500 mg | tablet | box of 60 | ZP-MET | 48 |
| Ceftriaxone injection | 1 g | vial | pack of 10 | ZP-CTX | 140 |

Device 2 (wholesaler), **Inventory** → **Upload sheet** → choose
`wholesaler-opening-stock.xlsx`. Four items appear with batches and expiry dates, 420 units in all.
(**Excel template** downloads the empty template a real wholesaler would fill in.)

*Point out:* the list price is private. Buyers will see item names only.

### Act 5. Wholesaler buys from the manufacturer: pay on delivery (5 min)

| Step | Who | Does |
| --- | --- | --- |
| Inquiry | Device 2 | **Suppliers** → Zambezi Pharmaceuticals. Show: names only, no prices. Tick **Amoxicillin** qty **100** and **Metformin** qty **60**, message *Needed this week* → **Send inquiry** |
| Quote | Device 1 | Bell / **Orders** → open the inquiry → **Send a quotation**: Amoxicillin **92**, Metformin **48**, Ready on (2 days), Valid until (2 weeks) → **Send quotation** |
| Accept | Device 2 | **Purchases** → open it ("Quote received") → **Accept and send purchase order** |
| Dispatch | Device 1 | Order now reads "Order received" → **Dispatch with a delivery note**: method *Own truck* → **Dispatch**. Then **Issue the invoice** → **Issue invoice** |
| Documents | Device 1 or 2 | On the order, **Documents** → open the **Invoice** → **Print or save PDF** |
| Receive | Device 2 | Purchase reads "On the way" → **Confirm what arrived** → **Confirm received** |
| Into stock | Device 2 | **Inventory** → *Waiting from deliveries* → **Enter details** on each line: Amoxicillin → stock code **W-AMX** (joins the existing item), Metformin → new stock code **W-MET**, selling price **85**. Add batch and expiry for each → **Add to stock**. Now 580 units |
| Payment | Device 1 | On the order → **Record a payment received**: 12,080, bank transfer, reference *ZAN-DEMO-1* → **Record payment**. Received and paid in full, the order reads **Closed** |

*Point out:* stock only counts once it has a batch and expiry. Parallax remembers that Zambezi's
amoxicillin is the wholesaler's W-AMX, so the next delivery matches by itself.

### Act 6. Pharmacy buys from the wholesaler: pay before delivery (5 min)

| Step | Who | Does |
| --- | --- | --- |
| Inquiry | Device 3 | **Suppliers** → Lusaka Medical Wholesale → **Paracetamol** qty **50**, **Amoxicillin** qty **20** → **Send inquiry** |
| Quote | Device 2 | **Orders** → open → Paracetamol **60**, Amoxicillin **165**, **Tax %** **16** → **Send quotation** |
| Accept | Device 3 | **Purchases** → open → purchase order no. *KP-PO-001* → **Accept and send purchase order** |
| The rule | Device 2 | Try **Dispatch**: refused, because this customer pays before delivery |
| Invoice | Device 2 | **Issue invoice**. Device 3 sees it under **Payments → You owe** |
| Payment | Device 2 | **Record a payment received**: the full amount (7,308.00), mobile money, *MTN-778812* |
| Dispatch | Device 2 | **Dispatch** now works. Stock goes down to 510, earliest expiry first |
| Receive | Device 3 | **Confirm received**. Paid and received, so it closes |
| Into stock | Device 3 | **Inventory** → *Waiting from deliveries* → **Enter details**: **KP-PCM** price **75**, **KP-AMX** price **210**, batch and expiry → **Add to stock** |

### Act 7. The clinic buys from both suppliers (4 min)

| Step | Who | Does |
| --- | --- | --- |
| Inquiries | Device 4 | **Suppliers** → Lusaka Medical Wholesale → **Oral rehydration salts** qty **30** → **Send inquiry**. Then Kabulonga Pharmacy → **Paracetamol** qty **10** → **Send inquiry** |
| Quotes | Device 2, Device 3 | Wholesaler quotes ORS **85**; pharmacy quotes paracetamol **80** |
| Privacy | Device 3 | The pharmacy can't see the wholesaler's quote to the clinic, or what the wholesaler charged it. Every price is private to one buyer |
| Accept | Device 4 | Accept both |
| Deliver | Device 2 | On credit it may dispatch first: **Dispatch**, then **Issue invoice** (due in 30 days) |
| Deliver | Device 3 | **Dispatch** from its own stock, then **Issue invoice** |
| Receive | Device 4 | **Confirm received** on both. **Payments** shows K 2,550.00 owed to the wholesaler and K 800.00 to the pharmacy. Open the delivery note and print it |
| Payment | Device 3 | **Record a payment received**: 800, cash. The clinic's order with the pharmacy closes; the credit invoice stays open until it is paid |

### Act 8. The pharmacy's counter (2 min)

Device 3:

1. **Patients** → *New patient*: Mwape Chileshe, phone 0966 123 456, born 14/05/1988, allergies
   *Sulfa drugs* → **Create record**. Contact and health details are stored encrypted.
2. **Sales counter** → patient Mwape Chileshe → search *Paracetamol* → 2 → payment **Mobile money**
   → **Complete sale**. Open the receipt.
3. **Prescriptions** → *File prescription*: Mwape Chileshe, prescriber *Dr Siame*, Amoxicillin 1 →
   **Save prescription** → **Dispense**. Stock leaves at once.
4. **Reports**: counter sales, margin and stock value for the last 30 days.

### Act 9. The team's billing (2 min)

Server laptop (team):

1. **Billing** → Lusaka Medical Wholesale → **Fee** 1200 → **Save fee**.
2. **Mark as paid**: 12 months (the amount fills in as 14,400), bank transfer, reference
   *ZAN-SUB-DEMO* → **Mark as paid**. A receipt number appears.
3. Device 2: the bell shows **Payment received**. **Billing** lists the receipt; open it and print it.
4. Optional: **Suspend** Zambezi Pharmaceuticals on its row. Device 1 is signed out and can't sign
   back in. **Reactivate** brings it back.

*Close with:* the team ran every account and never saw a price, an order or a patient. The database
enforces this, not just the screens.

## Cue cards

**Device 1, manufacturer**
1. Create an account (Manufacturer, Zambezi Pharmaceuticals, maker@demo.local).
2. Customers → Accept the wholesaler.
3. Items → Add item ×3 (Amoxicillin 92, Metformin 48, Ceftriaxone 140).
4. Orders → Send quotation (92 / 48) → Dispatch → Issue invoice → Record payment 12,080.
5. (Act 9) Get suspended, then reactivated.

**Device 2, wholesaler**
1. Create an account (Wholesaler, Lusaka Medical Wholesale, wholesale@demo.local). Business details → bank.
2. Find businesses → Ask to connect to Zambezi Pharmaceuticals.
3. Customers → Accept the pharmacy (Pay before delivery), Accept the clinic (credit, 30 days).
4. Inventory → Upload sheet (wholesaler-opening-stock.xlsx).
5. Suppliers → Zambezi → inquiry (Amoxicillin 100, Metformin 60) → Accept → Confirm received →
   Inventory: Enter details (W-AMX; new W-MET at 85) → Add to stock.
6. Orders → pharmacy: quote 60 / 165, 16% tax → try Dispatch (refused) → Issue invoice → Record
   payment 7,308 → Dispatch.
7. Orders → clinic: quote ORS 85 → Dispatch → Issue invoice.
8. (Act 9) Bell: Payment received; Billing → receipt.

**Device 3, pharmacy**
1. Create an account (Retailer, Kabulonga Pharmacy, pharmacy@demo.local).
2. Find businesses → Ask to connect to Lusaka Medical Wholesale.
3. Customers → Accept the clinic.
4. Suppliers → Lusaka Medical Wholesale → inquiry (Paracetamol 50, Amoxicillin 20) → Accept (PO
   KP-PO-001) → Payments → You owe → Confirm received → Inventory: KP-PCM at 75, KP-AMX at 210 → Add to stock.
5. Orders → clinic: quote paracetamol 80 → Dispatch → Issue invoice → Record payment 800 cash.
6. Patients → new patient → Sales counter → Complete sale → Prescriptions → Dispense → Reports.

**Device 4, clinic**
1. Create an account (Client, Chongwe Rural Health Centre, clinic@demo.local).
2. Find businesses → Ask to connect to the wholesaler and the pharmacy.
3. Suppliers → wholesaler: ORS 30 → Send inquiry. Suppliers → pharmacy: Paracetamol 10 → Send inquiry.
4. Purchases → Accept both quotes → Confirm received on both → Payments → open and print the delivery note.

**Server laptop, Parallax team**
1. Before: `npm run demo -- --reset`, then `npm run demo:admin -- …`, then sign in and set the password.
2. Businesses → open one (no business data). Billing → three on trial.
3. Announcements → Everyone → *Welcome to Parallax*.
4. Billing → wholesaler → Fee 1200 → Mark as paid (12 months). Optional: Suspend / Reactivate the manufacturer.

## If something goes wrong

- **A device can't open the address.** Check it's on the same Wi-Fi, that you typed the address
  exactly (including `:3000`), and that the Mac firewall allows "node". Guest Wi-Fi networks often
  block devices from seeing each other: use a phone hotspot or a small router instead.
- **The address changed** (the server re-joined Wi-Fi): restart `npm run demo` and read the new address.
- **"Port 3000 is in use"**: close the other server, or `npm run demo -- --port 3001` and use that.
- **Someone signed up with the wrong type or a typo in the email**: the type can't be changed.
  Sign up again with another email (for example maker2@demo.local) and carry on.
- **Received stock doesn't show in Inventory**: it is waiting under *Waiting from deliveries*. Click
  **Enter details** → **Add to stock**.
- **"Dispatch" refused**: expected for a pay-before-delivery customer. Invoice and record the
  payment first.
- **No time for the live set-up**: `npm run demo -- --seed` starts with ready-made businesses and
  orders instead (logins in the main README, password `Parallax2026!`).
- **Start over**: Ctrl+C, then `npm run demo -- --reset` and `npm run demo:admin` again.

When you're done, press Ctrl+C in the demo window. The demo database stays until the next
`--reset`; your own development data is never touched.
