import { GRACE_DAYS, TRIAL_DAYS } from "@/lib/subscription";
import { DELETE_RETENTION_DAYS } from "@/lib/org-deletion";
import { Compare, Faq, GuideFrame, MenuList, Note, Shot, Steps, type GuideSection } from "./Blocks";
import { FlowStrip } from "./FlowStrip";
import { NetworkMap } from "./NetworkMap";

/** The guide for the Parallax team (/admin/guide). Screenshots: scripts/guide-shots.ts. */
export function TeamGuide() {
  const sections: GuideSection[] = [
    {
      id: "overview",
      title: "Your account at a glance",
      lead: "The team area runs the platform: who is on Parallax, their logins and subscriptions, and what you tell them.",
      body: (
        <>
          <Shot src="team-overview" path="/admin" caption="Overview: businesses by type, subscriptions to follow up, and the newest businesses." />
          <MenuList
            items={[
              { name: "Overview", text: "Counts of businesses by type, subscriptions ending soon, due or read-only, open demo requests, newest sign-ups." },
              { name: "Businesses", text: "Every business account. Create one, edit its details, manage its login and record subscription payments." },
              { name: "Announcements", text: "Messages to everyone, to one account type, or to one business. They appear in each business's notifications." },
              { name: "Demo requests", text: "Requests sent from \"Request a demo\" on the website." },
              { name: "Team activity", text: "Every action the team takes, with who and when." },
              { name: "Guide", text: "This page." },
            ]}
          />
        </>
      ),
    },
    {
      id: "limits",
      title: "What you can and can't see",
      lead: "The team manages accounts from the outside. It is kept out of every business's trade on purpose.",
      body: (
        <>
          <NetworkMap kind="ADMIN" />
          <Compare
            left={{
              title: "You can see and change",
              items: [
                "Business name, type, town, address, phone, email and website",
                "The login's name and email, and whether it is switched on",
                "Subscriptions and the payments you record",
                "Announcements, demo requests and the team's own activity",
              ],
            }}
            right={{
              title: "You can't see",
              items: [
                "Items, prices, stock, batches",
                "Inquiries, quotes, orders, invoices, delivery notes and payments between businesses",
                "Private contacts, patients and prescriptions",
                "Bank details, TPIN and licence numbers",
              ],
            }}
          />
          <p>
            This is enforced by the database, not just the screens: the team area connects with its own database login that has no access to
            business tables at all. There is no way to sign in as a business. To help one, ask them to share their screen or send you a printed document.
          </p>
        </>
      ),
    },
    {
      id: "businesses",
      title: "Creating and managing businesses",
      lead: "Businesses can sign up themselves on the website, or you can create one for them.",
      body: (
        <>
          <h3>Create a business</h3>
          <Steps
            items={[
              { title: "Open Businesses", text: "Use the Create a business account form." },
              { title: "Fill in the business and its owner", text: "Account type, business name, town, phone, the owner's name and the email they will sign in with." },
              {
                title: "Give them the temporary password",
                text: "It is shown once, after Create account. Send it to the owner privately. They must choose their own password the first time they sign in.",
              },
            ]}
          />
          <Shot src="team-businesses" path="/admin/businesses" caption="Businesses: search by name, town or login email, filter by type and status, or create a new account." />
          <h3>Edit, suspend or delete</h3>
          <p>Open a business to change its account details (its type is fixed once created). At the side of the page:</p>
          <ul>
            <li>
              <strong>Suspend</strong>: the login stops working until you <strong>Reactivate</strong>. Nothing is deleted.
            </li>
            <li>
              <strong>Delete</strong>: the login stops at once and the business&apos;s own records (items, stock, contacts, patients, logs) are erased after{" "}
              {DELETE_RETENTION_DAYS} days. You can reactivate it until then. Orders it made with other businesses stay in their history under its name.
            </li>
          </ul>
          <Shot src="team-business" path="/admin/businesses/…" caption="One business: its details, its login, its subscription and the team's actions on this account." />
        </>
      ),
    },
    {
      id: "logins",
      title: "Logins and passwords",
      lead: "One login per business. You can help when someone is locked out.",
      body: (
        <>
          <MenuList
            items={[
              { name: "Reset password", text: "Makes a temporary password, shown to you once. The owner is signed out everywhere and must choose a new password with it." },
              { name: "Sign out everywhere", text: "Ends every open session on every device, e.g. after a lost phone. The password doesn't change." },
              { name: "Switch off login", text: "Stops this login from signing in until you switch it on again." },
            ]}
          />
          <Note tone="watch" title="Check who is asking">
            Before resetting a password, confirm the request really comes from the business (call the number on its account, not one given in the request).
          </Note>
        </>
      ),
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      lead: "Manufacturers, wholesalers and pharmacies pay. Clients never do.",
      body: (
        <>
          <FlowStrip
            label="A paying account's year"
            stations={[
              { icon: "hourglass", title: "Trial", text: `Every new paying account starts with ${TRIAL_DAYS} days free.`, tone: "good" },
              { icon: "badge", title: "Payment recorded", text: "You record each payment; the period runs to the end of the months it covers.", tone: "good" },
              { icon: "calendar", title: "Payment due", text: `When it ends, the business has ${GRACE_DAYS} days with a notice on every page. Overview lists it.`, tone: "warn" },
              { icon: "lock", title: "Read-only", text: "Then it can sign in, view and print, but not create or change anything.", tone: "bad" },
              { icon: "refresh", title: "Renewed", text: "Record the payment and it works again at once. Nothing is lost.", tone: "good" },
            ]}
          />
          <Steps
            items={[
              { title: "Receive the payment", text: "Parallax doesn't take payments; the business pays the company directly." },
              { title: "Open the business", text: "Under Record a payment, enter the amount in Kwacha, the date paid, the months it covers and the bank or receipt reference." },
              { title: "Record payment", text: "The subscription period moves on and the business's notice disappears." },
            ]}
          />
        </>
      ),
    },
    {
      id: "announcements",
      title: "Announcements",
      lead: "Tell businesses about maintenance, new features or anything else.",
      body: (
        <>
          <Steps
            items={[
              { title: "Choose who it goes to", text: "Everyone, one account type (e.g. all wholesalers), or one business: type part of its name and pick it from the list." },
              { title: "Write a title and message", text: "Short and plain. It appears in their notifications, marked as from the Parallax team." },
              { title: "Send announcement", text: "The list below shows what was sent and how many people have read it." },
            ]}
          />
          <Shot src="team-announcements" path="/admin/announcements" caption="Announcements: the form, and everything sent so far with its read count." />
          <p>Email and text-message delivery will come later through the same announcements.</p>
        </>
      ),
    },
    {
      id: "demos",
      title: "Demo requests",
      lead: "Businesses that asked to see Parallax before signing up.",
      body: (
        <>
          <p>
            Each request shows the name, business, email, phone and notes from the website form. Contact them, then click{" "}
            <strong>Mark as contacted</strong> so the rest of the team knows. Overview counts the ones still to contact.
          </p>
          <Shot src="team-demo-requests" path="/admin/demo-requests" caption="Demo requests: newest first, with who still needs a call." />
        </>
      ),
    },
    {
      id: "activity",
      title: "Team activity and team logins",
      lead: "Everything the team does is recorded.",
      body: (
        <>
          <p>
            <strong>Team activity</strong> lists every action: businesses created, edited, suspended or deleted, passwords reset, logins switched off,
            subscription payments recorded, announcements sent. Each entry says who did it and when.
          </p>
          <p>
            Team logins are not created on the website. Whoever runs the server adds one with{" "}
            <code className="rounded bg-shelf px-1.5 py-0.5 font-mono text-xs">npm run admin:create</code>, which prints a temporary password to change at
            first sign-in.
          </p>
        </>
      ),
    },
    {
      id: "questions",
      title: "Quick answers",
      body: (
        <Faq
          items={[
            { q: "A business says its prices were seen by a competitor", a: "Prices only exist in quotes sent to one buyer, and each business's data is closed to every other one at the database level. Ask which document they mean and who it was sent to." },
            { q: "Can I correct a business's order or invoice?", a: "No. Only the two businesses on the order can change it. The seller can send a new price until it invoices." },
            { q: "A business chose the wrong account type", a: "The type can't be changed on an existing account, because its connections and orders depend on it. Create a new account with the right type and delete the old one." },
            { q: "Why isn't a client listed under subscriptions?", a: "Clients use Parallax free of charge, so they have no subscription." },
          ]}
        />
      ),
    },
  ];

  return (
    <GuideFrame
      eyebrow="Parallax team guide"
      title="How the team area works"
      intro="Running Parallax: business accounts, logins, subscriptions and announcements, and the line you don't cross into a business's trade."
      facts={[
        { label: "You manage", value: "Accounts, logins, subscriptions" },
        { label: "You tell", value: "Everyone, a type, or one business" },
        { label: "You can't see", value: "Stock, prices, orders, documents" },
        { label: "Every action", value: "Recorded in Team activity" },
      ]}
      sections={sections}
    />
  );
}
