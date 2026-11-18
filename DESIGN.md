# Parallax — design system

The signed-in app looks like a calm, professional pharmacy ledger: deep pine green, warm parchment and a brass accent, with a sturdy grotesque display face over a clean sans. The public landing page uses the brand palette below on white. Every new screen should look like it was always part of the app. When in doubt, copy an existing page.

## Do not

- Add colors, fonts, shadows or radii outside the tokens below.
- Add a component library (shadcn, MUI, Chakra), CSS-in-JS, or a second icon set.
- Add dark mode, gradients on cards, glassmorphism, emoji, or illustrations.
- Use raw Tailwind palette colors (`blue-500`, `gray-200`) for UI chrome. The only exceptions are the status tints in `Badge`.
- Show `$` or unformatted numbers for money; always use `money()` (ZMW, shown as `K 11.20`).
- Show raw enum codes (`WHOLESALE_ADMIN`, `QUOTED`) to users; use `ROLE_LABEL` / `STATUS_LABEL`.

## Tokens (`tailwind.config.ts`)

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#12211f` | Body text (`text-ink`, muted `text-ink/60`–`/70`) |
| `pine-950` | `#071614` | Sidebar, login hero panel |
| `pine-900` | `#0b2a26` | Headings, borders at `/10`–`/15` |
| `pine-800` | `#0f3d37` | Primary button, chart stroke |
| `pine-700` | `#16554c` | Labels and eyebrows at `/70`–`/80`, chart fill, hover |
| `pine-600` | `#1c6b60` | Reserve |
| `sage-100` | `#e8f0ea` | Ghost hover, neutral badge |
| `sage-300` | `#b7cfc0` | Text on dark (sidebar) |
| `sage-500` | `#6f9a86` | Secondary accents |
| `parchment` | `#f4efe6` | Page background, text on dark buttons |
| `brass` | `#c4a35a` | Brand mark, focus ring (`ring-brass/40`), "in progress" badge |
| `rust` | `#b85c38` | Form errors (`text-rust`) |

Page background is `bg-parchment` plus two soft radial washes (brass top-left, pine top-right), set in `globals.css`. Don't add more.

**Shadow:** only `shadow-panel`. **Radii:** `rounded-2xl` panels/cards, `rounded-xl` nav items and brand mark, `rounded-lg` inputs/buttons, `rounded-full` badges.

## Brand (Parallax)

| Name | Hex | Tailwind | Use |
| --- | --- | --- | --- |
| Pine | `#0F3D37` | `pine-800` | Brand colour: headings, primary buttons |
| Pine hover | `#164F47` | — | Primary button hover |
| Dispensary green | `#128C5E` | `dispensary` | Accent: icons, active nav, "Delivered" |
| Green tint | `#E3F3EC` | `dispensary-soft` | Status strips |
| Expiry amber | `#B86E0B` | `expiry` | Expiry dates only |
| Ink | `#13201E` | `ink` | Main text |
| Body text | `#3A4A47` | — | Paragraphs (landing) |
| Foil grey | `#6B7C77` | `foil` | Secondary text |
| Rule | `#D9E2DE` | `rule` | Dividers, borders |
| Shelf | `#EEF3F0` | `shelf` | Alternate section background |

- **Logo:** `public/brand/parallax-logo.png` (pill behind, crossed bandage in front, pine on transparent). On dark backgrounds put it on a white rounded tile (`bg-white rounded-xl p-1`); never recolour or stretch it. Favicon is `app/icon.png`.
- **Landing page** (`app/page.tsx` + `app/landing.module.css`): white base, left-aligned, plain lists divided by rules rather than card grids; sentence case, no all-caps labels above headings, no arrows appended to button text. One orchestrated motion only (the dispatch label feed), with a Pause control, hover pause and reduced-motion fallback. Keep landing styles in the CSS module so they never leak into the app.

## Typography

- **Display** `font-display` (Schibsted Grotesk 500–700, loaded with `next/font/google` in `app/layout.tsx`; don't add a `<link>` tag): page titles `text-3xl`, panel titles `text-xl`, stat values `text-3xl`, login hero `text-5xl`. Always `text-pine-900` on light backgrounds.
- **Sans** `font-sans` (Source Sans 3, loaded with `next/font/google` as `--font-source-sans`), the default: body `text-sm`.
- **Eyebrow / label / table header**: `text-[11px] font-semibold uppercase tracking-[0.12em–0.18em] text-pine-700/70`.
- **References** (invoice, Rx, order numbers): `font-mono text-xs`.

## Layout

- **Shell** (`components/Shell.tsx`): dark sidebar + content column. On `lg`+ the sidebar is sticky and collapsible: 260px expanded, 76px icon rail collapsed (labels become `sr-only`, links get a `title` tooltip); the "Collapse menu" toggle sits at the bottom and the choice is remembered in localStorage. Below `lg` the sidebar is a top bar with a Menu/X button that opens the nav and closes on navigation. The header is white at 70% with blur and holds the user name and role, global search, and Sign out. Main content is `px-6 py-6`.
- **Page** = `<PageHeader title description action? />`, then sections. Titles are short nouns ("Sales counter", "Wholesale orders"); the description is one plain sentence about what the page does.
- **Panel**: `rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel`, with an optional `<h2 className="mb-3 font-display text-xl text-pine-900">`.
- **Grids**: KPI rows use `grid gap-4 md:grid-cols-2 xl:grid-cols-4` (or `md:grid-cols-3`) of `<StatCard>`. A main list beside a side form/panel uses `grid gap-6 xl:grid-cols-[1.4fr_0.9fr]`, wider column first and stacked below `xl`.
- The app must stay usable down to phone width; tables may scroll horizontally inside their panel.

## Components (reuse before creating)

| Need | Use |
| --- | --- |
| Page title | `PageHeader` |
| KPI | `StatCard` (label, value, hint) |
| Status pill | `Badge` with tone `neutral` / `good` / `warn` / `bad` / `brass`; for wholesale, `statusTone()` |
| Table | `<table className="table-grid">` (header and cell styles come from globals.css) |
| Buttons | `btn btn-primary` (one main action per form/panel), `btn btn-ghost` (secondary, Sign out), `btn btn-danger` (rust; only for the final destructive action in a confirmation) |
| Inputs | Plain `<label>` + `<input>/<select>/<textarea>`, already styled globally (selects get an inset pine chevron, no native arrow); link labels with `htmlFor`/`id`; stack in `grid gap-3`. Money inputs use `step="any"` so prices like 7.75215 are accepted |
| Row actions | Icon-only ghost button (`rounded-lg p-2 text-pine-700 hover:bg-sage-100`, lucide `Pencil` etc.) with `aria-label` and `title`; editing is inline: the row's cells turn into compact inputs (`h-8 px-2 py-1 text-xs`, joined to one form via the `form` attribute) with Save / Cancel icon buttons, plus one row below asking for the reason (required). Esc cancels. Not a modal. A destructive row action uses the `Trash2` icon in `text-rust hover:bg-rust/10` |
| Confirmation modal | Only for destructive actions (e.g. delete). Native `<dialog className="modal">` opened with `showModal()` (focus trap, Esc closes, backdrop click closes). Content: rust warning icon tile, Playfair title "Delete X?", plain-English consequence incl. the restore deadline, required reason `<textarea>`, an "I'm sure" checkbox; the `btn-danger` stays disabled until both are filled. Cancel is `btn-ghost` on the left |
| Checkboxes | Globally styled (`h-4 w-4`, pine accent); pair with a sentence-case label using `normal-case tracking-normal font-normal` |
| Report link | `btn btn-ghost` with an icon, e.g. `FileText` + "View report", in the last table column |
| Downloads | `<a className="btn btn-ghost" download>` with `Download` icon; put them in the `PageHeader` action or the panel toolbar. Reports are CSV with a UTF-8 BOM; import templates are .xlsx |
| Excel templates | Header row: required columns pine-800 fill with parchment text, optional columns sage-100 fill; frozen header; dates `dd/mm/yyyy`; dropdowns sourced from a hidden "Lists" sheet built from the same constants as the form; a "How to" sheet explains each column |
| Labels in tables | Spell out flags rather than abbreviating (e.g. "Prescription: Required / Not required", not "Rx") |
| Charts | `SalesChart` (area) / `MixChart` (horizontal bar): recharts, pine colors, faint grid, no legend clutter |
| Icons | `lucide-react`, `h-4 w-4` inline, `h-5 w-5` in the brand mark |
| Search | `HeaderSearch` / `SearchInput` / `SearchScope` |

Badge tone meaning: **good** = done or healthy (delivered, dispensed, completed); **brass** = in progress (price sent, preparing, out for delivery); **warn** = needs attention (requested, low stock, expiring); **bad** = stopped (declined, cancelled, out of stock); **neutral** = informational.

## Forms

- Client component, submits with `fetch` as JSON, shows the API `error` as `<p className="mt-2 text-sm text-rust">`, then resets and calls `router.refresh()`.
- One full-width `btn btn-primary` at the bottom with a verb label ("Create account", "Record sale", "Send price").
- Use HTML validation (`required`, `type`, `min`) as well as the server-side zod checks.

## Voice and copy

- Plain English for pharmacy counter staff in Zambia. Short, direct, no jargon: "Sales counter", "Stock take", "Price sent", "Ready for delivery", "Activity log".
- Sentence case for titles and buttons. Labels are uppercase only through the global `label` style.
- Money in Kwacha via `money()`. Dates: `dd MMM yyyy`, with ` HH:mm` when time matters; `dd MMM` on chart axes.
- Empty states: one sentence about what will appear and how to add it.

## Checklist for a new screen

1. Lives under `app/(console)/` or `app/(portal)/portal/` and inherits the Shell.
2. Starts with `PageHeader`; content sits in panels.
3. Uses only the tokens and components above.
4. Statuses go through `Badge`, money through `money()`, labels through the `*_LABEL` maps.
5. Nav entry added to the right role list in `Shell.tsx`, if the page is top-level.
6. Checked at phone width and desktop width.
