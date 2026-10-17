# PharmaCore

Commercial pharmacy management system for digital records, remote staff login, inventory, stock takes, dispensing, and business statistics.

## What it covers

- Role-based remote login (admin, pharmacist, technician, cashier, inventory)
- Patient records and prescription workflow
- SKU catalogue with lot/expiry tracking and FEFO stock deduction
- Point-of-sale / dispense desk
- Cycle counts that post variances
- Purchase orders and goods-in
- 30-day margin, mix, and tender analytics
- Audit trail

This is an operations system for a licensed pharmacy. It is not a substitute for local regulatory software certification (ePDMP, NHS Spine, controlled-drug registers, and similar).

## Run locally

```bash
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo accounts (all `@pharmacore.local`):

| Role | Email prefix | Password |
| --- | --- | --- |
| Administrator | admin | Admin123! |
| Pharmacist | pharmacist | Pharma123! |
| Technician | tech | Tech123! |
| Cashier | cashier | Cash123! |
| Inventory | stock | Stock123! |

## Production notes

- Change `AUTH_SECRET` and move `DATABASE_URL` to PostgreSQL (`provider = "postgresql"` in Prisma).
- Put the app behind HTTPS and your pharmacy VPN or SSO.
- Restrict who can dispense controlled medicines and keep a legally required CD register alongside this system if your jurisdiction requires it.
