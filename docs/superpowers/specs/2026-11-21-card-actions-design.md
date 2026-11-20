# Sui-Dhaga — Act from the card (short design)

Date: 2026-11-21 · Builds on `2026-11-20-jira-ui-design.md`

## Why
The owner and karigars want to see the status, rack, money due and WhatsApp state, and change the status, **without opening the ticket**.

## What changes (board card and list row)
```
┌──────────────────────────────────┐
│ Ramesh · 2 pant        (✆)✓  (S) │  ← WhatsApp up top; ✓ = already messaged
│ #142 · Rack B3 · 22 Nov          │
│ [CUTTING ▾]           ₹500 due   │
└──────────────────────────────────┘
```
- **Top row:** `name · garments`, then the WhatsApp icon and the karigar avatar.
  - The icon is owner-only and shows whenever `comm_kind !== null`. A ✓ appears when `communicated` is true.
  - Tapping the icon always opens WhatsApp for the current `comm_kind` and records the send, the same as the ticket icon. It uses `openWhatsApp`: same tab on phones, a new tab on laptops.
  - This replaces the green dot.
- **Second row:** `#slip`, then **Rack B3** (or an amber **No rack**), then the due-date chip (v1 rules).
- **Third row:** the **status dropdown** (`StatusMenu`), the same as on the ticket. On the right, **₹X due** for the owner only, shown when balance > 0.
- Tapping anywhere else on the card or row opens the ticket.

## Status changes from the card
These use the same rules as the ticket's `pick()`:
- The confirm for Delivered or Rejected (with "₹X still due").
- An owner choosing Ready opens WhatsApp inside the tap; the send is recorded after the move, only if WhatsApp opened.
- Karigars get stages only, and only on their own or unassigned orders, never on closed orders.
- **Ready with an empty rack:** don't move the order. Go to `/orders/<id>?rack=1`, where the ticket opens the Rack field for editing and shows "Set the rack first".

## Approaches
| | Decision |
|---|---|
| Status dropdown on the card | **Chosen**: one control for every status, the same rules as the ticket, fewer accidental taps |
| ← → arrows on the card | Rejected: one step at a time, can't reach Delivered or Rejected, two more tap targets |

## Technical notes
- Extract the ticket's status-change and WhatsApp logic into one shared client hook so the ticket, card and list row can't drift apart.
- Interactive controls must not be nested inside the card's `<Link>` (invalid HTML). Restructure the card so the link covers the text area and the controls sit beside it.
- Tapping a control must not open the ticket.

## Calls made by Claude
- The dropdown, rather than arrows (the user approved the sketch).
- Ready with no rack on the card sends you to the ticket with the Rack field open.
- Money due on the card is owner-only and hidden when it's ₹0.
