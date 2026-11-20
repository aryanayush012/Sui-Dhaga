# Sui-Dhaga — Jira-style UI rework (Design)

Date: 2026-11-20 · Builds on: `2026-11-19-sui-dhaga-design.md` (v1, implemented on branch `sui-dhaga-v1`)

## Why

v1 works, but on a phone the screens are crowded: forms open by default, the activity log is in the way, and there are many separate buttons (Send on WhatsApp, Copy tracking link, Hold, Cancel, Deliver). The owner wants it to feel like Jira: a clean board, a clean ticket, the status changed from one dropdown at the top, fields edited only when tapped, and as few taps as possible.

## Goals

- A Jira-style **Board** (swipeable columns) plus a **List** view, with a toggle.
- A Jira-style **ticket**: status dropdown at the top, read-only fields that become editable on tap, history tucked into a tab.
- **One status field** covering everything: `Unstarted → Cutting → Stitching → Ironing → Ready → Delivered`, plus `Rejected`.
- **Karigar** ticket shows only what they need: status, rack, photos, measurements.
- **Payments** are just two fields, Total and Paid. Every change shows up in history.
- **WhatsApp** messages always include paid and remaining amounts and the tracking link. No big "Send" button.
- Fewer screens and taps overall.

## Non-goals

- No new features beyond the list below (no reports, no customer accounts, no paid WhatsApp API yet).
- No change to tenant isolation, auth or the DB security model.

## Anti-goals

- Losing any audit trail. Payments stay append-only under the hood.
- Making the counter flow slower than v1.

## Decisions (from the conversation and mockups)

### Statuses
- New stage **Unstarted** is first for every shop. New orders start there.
- Board columns are the stages: Unstarted, Cutting, Stitching, Ironing, Ready.
- **Delivered** and **Rejected** are end states, kept as today's `special_state` values `delivered` and `cancelled`. "Rejected" is only the UI label for `cancelled`. They're not board columns; search finds them (already true in v1).
- **On hold is removed** from the UI and from the database (`on_hold` no longer allowed; existing `on_hold` rows are resumed).
- One status dropdown for everything. Picking a stage on a Delivered/Rejected order reopens it into that stage. Picking Delivered or Rejected asks for confirmation.
- Karigars' dropdown shows only the stages (Unstarted … Ready), under the existing rule: orders assigned to them, or unassigned.

### Board and List (home)
- Header: shop name, and a **Board | List** toggle, remembered per device.
- Search box, same rules as v1. Search ignores columns and also finds Delivered/Rejected orders.
- **Board:** columns swipe sideways. Each card shows the slip number, `name · garments`, a rack chip, a due-date chip (amber when close, red when late, using the v1 deadline rules) and a karigar avatar (initial). It also shows a green WhatsApp dot when the customer hasn't been told the current status (owner only). The v1 "Move →" button is dropped from cards; you change status on the ticket.
- **List:** one row per order, sorted by due date. Each row shows the slip number, name and garments, rack and due chips, the WhatsApp dot and a status label (lozenge).
- Bottom nav: **Board · New · Settings** for the owner, **Board · Settings** for a karigar.

### Ticket (order detail)
- Top bar: slip number, a small WhatsApp icon (owner only; opens WhatsApp with the message for the current status) and a close button.
- Title: `name · garments`.
- **Status dropdown** under the title, a custom menu with tap targets, not a native `<select>`.
- Owner fields, plain text and tap to edit inline (one field at a time, ✓ to save, ✕ to cancel): Karigar, Rack, Due date, Mobile (tap the number to call; edit with the pencil), Name, Notes, **Total**, **Paid** (shows "₹X due").
- Garments section: photo thumbnails (tap for full size) and an edit pencil per garment, using the existing garment form in a sheet.
- Bottom tabs, owner: **Measurements | History**. History is the existing activity log in the v1 format.
- **Karigar ticket:** status dropdown, Rack (editable), Due date (read-only), photos, measurements. No mobile, money, history, notes or WhatsApp.
- Removed from the ticket: the Send on WhatsApp button, Copy tracking link, the tracking on/off toggle, Hold, Cancel, Deliver, the payments list, and Add payment.

### Payments
- UI shows only **Total** and **Paid**.
- Editing Paid calls a new RPC `set_paid(order, new_paid)`. It adds one payment entry of `new_paid − current_paid`, with method `other` and an automatic note (`"Paid ₹200 → ₹500"`), and logs a `payment` event. Existing rules still apply: it can't go over the total or below zero. Payments stay append-only.
- History shows "Paid ₹200 → ₹500" and "Total ₹800 → ₹900".
- New order: the optional "Paid" field becomes the advance (the existing `advance` input; method `cash`). The method picker is removed from the UI.

### WhatsApp
- Every message includes paid and remaining (when a total is set) and the tracking link. The tracking link is always on, and the toggle is removed from the UI.
- **Opens automatically on the owner's phone:**
  - after **Create** (order booked);
  - when the owner sets status to **Ready**;
  - when the owner saves a new **Due date**.
- When a karigar moves an order to Ready, nothing opens on their phone. The owner sees the green dot on the card and row, and uses the WhatsApp icon on the ticket.
- **Gesture constraint (from v1 reviews):** WhatsApp must open within the tap. For Ready and Due date, the message is known before saving, so open the link synchronously in the click, then save. For Create, the slip number comes back from the server, so open a blank window in the click (`window.open('', '_blank')`) and set its location when the response arrives. If the browser blocks that, the post-create banner shows a WhatsApp icon instead.
- `record_whatsapp_send` stays (it drives the dot), subscribed with `.then` (v1 ruling R7).

### New order
- One short form: Name*, Mobile*, Due date* (default today + 7), Rack, garment chips (tap to add; tap again for the count), and two photo buttons (Cloth, Slip/measurements).
- "More" opens Karigar, Total ₹, Paid ₹ and typed measurements.
- **Create** saves into Unstarted, opens WhatsApp (see above) and goes to the board with a banner: "Order #146 created, write it on the slip." There's no separate success page.

### Settings
- Owner: **Staff** first (list with an on/off toggle, "⋯" → reset PIN, "+ Add karigar"), then **Shop** (one row, "Edit ›" opens name, address and logo), then **App** (Language, Log out).
- The separate Employees screen and nav tab are removed and merged here.
- Karigar: Language and Log out only.

### Tracking page
- Shows the new Unstarted stage and says "Rejected" instead of Cancelled. No on-hold state. Everything else stays as v1.

## Approaches considered

| | Trade-off | Decision |
|---|---|---|
| **Rework the existing screens in place; small DB migration** | Reuses every tested RPC, view and lib; the change is mostly UI plus three small DB changes (Unstarted stage, drop on_hold, `set_paid`, and one `set_status` RPC — see below) | **Chosen** |
| Add a UI component library (e.g. shadcn/Radix) for menus and sheets | Faster dropdowns and sheets, but a new dependency and styling system on a small app | Rejected; the few menus and sheets are simple to hand-roll |
| Rewrite the UI from scratch | Clean slate, but throws away reviewed behaviour (race fixes, gesture handling, offline) | Rejected |

## Technical notes

- **Migration (new file):**
  1. Add an `Unstarted` stage at position 1 for every shop, shifting the existing positions up. Do it in two steps to avoid `unique(shop_id, position)` clashes.
  2. Update `admin_create_shop` to seed 5 stages.
  3. Set any `on_hold` order back to null, then drop `on_hold` from the `special_state` check.
  4. Add `set_paid`.
  5. Add `set_status(p_order_id, p_target text)`, where the target is a stage id, `'delivered'` or `'cancelled'`. It is atomic and writes one event. It uses the v1 permission rules: owner for any target, and a karigar only for stage targets on orders assigned to them or unassigned. Moving to a stage on a closed order clears `special_state` first. It reuses `_order_for_write`.
- `board_orders`, `get_tracking`, the deadline and comm logic stay. Remove any `on_hold` branches in the TS code and tests.
- Seeded-stage i18n gains `Unstarted` (hi: "शुरू नहीं हुआ"). `cancelled` is labelled "Rejected" / "अस्वीकृत".
- The tests (db, unit, e2e smoke and offline) are updated for: 5 stages, the new RPCs, no on_hold, and the new selectors. The smoke test still covers create → Ready → tracking link.

## Settled after the builder check

- **WhatsApp icon and dot:** keep v1's three messages. The icon sends the message for the order's current `comm_kind` (v1 view logic):
  - `ready` when the order is in Ready;
  - `date_changed` after a due-date change;
  - `created` otherwise, including Unstarted, Cutting, Stitching and Ironing.

  The dot shows when `communicated` is false for that kind, so it does not reappear on every stage move. Delivered and Rejected orders have no dot and no icon.
- **Karigars and closed orders:** a karigar can't change the status of a Delivered or Rejected order (`set_status` raises `order_closed` for them). Their search can find such orders, but the ticket opens read-only.
- **Event shapes stay the same:**
  - Stage moves by `set_status` write the v1 `stage` event (from/to stage ids), so the Ready ✓ logic works unchanged.
  - Delivered and Rejected write `special_state` events.
  - Reopening writes a `special_state` event (to null) plus a `stage` event.
  - An owner reopening an order straight into Ready counts as "setting Ready", so WhatsApp opens.
- **Migration data:**
  - No back-fill: existing orders keep their stage, and only new orders start in Unstarted.
  - Positions are shifted up by one, so the highest position is still Ready.
  - `on_hold` orders are resumed with a logged `special_state` event.
  - Every order gets `tracking_enabled = true`. `get_tracking` keeps honouring the column, which nothing now sets to false.
- **Total and Paid rules:**
  - Paid can be set with no Total, with no upper cap and never below 0.
  - Once Total is set, Paid can't exceed it, and Total can't be lowered below Paid (v1's `below_paid`).
  - The v1 `total` event already logs old and new values.
- **Auto-open timing:**
  - WhatsApp opens in the tap, before the save. If the save then fails, the error shows and the owner retries; a rare duplicate message is accepted.
  - No auto-open when the due date is unchanged, or when the order is Delivered or Rejected.
- **Delivered confirmation:** if money is still due, the confirm text says "₹X still due — mark delivered?". Otherwise it is the plain confirm.

## Left to the builder

- Exact component split (e.g. `StatusMenu`, `InlineField`, `Sheet`, `ListRow`); how the swipe columns are styled; transitions.
- The wording of each automatic payment note, and how history renders `set_status` events.

## Calls made by Claude (please check)

- Rejected is stored as `cancelled`, so the DB value isn't renamed.
- Delivered and Rejected aren't board columns; search finds them.
- The Move button disappears from cards; status changes happen only on the ticket.
- Karigars can't set Delivered or Rejected.
- The payment method picker is removed: edits record `other`, and the advance at Create records `cash`.
- The Board | List choice is remembered per device.
- Picking Delivered or Rejected asks for confirmation; other status changes don't.
