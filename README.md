# Pharmacy

Pharmacy management system for stock, sales, patient records, and wholesale orders. Amounts are in Kwacha (ZMW).

## Start and stop

In PowerShell, use `npm.cmd` (plain `npm` may be blocked):

```powershell
npm.cmd run dev
```

Open http://localhost:3000

Stop the system with `Ctrl+C` in that terminal.

First time only:

```powershell
npm.cmd install
npm.cmd run setup
```

## Sign-in accounts (demo)

| Who | Email | Password |
| --- | --- | --- |
| Administrator | admin@pharmacore.local | Admin123! |
| Wholesale manager | wholesale@pharmacore.local | Whole123! |
| Pharmacist | pharmacist@pharmacore.local | Pharma123! |
| Cashier | cashier@pharmacore.local | Cash123! |
| Hospital buyer (UTH) | uth@pharmacore.local | Buyer123! |
| Clinic buyer | clinic@pharmacore.local | Buyer123! |
| Pharmacy buyer | partner@pharmacore.local | Buyer123! |

## What to show

- **Home** — sales, low stock, items near expiry
- **Sales counter** — sell and reduce stock
- **Inventory** — products, batches, expiry
- **Wholesale orders** — hospitals/clinics send orders; you reply with a ZMW price and a ready date
- **Buyers** — create a login for another hospital, clinic, or pharmacy
- **Search** — top bar finds products, patients, sales, and orders
