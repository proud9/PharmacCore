import Link from "next/link";
import { ROLE_LABEL, can, customerKinds, supplierKinds, type OrgKind } from "@/lib/capabilities";
import { GRACE_DAYS, TRIAL_DAYS } from "@/lib/subscription";
import { RETENTION_DAYS } from "@/lib/deletion";
import { Compare, Faq, GuideFrame, MenuList, Note, Shot, Steps, type GuideSection } from "./Blocks";
import { FlowStrip } from "./FlowStrip";
import { NetworkMap } from "./NetworkMap";
import { OrderFlow } from "./OrderFlow";

/* ------------------------------------------------------------------------------------------------
 * The guide for one business type. Sections are shared; each one reads the type's capabilities
 * (lib/capabilities.ts), so a rule changed there changes the guide too. Screenshots live in
 * public/guide and are made by scripts/guide-shots.ts.
 * ---------------------------------------------------------------------------------------------- */

const WHO: Record<OrgKind, string> = {
  MANUFACTURER: "manufacturers",
  WHOLESALER: "wholesalers",
  RETAILER: "pharmacies",
  CLIENT: "clients (hospitals, clinics, schools and NGOs)",
};

function names(kinds: OrgKind[]) {
  const list = kinds.map((k) => WHO[k]);
  return list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

const INTRO: Record<OrgKind, string> = {
  MANUFACTURER:
    "How your manufacturer account works: your item list, how wholesalers find you and ask for prices, and how an order goes from inquiry to payment.",
  WHOLESALER:
    "How your wholesaler account works: buying from manufacturers, keeping stock by batch and expiry, and selling to pharmacies and clients.",
  RETAILER:
    "How your pharmacy account works: buying from wholesalers, keeping stock, running the sales counter with patients and prescriptions, and supplying clients.",
  CLIENT:
    "How your client account works: finding suppliers, asking several of them for prices, ordering, and keeping every quote, invoice and delivery note in one place.",
};

const HOME_SHOT: Record<OrgKind, string> = {
  MANUFACTURER: "home-manufacturer",
  WHOLESALER: "home-wholesaler",
  RETAILER: "home-retailer",
  CLIENT: "home-client",
};

export function BusinessGuide({ kind }: { kind: OrgKind }) {
  const sells = can(kind, "sell");
  const buys = can(kind, "buy");
  const stock = can(kind, "inventory");
  const counter = can(kind, "counter");
  const listOnly = can(kind, "catalog") && !stock;
  const paying = kind !== "CLIENT";
  const buyFrom = supplierKinds(kind);
  const sellTo = customerKinds(kind);

  const sections: GuideSection[] = [
    overview(kind, { sells, buys, stock, counter, listOnly }),
    network(kind, buyFrom, sellTo),
    gettingStarted({ sells, stock, listOnly, buys }),
    connecting({ sells, buys, buyFrom, sellTo }),
    ...(sells ? [selling({ stock, listOnly, sellTo })] : []),
    ...(buys ? [buying({ stock, buyFrom })] : []),
    ...(listOnly ? [itemList()] : []),
    ...(stock ? [inventory({ sells })] : []),
    ...(counter ? [counterSection()] : []),
    offline({ sells, buys }),
    documents({ sells, buys }),
    payments({ sells, buys }),
    notifications(),
    paying ? subscription() : free(),
    privacy({ sells, stock, counter }),
    questions(kind, { sells, buys, stock }),
  ];

  return (
    <GuideFrame
      eyebrow={`${ROLE_LABEL[kind]} guide`}
      title="How Parallax works for you"
      intro={INTRO[kind]}
      facts={[
        { label: "You sell to", value: sellTo.length ? capital(names(sellTo)) : "Nobody: you only buy" },
        { label: "You buy from", value: buyFrom.length ? capital(names(buyFrom)) : "Nobody: you only sell" },
        {
          label: "Stock",
          value: counter
            ? "Inventory and a sales counter"
            : stock
              ? "Inventory with batches and expiry"
              : listOnly
                ? "An item list (no stock counts)"
                : "Not kept in Parallax",
        },
        { label: "Cost", value: paying ? `${TRIAL_DAYS}-day free trial, then a subscription` : "Free of charge" },
      ]}
      sections={sections}
    />
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// -------------------------------------------------------------------------------------------------

function overview(kind: OrgKind, f: { sells: boolean; buys: boolean; stock: boolean; counter: boolean; listOnly: boolean }): GuideSection {
  const menu: { name: string; text: string }[] = [
    { name: "Home", text: "What needs your attention today: new inquiries, orders to dispatch, quotes to review, money owed" + (f.stock ? ", low stock and expiring batches." : ".") },
  ];
  if (f.sells) menu.push({ name: "Orders", text: "Orders you sell: inquiries waiting for your price, quotes sent, orders to prepare and dispatch." });
  if (f.buys) menu.push({ name: "Purchases", text: "Orders you place with suppliers: inquiries sent, quotes to accept, deliveries on the way." });
  menu.push({ name: "Payments", text: f.sells && f.buys ? "Invoices not yet paid in full: what customers owe you, and what you owe suppliers." : f.sells ? "Invoices your customers haven't paid in full yet." : "Supplier invoices you haven't paid in full yet." });
  if (f.sells) menu.push({ name: "Customers", text: "Businesses connected to buy from you, their payment terms, and your private list of customers not on Parallax." });
  if (f.buys) menu.push({ name: "Suppliers", text: "Businesses you buy from. Open one to see its item list and send an inquiry." });
  menu.push({ name: "Find businesses", text: "The directory: find businesses you can trade with and ask to connect." });
  if (f.listOnly) menu.push({ name: "Items", text: "What you make or supply, and which items connected wholesalers can see." });
  if (f.stock) {
    menu.push({ name: "Inventory", text: "Your items, batches and expiry dates; deliveries waiting to go into stock; corrections and the delete queue." });
    menu.push({ name: "Stock take", text: "Count what is on the shelf and see what was sold and its value." });
  }
  if (f.counter) {
    menu.push({ name: "Sales counter", text: "Sell to walk-in customers and patients." });
    menu.push({ name: "Counter sales", text: "Receipts from the counter, to look up or reprint." });
    menu.push({ name: "Patients", text: "Patient names, contacts and allergies." });
    menu.push({ name: "Prescriptions", text: "Record a prescription and dispense it." });
    menu.push({ name: "Reports", text: "Counter sales, margin and stock value for the last 30 days." });
  }
  menu.push({ name: "Activity log", text: "Every change made in your account: who, what and when." });
  if (kind !== "CLIENT") menu.push({ name: "Billing", text: "Your Parallax subscription: when it is due, your fee, how to pay, and every receipt." });
  menu.push({ name: "Business details", text: "Your name, address, licence, TPIN, logo, bank details" + (f.sells ? " and default payment terms." : ".") });
  menu.push({ name: "Guide", text: "This page." });

  return {
    id: "overview",
    title: "Your account at a glance",
    lead: `You are signed in as a ${ROLE_LABEL[kind].toLowerCase()}. One login runs the whole business account.`,
    body: (
      <>
        <p>
          Parallax is a network of businesses in the medicine supply chain. Each business has its own private account and
          trades with the others the way you would going from office to office for prices, only here every inquiry,
          quote, order, invoice and delivery note is kept for you and for the business on the other side.
        </p>
        <Shot src={HOME_SHOT[kind]} path="/dashboard" caption="Home: the cards at the top show what is waiting for you. Click a menu item on the left to open that part of your account." />
        <h3>The menu</h3>
        <MenuList items={menu} />
        <Note title="Make the menu smaller">
          On a computer, click <strong>Collapse menu</strong> at the bottom of the menu to shrink it to icons. Hover an icon to see its name.
          On a phone, the menu opens from the button at the top right.
        </Note>
      </>
    ),
  };
}

function network(kind: OrgKind, buyFrom: OrgKind[], sellTo: OrgKind[]): GuideSection {
  return {
    id: "network",
    title: "Who you trade with",
    lead: "Parallax follows the supply chain, so each type of business trades with the next one along.",
    body: (
      <>
        <NetworkMap kind={kind} />
        <ul>
          {buyFrom.length ? (
            <li>
              <strong>You buy from {names(buyFrom)}.</strong> You see their item names (never their prices or stock) once you are connected, and ask for prices with an inquiry.
            </li>
          ) : null}
          {sellTo.length ? (
            <li>
              <strong>You sell to {names(sellTo)}.</strong> They see the names of the items you choose to show. Your prices go only to the one buyer you quote.
            </li>
          ) : null}
          <li>
            <strong>You trade only with businesses you are connected to.</strong> Either side can ask to connect; the other accepts.
          </li>
          <li>
            <strong>Businesses that aren&apos;t on Parallax</strong> can still be your customers or suppliers. You keep them on a private list and make their documents yourself (see{" "}
            <a href="#offline" className="text-pine-700 underline underline-offset-2">
              customers and suppliers not on Parallax
            </a>
            ).
          </li>
        </ul>
      </>
    ),
  };
}

function gettingStarted(f: { sells: boolean; stock: boolean; listOnly: boolean; buys: boolean }): GuideSection {
  const steps = [
    {
      title: "Fill in your business details",
      text: (
        <>
          Open <Link href="/settings" className="text-pine-700 underline underline-offset-2">Business details</Link>: trading name, town, address, phone, email, licence number and TPIN. These print on every document you issue.
        </>
      ),
    },
    {
      title: "Add your logo",
      text: "PNG, JPG or WebP up to 1.5 MB. It heads your quotations, invoices and delivery notes.",
    },
  ];
  if (f.sells) {
    steps.push({ title: "Add your bank details", text: "They print on your invoices so customers can pay you directly. They are stored encrypted." });
    steps.push({ title: "Choose how customers pay by default", text: "Pay before delivery, pay on delivery, or pay on account (credit) with a number of days. You can set different terms for one customer later." });
  }
  steps.push({
    title: "Decide whether to be listed",
    text: "Tick \"Show this business in the Parallax directory\" so others can find you. Only your name, type and town are shown there.",
  });
  if (f.listOnly) steps.push({ title: "Add your items", text: "In Items, add what you make or supply. Wholesalers you are connected to see the names of the items you show." });
  if (f.stock)
    steps.push({ title: "Bring in your stock", text: "In Inventory, add items one by one, or download the Excel template, fill it in and upload it. Each item gets its batches, expiry dates and quantities." });
  steps.push({ title: "Connect with the businesses you trade with", text: "Use Find businesses to ask them to connect (next section)." });

  return {
    id: "start",
    title: "Getting started",
    lead: "A few minutes of setup makes every document you issue complete.",
    body: (
      <>
        <Steps items={steps} />
        <Shot src="settings" path="/settings" caption="Business details: what you enter here prints on your documents. Bank details are kept encrypted." />
        {f.sells ? (
          <Note title="Until your logo and bank details are in">
            Home shows a reminder card. Documents still work without them, but customers can&apos;t see where to pay.
          </Note>
        ) : null}
      </>
    ),
  };
}

function connecting(f: { sells: boolean; buys: boolean; buyFrom: OrgKind[]; sellTo: OrgKind[] }): GuideSection {
  const who = names([...f.buyFrom, ...f.sellTo]);
  return {
    id: "connect",
    title: "Connecting with businesses",
    lead: "You need a connection before you can send inquiries or quotes on Parallax.",
    body: (
      <>
        <Steps
          items={[
            { title: "Open Find businesses", text: `It lists the ${who} you can trade with. Search by name or town, or filter by type.` },
            { title: "Click Ask to connect", text: "The other business gets a notification and sees your request at the top of its Customers or Suppliers page." },
            { title: "They accept", text: "You get a notification. They now appear in your " + (f.sells && f.buys ? "Customers or Suppliers" : f.sells ? "Customers" : "Suppliers") + " list." },
          ]}
        />
        <Shot src="directory" path="/directory" caption="Find businesses: businesses you can trade with. Ask to connect; once they accept, you can send inquiries and quotes." />
        <p>
          When someone asks to connect with you, you&apos;ll see <strong>Accept their request</strong> in Find businesses and the request
          in {f.sells ? "Customers" : "Suppliers"}. You can decline it instead.
        </p>
        {f.sells ? (
          <>
            <h3>Payment terms for one customer</h3>
            <p>
              In <strong>Customers</strong>, each connected customer has a <strong>Payment terms</strong> choice. Leave it on{" "}
              <strong>Your default</strong>, or give that customer its own: pay before delivery, on delivery, or on credit with its own
              number of days. New quotes to that customer use those terms; you can still change them on a single quote.
            </p>
            <Shot src="customers" path="/customers" caption="Customers: connected businesses with their payment terms, and below them your private list of customers not on Parallax." />
          </>
        ) : (
          <Shot src="suppliers" path="/suppliers" caption="Suppliers: businesses you buy from. Open one to see its item list and send an inquiry." />
        )}
        <Note tone="watch" title="Ending a connection">
          Either business can end it from Customers or Suppliers. Orders already started carry on to the end; no new inquiries can be sent until you
          connect again.
        </Note>
      </>
    ),
  };
}

function selling(f: { stock: boolean; listOnly: boolean; sellTo: OrgKind[] }): GuideSection {
  return {
    id: "selling",
    title: "Selling: from inquiry to payment",
    lead: `How you answer ${names(f.sellTo)} who ask you for prices, and how the order runs from there.`,
    body: (
      <>
        <OrderFlow you="seller" />
        <p>
          Press play or click any step. Switch between the two kinds of payment terms to see how the order of the invoice and the
          delivery changes. On the right of the panel you can see how each side reads the same order: Parallax words it for your
          side and for theirs.
        </p>
        <h3>1. An inquiry arrives</h3>
        <p>
          The bell at the top shows a new notification and Home counts it under <strong>New inquiries</strong>. Open{" "}
          <strong>Orders</strong> to see it. An inquiry lists the items and quantities the buyer wants, any lines they typed in
          themselves, a delivery address and a message.
        </p>
        <Shot src="orders-list" path="/orders" caption="Orders: everything you sell. Search, or filter by status." />
        <h3>2. Send a quotation</h3>
        <Steps
          items={[
            { title: "Price each line", text: "Enter the unit price in Kwacha. You can change the quantity if you can only supply part of it." },
            ...(f.stock
              ? [{ title: "Link each line to your item", text: "\"Your item (stock leaves from it)\" says which of your inventory items the stock will come from when you dispatch. Lines picked from your list are linked already." }]
              : []),
            { title: "Add tax, dates and terms", text: "Tax %, the date it will be ready, and the date the price is valid until. Payment terms start from this customer's terms; change them for this order if you need to." },
            { title: "Send quotation", text: "The buyer is notified. Only they see these prices." },
          ]}
        />
        <Shot src="quote-form" path="/orders/…" caption="Send a quotation: price each line, set the dates and terms, then send. Private notes on the right are seen only by your business." />
        <Note title="Changing a price">
          You can change a quote until you issue the invoice. If the buyer had already accepted, a new price goes back to them to accept again.
          A quote past its <strong>valid until</strong> date shows as <strong>Quote expired</strong> until you send a new price.
        </Note>
        <h3>3. The buyer accepts</h3>
        <p>
          Accepting sends you their <strong>purchase order</strong> in the same step; the order now reads <strong>Order received</strong>. Use{" "}
          <strong>Mark as preparing</strong> and <strong>Mark as ready</strong> to keep the buyer informed (both optional).
        </p>
        <h3>4. Invoice and dispatch</h3>
        <ul>
          <li>
            <strong>Pay before delivery:</strong> issue the invoice, wait for the money, record the payment, then dispatch. Parallax won&apos;t let
            the order leave until it is paid in full.
          </li>
          <li>
            <strong>Pay on delivery or on credit:</strong> you can dispatch first and invoice with or after the delivery note. On credit the due date
            is set from your credit days.
          </li>
        </ul>
        <p>
          <strong>Dispatch</strong> asks for the quantities sent and prints the delivery note with the delivery method, vehicle and driver.{" "}
          {f.stock
            ? "The quantities sent leave your inventory at that moment, earliest expiry first."
            : "As a manufacturer you keep no stock counts in Parallax, so nothing is deducted."}
        </p>
        <Shot src="invoice-dispatch" path="/orders/…" caption="After acceptance: dispatch with a delivery note, and issue the invoice. The buttons below keep the buyer up to date." />
        <h3>5. Record payments</h3>
        <p>
          Parallax never takes money. When the buyer pays into your bank, open the order and use <strong>Record a payment received</strong>{" "}
          (amount, date, method, reference). Part payments are fine. When the order is received and paid in full it closes by itself.
        </p>
        <Shot src="order-closed" path="/orders/…" caption="A closed order: every document, every payment and the full history in one place." />
        <h3>Declining and cancelling</h3>
        <p>
          You can <strong>Decline</strong> an inquiry you can&apos;t supply, or <strong>Cancel order</strong> at any point before dispatch. The buyer
          can cancel up to the moment they accept your quote.
        </p>
      </>
    ),
  };
}

function buying(f: { stock: boolean; buyFrom: OrgKind[] }): GuideSection {
  return {
    id: "buying",
    title: "Buying: getting quotes and placing orders",
    lead: `How you ask ${names(f.buyFrom)} for prices, accept the best one and receive the goods.`,
    body: (
      <>
        <OrderFlow you="buyer" />
        <h3>1. Send an inquiry</h3>
        <Steps
          items={[
            { title: "Open Suppliers and click a supplier", text: "You see its item list: names, strength, form and pack. Never prices: those come back in a quote to you alone." },
            { title: "Tick what you need", text: "Search their list and set the quantities. For something not on their list, type it in as a line." },
            { title: "Add a message and delivery address", text: "Anything the supplier should know, such as a deadline." },
            { title: "Send inquiry", text: "The supplier is notified. It appears in your Purchases as Inquiry sent." },
          ]}
        />
        <Shot
          src={f.stock && f.buyFrom.includes("MANUFACTURER") ? "inquiry-builder-wholesaler" : "inquiry-builder"}
          path="/suppliers/…"
          caption="A supplier's item list: tick items and quantities on the left; your inquiry builds up on the right. The payment terms this supplier gives you are shown at the top."
        />
        <Note title="Compare prices">
          Send the same inquiry to several suppliers. Each one prices it privately; none of them sees the others&apos; quotes. Accept the one that suits
          you and cancel the rest.
        </Note>
        <h3>2. Review the quote and accept</h3>
        <p>
          When a quote arrives, Home counts it under <strong>Quotes to review</strong>. Open it in <strong>Purchases</strong> to see the price of every
          line, tax, the ready date, how long the price holds and the payment terms. Click{" "}
          <strong>Accept and send purchase order</strong>; enter your own purchase order number if you use one, or Parallax numbers it for you.
        </p>
        <Shot src="accept-quote" path="/purchases/…" caption="Quote received: check the lines and terms, then accept. Accepting sends your purchase order." />
        <h3>3. Pay</h3>
        <p>
          The invoice shows the supplier&apos;s bank details. Pay them directly; the supplier records the payment on the order and you see it straight
          away. If the terms are <strong>pay before delivery</strong>, the goods leave once the invoice is paid in full.
        </p>
        <h3>4. Confirm what arrived</h3>
        <p>
          When the order is <strong>On the way</strong>, open it and enter the quantities you actually received, then click{" "}
          <strong>Confirm received</strong>.{" "}
          {f.stock ? (
            <>
              Each line then waits in <strong>Inventory → Waiting from deliveries</strong>, where you add its batch number and expiry date to put it in
              stock (see{" "}
              <a href="#stock" className="text-pine-700 underline underline-offset-2">
                stock
              </a>
              ).
            </>
          ) : (
            "Your copy of the delivery note and invoice stay on the order."
          )}
        </p>
        <Shot src="receive" path="/purchases/…" caption="Confirm what arrived: change a quantity if less came than was sent." />
        <Shot src="purchases-client" path="/purchases" caption="Purchases: every order you have placed, newest first, with its status in your own words." />
      </>
    ),
  };
}

function itemList(): GuideSection {
  return {
    id: "items",
    title: "Your item list",
    lead: "What you make or supply, as wholesalers will see it in their inquiries.",
    body: (
      <>
        <p>
          Open <strong>Items</strong> and add each product: name, generic name, strength, form, pack and your stock code. Your list price is for your
          eyes only; buyers never see it. A price reaches a buyer only in a quote you send.
        </p>
        <Shot src="items-manufacturer" path="/items" caption="Items: each one is either Shown to buyers or Hidden. Your list price stays private." />
        <ul>
          <li>
            <strong>Shown to buyers</strong>: connected wholesalers can pick it when they write an inquiry.
          </li>
          <li>
            <strong>Hidden</strong>: stays on your list but buyers don&apos;t see it, e.g. while a product is out of production.
          </li>
          <li>Manufacturer accounts keep no stock counts, so dispatching an order doesn&apos;t change anything on this list.</li>
        </ul>
      </>
    ),
  };
}

function inventory(f: { sells: boolean }): GuideSection {
  return {
    id: "stock",
    title: "Stock: inventory, deliveries and stock take",
    lead: "Every batch with its expiry date. Stock comes in through deliveries and leaves through dispatches" + (f.sells ? " and sales." : "."),
    body: (
      <>
        <FlowStrip
          label="How stock moves"
          stations={[
            { icon: "truck", title: "Delivery confirmed", text: "You confirm what arrived on a supplier's order. Nothing is in stock yet." },
            { icon: "packageOpen", title: "Waiting from deliveries", text: "Each line waits at the top of Inventory with its supplier, delivery note and cost." },
            { icon: "calendar", title: "Batch and expiry", text: "Click Enter details, add the batch number and expiry date, and choose which of your items it is." },
            { icon: "boxes", title: "In stock", text: "Add to stock. Parallax remembers the match, so the next delivery of this item is matched for you." },
            { icon: "packageCheck", title: "Out, earliest expiry first", text: "When you dispatch an order or sell at the counter, the batch that expires first goes first." },
          ]}
        />
        <h3>Deliveries waiting to go into stock</h3>
        <p>
          Stock you receive from a supplier doesn&apos;t count until you give it a batch number and expiry date. Open <strong>Inventory</strong>; the{" "}
          <strong>Waiting from deliveries</strong> panel at the top lists every line still to complete.
        </p>
        <Shot src="delivery-queue" path="/inventory" caption="Waiting from deliveries: click Enter details on each line, add batch and expiry, then Add to stock." />
        <h3>Items, batches and expiry</h3>
        <ul>
          <li>
            <strong>Add item</strong> for one item, or <strong>Excel template</strong> then <strong>Upload sheet</strong> to bring in many at once.
          </li>
          <li>Each item shows its stock on hand across batches; expired and near-expiry batches are marked. Home lists what expires within 90 days.</li>
          <li>
            The pencil on a row corrects an item or its stock. Every correction asks for a reason and is kept in the Activity log.
          </li>
          {f.sells ? (
            <li>
              Open an item to choose whether it is <strong>Shown to buyers</strong> or <strong>Hidden</strong> in your list for connected customers.
            </li>
          ) : null}
          <li>
            Deleting an item puts it in the <strong>Delete queue</strong> for {RETENTION_DAYS} days, where you can restore it.
          </li>
        </ul>
        <Shot src="inventory" path="/inventory" caption="Inventory: search by code, name, category or batch. Reorder levels feed the low-stock list on Home." />
        <h3>Stock take</h3>
        <p>
          <strong>Stock take</strong> is laid out like a stock sheet. For each item, the open quantity is what Parallax holds; type the close quantity
          you counted. Sold and amount work out by themselves. Close quantity can&apos;t be more than open: if you find extra stock, add it in Inventory
          first. Your count is kept in this browser as you page through, and <strong>Finish stock take</strong> sets the counted items to your count and
          saves a report.
        </p>
        <Shot src="stock-take" path="/stock-take" caption="Stock take: type close quantities; counted rows are tinted. Past counts and their reports are listed below." />
      </>
    ),
  };
}

function counterSection(): GuideSection {
  return {
    id: "counter",
    title: "Sales counter, patients and prescriptions",
    lead: "Serve walk-in customers and patients from the same stock you buy from wholesalers.",
    body: (
      <>
        <FlowStrip
          label="A counter sale"
          stations={[
            { icon: "user", title: "Patient (optional)", text: "Choose a patient to keep the sale on their record and see allergy alerts, or leave it as Walk-in." },
            { icon: "basket", title: "Basket", text: "Search by name, stock code or barcode and add items. Only items in stock can be sold." },
            { icon: "card", title: "Payment", text: "Cash, card, mobile money or insurance, with any discount." },
            { icon: "receipt", title: "Receipt", text: "The sale is saved with a receipt you can print or save as PDF from Counter sales." },
            { icon: "boxes", title: "Stock updated", text: "The quantities leave your inventory, earliest expiry first." },
          ]}
        />
        <Shot src="pos" path="/pos" caption="Sales counter: pick items on the left, check the basket and payment on the right, then record the sale." />
        <h3>Patients</h3>
        <p>
          <strong>Patients</strong> keeps names, date of birth, contact details, allergies and insurance. Everything except the name is stored encrypted.
          The list shows how many prescriptions and counter sales each patient has.
        </p>
        <h3>Prescriptions</h3>
        <Steps
          items={[
            { title: "Record the prescription", text: "Choose the patient, the prescriber and the medicines with quantities. Allergies show as an alert." },
            { title: "Dispense it", text: "When the medicines are ready, click Dispense. The stock leaves your inventory and the prescription is marked dispensed." },
          ]}
        />
        <Shot src="prescriptions" path="/prescriptions" caption="Prescriptions: search by patient, doctor or number, and dispense when ready." />
        <h3>Reports</h3>
        <p>
          <strong>Reports</strong> covers the last 30 days at the counter: revenue, estimated cost, gross margin, stock value, top sellers and how
          customers paid.
        </p>
        <Shot src="reports" path="/reports" caption="Reports: counter sales for the last 30 days." />
      </>
    ),
  };
}

function offline(f: { sells: boolean; buys: boolean }): GuideSection {
  return {
    id: "offline",
    title: "Customers and suppliers not on Parallax",
    lead: "Keep trading with businesses that haven't joined, with the same documents.",
    body: (
      <>
        <p>
          Your private list lives at the bottom of {f.sells && f.buys ? "Customers and Suppliers" : f.sells ? "Customers" : "Suppliers"}. Add a business with
          its name, type, town, address, phone, email, TPIN and notes. Only your business ever sees this list, and its contact details are stored encrypted.
        </p>
        <Steps
          items={[
            ...(f.sells
              ? [{ title: "Selling to them", text: "In Orders, choose New quotation, pick them from Your private list, add the lines and prices, and save." }]
              : []),
            ...(f.buys
              ? [{ title: "Buying from them", text: "In Purchases, choose New inquiry and pick them from Your private list. Print the inquiry and send it to them." }]
              : []),
            {
              title: "Record their side yourself",
              text: "Because they can't click on Parallax, the order shows their steps for you to record, such as \"Record that … accepted\" or \"Record delivery to …\".",
            },
            { title: "Send them the documents", text: "Open any document, click Print or save PDF, and send it by email or WhatsApp, or print it." },
          ]}
        />
        <Note title="When they join Parallax">Ask them to connect. New orders then go through Parallax; your earlier documents stay where they are.</Note>
      </>
    ),
  };
}

function documents(f: { sells: boolean; buys: boolean }): GuideSection {
  const rows = [
    { name: "Inquiry (INQ)", text: "Issued by the buyer: the items and quantities wanted." },
    { name: "Quotation (QT)", text: "Issued by the seller: prices, tax, ready date, validity and terms." },
    { name: "Purchase order (PO)", text: "Issued by the buyer when they accept the quote." },
    { name: "Invoice (INV)", text: "Issued by the seller: amount due, due date and the seller's bank details." },
    { name: "Delivery note (DN)", text: "Issued by the seller at dispatch: quantities sent, vehicle and driver, with space for the receiver to sign." },
  ];
  return {
    id: "documents",
    title: "Documents and printing",
    lead: "Every step of an order produces its document, numbered for you and ready to print.",
    body: (
      <>
        <MenuList items={rows} />
        <p>
          Open an order and use the <strong>Documents</strong> list to open any of them. Each carries the issuing business&apos;s logo, details and
          TPIN. Click <strong>Print or save PDF</strong> and choose your printer, or &quot;Save as PDF&quot; to email it. Only the two businesses on the order
          can open its documents.
        </p>
        <Shot src="document-invoice" path="/documents/…/invoice" caption="An invoice as it prints: your logo and details, the customer, the lines, and your bank details for payment." />
        {f.sells ? <p>You can type your own invoice or delivery note number when you issue it; otherwise Parallax numbers it for you.</p> : null}
        {f.buys && !f.sells ? <p>Your purchase order can carry your own number if your accounts office uses one.</p> : null}
      </>
    ),
  };
}

function payments(f: { sells: boolean; buys: boolean }): GuideSection {
  return {
    id: "payments",
    title: "Payments",
    lead: "Parallax records payments. It never takes, holds or moves money.",
    body: (
      <>
        <p>
          <strong>Payments</strong> lists invoices not yet paid in full{f.sells && f.buys ? ", in two parts: owed to you, and what you owe" : ""}, with
          the balance and due date of each. Overdue invoices are counted separately.
        </p>
        <ul>
          {f.sells ? (
            <li>
              <strong>When a customer pays you</strong>, open the order and record the payment: amount, date, method (bank transfer, mobile money, cash or
              cheque) and reference. Part payments add up.
            </li>
          ) : null}
          {f.buys ? (
            <li>
              <strong>When you pay a supplier</strong>, pay into the bank details on their invoice. The supplier records it, and your balance updates.
            </li>
          ) : null}
          <li>An order closes by itself once it is received and paid in full.</li>
        </ul>
        <Shot src="payments" path="/payments" caption="Payments: invoices with a balance, due dates and what is overdue." />
      </>
    ),
  };
}

function notifications(): GuideSection {
  return {
    id: "notifications",
    title: "Notifications and the activity log",
    lead: "Know what happened without phoning anyone.",
    body: (
      <>
        <p>
          The <strong>bell</strong> at the top shows a red count of unread notifications: connection requests, new inquiries, quotes, purchase orders,
          dispatches, deliveries and payments on your orders, plus announcements from the Parallax team. Click it to see them all; each one links to its order.
        </p>
        <Shot src="notifications" path="/notifications" caption="Notifications: newest first. Announcements from the Parallax team are marked." />
        <p>
          The <strong>Activity log</strong> records every change in your account: quotes sent, prices changed, stock corrected and why, settings saved. Use
          it to check who did what and when.
        </p>
      </>
    ),
  };
}

function subscription(): GuideSection {
  return {
    id: "subscription",
    title: "Billing and your subscription",
    lead: "Manufacturers, wholesalers and pharmacies pay a subscription. Clients use Parallax free.",
    body: (
      <>
        <FlowStrip
          label="Subscription timeline"
          stations={[
            { icon: "hourglass", title: `Free trial`, text: `A new account has ${TRIAL_DAYS} days free. A reminder shows in the last week.`, tone: "good" },
            { icon: "badge", title: "Subscribed", text: "Pay the Parallax team; they record the payment and your account runs until the end of the period paid for.", tone: "good" },
            { icon: "calendar", title: "Payment due", text: `When the period ends you have ${GRACE_DAYS} more days with everything working and a notice at the top of each page.`, tone: "warn" },
            { icon: "lock", title: "Read-only", text: "After that you can still sign in, view, print and download, but can't create or change anything.", tone: "bad" },
            { icon: "refresh", title: "Renewed", text: "As soon as the team records your payment, everything works again. Nothing is lost.", tone: "good" },
          ]}
        />
        <h3>The Billing page</h3>
        <Steps
          items={[
            { title: "Open Billing", text: "It shows whether you are on trial, paid up, due or read-only, the date you are paid up to, your fee per month and your last payment." },
            {
              title: "Pay Parallax",
              text: "By bank transfer or mobile money to the details under How to pay, with your business name as the reference.",
            },
            {
              title: "Get your receipt",
              text: "The Parallax team marks your account as paid. Your paid-up date moves on, a read-only account works again at once, and a numbered receipt appears in Payment history. Click Receipt to print it or save it as PDF.",
            },
          ]}
        />
        <Shot src="billing" path="/billing" caption="Billing: your status and due date at the top, every payment with its receipt, and how to pay." />
        <Shot src="document-receipt" path="/documents/subscription/…" caption="A subscription receipt from Parallax: what was paid, for which period, and how." />
        <Note title="Paying online">
          Paying by card or mobile money straight from the Billing page is coming. Your receipt will then appear as soon as the payment goes through.
        </Note>
        <p>A week before your trial or paid period ends, when a payment is due, and if the account becomes read-only, a reminder arrives in the bell and a notice at the top of every page links to Billing. When the team records your payment, the bell thanks you with the receipt. Your connections and orders carry on through every stage.</p>
      </>
    ),
  };
}

function free(): GuideSection {
  return {
    id: "free",
    title: "Free for clients",
    lead: "Hospitals, clinics, schools and NGOs use Parallax free of charge.",
    body: (
      <p>
        There is no trial and no subscription: your account never becomes read-only. Your suppliers pay for their own accounts, so asking them for quotes on
        Parallax costs you nothing.
      </p>
    ),
  };
}

function privacy(f: { sells: boolean; stock: boolean; counter: boolean }): GuideSection {
  const hidden = ["Your prices to other customers, and any quote not sent to them", "Your private notes on orders", "Your private customer and supplier list"];
  if (f.stock) hidden.push("Your stock levels, batches and costs");
  if (f.counter) hidden.push("Your patients, prescriptions and counter sales");
  hidden.push("Orders between you and anyone else");
  return {
    id: "privacy",
    title: "What other businesses can see",
    lead: "Parallax is built so no business can see another's prices.",
    body: (
      <>
        <Compare
          left={{
            title: "A business you trade with sees",
            items: [
              "Your name, contact details and TPIN on documents between you",
              "The orders and documents between the two of you",
              ...(f.sells ? ["The names of items you show (never the price or stock)", "Your bank details, on invoices you issue them"] : []),
            ],
          }}
          right={{ title: "Nobody else sees", items: hidden }}
        />
        <p>
          In the directory other businesses see only your name, type and town, and only if you chose to be listed. The Parallax team runs accounts and
          subscriptions but cannot open your stock, prices, orders, documents, contacts{f.counter ? " or patients" : ""}. Bank details, TPIN and licence
          numbers, private contacts and order notes{f.counter ? ", and patient details" : ""} are stored encrypted.
        </p>
      </>
    ),
  };
}

function questions(kind: OrgKind, f: { sells: boolean; buys: boolean; stock: boolean }): GuideSection {
  const items: { q: string; a: React.ReactNode }[] = [];
  if (f.buys)
    items.push(
      { q: "Why can't I see a supplier's prices?", a: "Prices are private on Parallax. Send an inquiry and the supplier quotes you; only you see that quote." },
      { q: "A supplier I need isn't in Find businesses", a: "They may not be listed or not on Parallax yet. Add them to your private supplier list and send them a printed inquiry." },
      { q: "Can I change an order after accepting?", a: "Ask the supplier: they can change the price or lines until they invoice, and you accept the new quote. Before you accept you can cancel." },
    );
  if (f.sells)
    items.push(
      { q: "Can a customer see my prices to someone else?", a: "No. Each quote is seen only by the business you send it to." },
      { q: "Why can't I dispatch?", a: "On pay before delivery terms, the order must be invoiced and paid in full first. Record the payment, then dispatch." },
      { q: "I priced something wrongly", a: "Send a new price from the order. If the customer had accepted, they accept again. Once invoiced, the price is fixed." },
    );
  if (f.stock)
    items.push({ q: "I received stock but it isn't in my inventory", a: "Complete the line in Inventory → Waiting from deliveries with its batch and expiry, then Add to stock." });
  items.push(
    { q: "Who can sign in to our account?", a: "One login per business. Keep the password safe. If you lose it, the Parallax team can give you a temporary one, which you change at first sign-in." },
    { q: "Can I use Parallax on my phone?", a: "Yes. It runs in any modern browser on a computer, tablet or phone. Nothing to install." },
  );
  if (kind !== "CLIENT")
    items.push(
      { q: "What happens if we don't renew?", a: `${GRACE_DAYS} days of reminders, then read-only until you renew. Nothing is deleted.` },
      { q: "Where are our subscription receipts?", a: "On the Billing page, under Payment history. Each payment has a numbered receipt you can print or save as PDF." },
    );
  return { id: "questions", title: "Quick answers", body: <Faq items={items} /> };
}
