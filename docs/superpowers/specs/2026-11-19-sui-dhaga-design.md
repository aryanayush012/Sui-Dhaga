# Sui-Dhaga — Tailor Order Tracking (Design, v1)

Date: 2026-11-19

## Why

A local tailor takes bulk orders (school uniforms plus regular clothes). Each customer gets a paper slip with an ID and a tentative date. In peak season, when the customer returns, the tailor doesn't know whether that slip's garment is cut, stitched, ironed or ready — or **where in the shop it physically is**. He searches the whole shop while 5–6 more customers wait.

Sui-Dhaga is a mobile-first PWA: a simple Jira-like board where every order is a ticket that moves through production stages, carries a rack location, and keeps the customer informed via WhatsApp and a public tracking link.

It starts with one pilot shop but is built as multi-tenant SaaS so many tailor shops can sign up later.

## Goals (v1)

- Find any order in seconds by slip number or mobile: see its stage and **rack**.
- See every order's production stage on a board; move it with one tap.
- Owner assigns orders to employees; employees update their own orders from their phones.
- Spot orders about to be late.
- Track total charge, advance and later payments; show balance due.
- Customer gets WhatsApp messages (created / date changed / ready) with a public tracking link.
- Each shop's data is completely isolated from every other shop.

## Non-goals (v1)

- Bulk school-order entry (assume each child is measured individually, one order each).
- Payment gateway; GST/invoicing; inventory; reports/analytics charts.
- Saved customer measurement profiles; custom measurement templates.
- QR/barcode scanning.
- Customer accounts.
- Automatic WhatsApp sending via the official API (later phase — see below).

## Anti-goals (failure even if it "works")

- Creating an order is slower than writing a paper slip → tailor abandons it. Target: name + mobile + photo + date + rack in under 30 seconds; full typed measurements optional.
- One shop can ever see another shop's customers.
- Payment records silently edited or lost.
- An employee confused by English-only or crowded screens.

## Users and permissions

| | Owner | Employee | Customer |
|---|---|---|---|
| Login | mobile + password | mobile + PIN (set by owner) | none — public tracking link |
| Create / edit / cancel orders | ✓ | ✗ | |
| Change due date, prices, payments | ✓ | ✗ | |
| See board, search orders | ✓ | ✓ | |
| See customer mobile number | ✓ | ✗ | |
| Move stage of orders | all orders | orders assigned to them (unassigned too — see open calls) | |
| Set rack number | ✓ | ✓ | |
| Add / deactivate employees | ✓ | ✗ | |
| Send WhatsApp messages | ✓ | ✗ | |
| Search by | slip #, name, mobile | slip #, name | |

**Accounts:**
- One mobile number belongs to exactly one shop (one account). An employee can't belong to two shops in v1.
- Password/PIN recovery: the owner resets employee PINs. If an **owner** forgets their password, the platform admin resets it by hand after verifying them by phone or WhatsApp. No SMS OTP or email in v1.
- Pilot shops (and their owner accounts) are created by hand by the platform admin, using a script or the Supabase dashboard that seeds the shop, its stages and the owner. Public self sign-up comes after the pilot and needs anti-abuse controls.

## Order ticket

Created by the owner. Required fields keep the counter fast:

- **Required:** customer name, mobile, tentative delivery date.
- **Auto:** slip number (sequential per shop, never duplicated), created date, tracking token.
- **Optional:** rack number (free text, e.g. "B3"), assigned employee, total charge, advance (+ method: cash / UPI / other), notes.
- **Garments** (one or more per order): type (pant / shirt / suit / blouse / other), quantity, cloth photo, measurements, instructions.
  - Measurements: **either** a photo of the paper slip **or** typed fields (tailor picks). Typed fields per type:
    - Pant: waist, hip, length, thigh, knee, bottom, crotch
    - Shirt: chest, shoulder, sleeve, length, neck, waist
    - Suit: chest, shoulder, sleeve, length, waist
    - Blouse: bust, waist, shoulder, sleeve, length
    - Other: free-text only
- The physical paper slip stays; the app's slip number is written on it.

## Workflow

- Production stages per shop, seeded with: **Cutting → Stitching → Ironing → Ready**. Stored per shop so they can be edited later; v1 has no stage-editing UI.
- Special states outside the stages: **On Hold**, **Cancelled**, **Delivered**.
- Moving to Ready (by owner or employee) prompts for the rack number if it's empty.
- **Status communicated badge:** a card shows a ✓ "Status communicated" badge when the WhatsApp message for its current trigger (created / date changed / ready) has been sent from the owner's phone. No badge means the customer hasn't been told yet. The board updates live, so when a karigar moves an order to Ready, the owner sees it without the badge and taps send. There are no push notifications in v1; the owner sees it when they open the app.
- Delivered is always manual (owner). Ready ≠ Delivered; fully paid ≠ Delivered.
- Every change (stage, assignee, due date, rack, payment) is written to an order activity log with who and when.

## Deadline chip (separate from stage)

| Condition (order not Ready/Delivered/Cancelled) | Chip |
|---|---|
| due in > 2 days | none |
| due in 1–2 days | Approaching (amber) |
| due today | At risk (orange) |
| past due | Overdue (red) |

Thresholds are constants for v1.

## Payments

- Order has a total charge (optional, editable by owner). Total changes are logged in `order_events`.
- Payments are separate append-only entries: amount, method, date, note, recorded by. The advance is simply the first entry.
- An advance can be recorded before the total is set.
- Balance = total − sum(payments). Status: Unpaid / Partial / Paid, derived, not stored. With no total set, the card shows "₹X paid" and no balance.
- Once a total is set, the sum of payments can't exceed it, and the total can't be lowered below what's already been paid.
- A wrong entry or a refund (e.g. on a cancelled order) is a **negative** entry with a required note. Entries are never edited or deleted.

## Screens (mobile-first)

1. **Board (home):** search bar (slip # / name / mobile) on top; stage tabs swiped horizontally with counts; cards show slip #, name, garment summary, due date, rack, assignee, deadline chip, balance due; "Move →" button. Toggle "My orders" for employees.
2. **New order:** one screen — name, mobile, date, rack, then "Add garment" (type, qty, cloth photo, measurements photo-or-fields), then optional charge/advance/assignee. Save.
3. **Order detail:** everything above + activity log + payments + actions (move stage, assign, change date, add payment, hold, cancel, deliver, send WhatsApp, copy tracking link).
4. **Employees (owner):** list, add (name, mobile, PIN), deactivate.
5. **Settings (owner):** shop name, address, logo, language.
6. **Public tracking page** `/t/<token>`: shop name, slip #, garments (no measurements), stage, due date, Ready/Delivered, balance due. No employee data, no internal notes. Owner can disable a link.

```
┌─────────────────────────┐
│ 🔍 Slip # / mobile      │
├─────────────────────────┤
│ Cutting(4) Stitching(9) │ ← swipe
├─────────────────────────┤
│ #142 Ramesh · 2 Pant    │
│ Due 22 Nov · Rack B3    │
│ 👤 Suresh  ⚠ Approaching│
│ ₹300 due  [Move → Iron] │
└─────────────────────────┘
```

Language: Hindi and English, switchable; large touch targets; simple words.

## WhatsApp

**v1 (free):** one-tap send. The app opens `https://wa.me/91<mobile>?text=<prefilled>` which launches the tailor's own WhatsApp / WhatsApp Business app with the message ready; tailor taps send. Triggers (owner sees a "Send on WhatsApp" prompt):
- Order created → shop name, slip #, garments, due date, tracking link.
- Due date changed → new date, tracking link.
- Ready → "ready for collection", balance due, tracking link.

Only the owner's phone sends, so messages always come from the shop's number. Tapping "Send on WhatsApp" records a `whatsapp_sends` row for that trigger, and that row drives the "Status communicated" badge. Limitation: the app knows WhatsApp was opened with the message, not that the owner actually pressed send.

**Later phase (paid, ~₹500/month/shop):** official WhatsApp Cloud API with approved utility templates, sent automatically from a background job; failures never block order operations. To keep cost down, a counter QR lets the customer message the shop first, opening Meta's free 24-hour window for the "created" message. Before building: confirm Meta "coexistence" (same number in the Business app and the API) is available in India, decide whether each shop connects its own number, and confirm current pricing.

## Approaches considered

| | Trade-off | Decision |
|---|---|---|
| **Next.js PWA + Supabase (Postgres)** | Tenant isolation enforced in the DB (row-level security); sequential IDs, transactions, search, filters and payment sums are plain SQL; auth + photo storage included; flat pricing. Needs internet to make changes. | **Chosen** |
| Next.js PWA + Firebase | Best offline sync and live updates. But no text search (needs Algolia), filters need per-combination indexes, payment totals awkward, per-read billing unpredictable, lock-in. | Rejected — search/filters/payments matter more than offline |
| React + Express + MongoDB (as in original PRD) | Familiar stack, scales fine. But tenant isolation, payment integrity and auth must all be hand-built and tested; one missed `shopId` filter leaks data. | Rejected |

## Technical decisions

- **Frontend:** Next.js (App Router; it is React) + TypeScript + Tailwind. Chosen over a plain React/Vite app so that the tracking page's server lookup, WhatsApp link previews (per-order meta tags) and the later WhatsApp API webhook all live in one project on Vercel. The app is an installable PWA (manifest + service worker caching the app shell and last-loaded board for read-only offline viewing).
- **Backend:** Supabase — Postgres, Auth, Storage, Realtime (board updates live across phones).
- **Tenant isolation:** every shop-owned table has `shop_id`; RLS policies restrict rows to the signed-in user's shop; employee restrictions (no mobile number, only own orders' stage) enforced by RLS/views, not just UI. An automated test signs in as shop A and must fail to read/write shop B.
- **Slip numbers:** per-shop counter incremented atomically in a Postgres function inside the order-create transaction.
- **Auth:** Supabase Auth with mobile+password (owner) and mobile+PIN (employee), without SMS OTP (avoids per-SMS cost). Implementation detail (e.g. synthetic email per user) left to the builder.
- **Photos:** compressed in the browser (~1280px, ~200 KB) before upload to a private Supabase Storage bucket, path-scoped by shop; served via signed URLs. The tracking page shows no photos in v1. No automatic cleanup in v1, since one pilot shop fits inside the free storage tier. Retention rules get decided after the pilot.
- **Employee data restriction:** employees read orders through a view or RPC without `customer_mobile`. Since Realtime can't hide columns, the employee board uses Realtime only as a "something changed" signal and refetches through that view.
- **Tracking token:** random ≥ 128-bit, URL-safe; served by a server route that returns only customer-safe fields.
- **Hosting:** Vercel + Supabase free tiers for the pilot.

## Data model (sketch)

- `shops` (id, name, address, logo_url, language, slip_counter, created_at)
- `members` (id = auth user id, shop_id, name, mobile, role owner|employee, is_active)
- `stages` (id, shop_id, name, position)
- `orders` (id, shop_id, slip_no, customer_name, customer_mobile, due_date, stage_id, special_state null|on_hold|cancelled|delivered, rack, assignee_id, total_amount, notes, tracking_token, tracking_enabled, created_by, created_at, updated_at) — unique (shop_id, slip_no)
- `garments` (id, shop_id, order_id, type, qty, cloth_photo_path, measurement_photo_path, measurements jsonb, instructions)
- `payments` (id, shop_id, order_id, amount, method, note, recorded_by, created_at) — insert-only
- `order_events` (id, shop_id, order_id, action, from_value, to_value, actor_id, created_at) — insert-only
- `whatsapp_sends` (id, shop_id, order_id, kind, opened_by, created_at)

## Delivery order

1. **Foundation:** admin script to create a shop + owner, owner/employee login, RLS + isolation test, stages seeded.
2. **Orders + board:** create order (garments, photos, measurements), slip numbers, rack, board with stage moves, search, deadline chips, order detail + activity log, assignment.
3. **Customer + money:** tracking page, one-tap WhatsApp, charge/advance/payments, balance on cards, Hindi/English.
4. **→ Pilot in a real shop.** Measure: order-entry time, % orders updated digitally, time to find an order, overdue count.
5. **After pilot, only if feedback asks:** public shop sign-up, owner push notifications, photo retention, list view + filters, payments summary screen, dashboard, stage editing, official WhatsApp API, offline edits, bulk school orders.

## Left to the builder

- Exact auth mechanics for mobile+password / PIN on Supabase.
- Component library choice, i18n library, service-worker tooling.
- Index choices, exact RLS policy SQL, image compression library.

## Calls made by Claude (please check)

- Employees may move **unassigned** orders as well as their own (so work isn't blocked when the owner forgets to assign).
- Employees can set the rack number.
- Deadline thresholds: Approaching = 1–2 days.
- No stage-editing UI in v1 (stages stored per shop, seeded).
- Hindi + English in v1.
- Tracking page shows balance due but no photos or measurements.
- Owner login uses mobile + password (no email, no SMS OTP); a forgotten owner password is reset by hand by the platform admin.
- One mobile number = one shop.
- Pilot shops are set up by hand; no public sign-up in v1.
- Payment rules: advance allowed before the total is set, total can't drop below paid, corrections and refunds are negative entries with a note.
- Employees search by slip # or name only.
- No photo cleanup in v1.
