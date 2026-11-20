# Act-from-the-card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the status dropdown, WhatsApp icon with a sent-✓, rack, and money due on every board card and list row, so the owner and karigars can act without opening the ticket.

**Architecture:** The ticket's status-change and WhatsApp logic moves into one shared hook, `useOrderActions`. The ticket, `OrderCard` and `ListRow` all use it, so the rules (confirm, rack-before-Ready, WhatsApp inside the tap, record after the move, karigar limits) live in one place. The card is restructured so its controls aren't nested inside the `<Link>`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4, Supabase, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-card-actions-design.md`

## Global Constraints
- Run Vitest from PowerShell only (`Set-Location C:\Sui-Dhaga`). Never print `.env.local`.
- WhatsApp opens **inside the tap** via `openWhatsApp` (`src/lib/whatsapp.ts`): same tab on phones, a new tab on laptops.
- `supabase.rpc(...)` must always be awaited or `.then`-ed.
- Record the send only if `openWhatsApp` returned true, and only after the status save succeeds.
- Owner-only on cards: the WhatsApp icon and money due. Karigars: stages only, on their own or unassigned orders, never on closed orders.
- Hindi + English; touch targets ≥ 44 px; works at 360 px.
- No interactive element inside an `<a>`. Tapping a control must not open the ticket.
- Commits end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Owner picks Ready on a card on an Android phone:** WhatsApp opens (same tab) and the card's ✓ appears after the board refreshes. → Task 2, the phone e2e test.
2. **Card Ready with an empty rack:** the order doesn't move, and the ticket opens with the Rack field in edit mode. → Task 1 unit test, Task 2 e2e.
3. **Tapping the status dropdown or WhatsApp icon on a card:** the ticket does NOT open. → Task 2 e2e.
4. **Karigar sees a card assigned to someone else:** the dropdown is disabled; no WhatsApp, no money. → Task 2 (visual check, listed for the user).

---

### Task 1: Shared `useOrderActions` hook; the ticket uses it; `?rack=1`

**Files:**
- Create: `src/lib/useOrderActions.ts`
- Modify: `src/app/(app)/orders/[id]/page.tsx` (replace its local `waUrl`, `recordSend` and `pick` with the hook; read `?rack=1` to bump `rackEdit` and set `err='set_rack_first'`)
- Test: `src/lib/status.test.ts` (any new pure helper)

**Interfaces:**
- `useOrderActions(o: BoardOrder | null, stages: Stage[], onChanged: () => void, opts?: { onNeedsRack?: () => void })` returns:
  - `{ pick(t: StatusTarget): void; waHref: string; sendWhatsApp(e: React.MouseEvent<HTMLAnchorElement>): void; busy: boolean; err: string; setErr: (s: string) => void; canAct: boolean; options: StatusTarget[] }`
- `pick` keeps the current ticket behaviour exactly:
  - no-op when the target is unchanged;
  - `statusEffects`, and if `needsRack`, call `opts.onNeedsRack?.()` (falling back to setting the `set_rack_first` error) and return;
  - the confirm;
  - `openWhatsApp(waUrl('ready'))` synchronously;
  - `set_status`, then `record_whatsapp_send('ready')` only if WhatsApp opened and there was no error;
  - then `onChanged()`.
- `waHref` is the wa.me URL for the current `comm_kind` (an empty string when there's no mobile or no `comm_kind`).
- `sendWhatsApp` handles the anchor click. On phones it calls `preventDefault` and then `openWhatsApp(href, true)`. It then records `comm_kind` and calls `onChanged()`. It also calls `e.stopPropagation()`.
- The ticket keeps its due-date `before`/`sentRef` path, using `waHref`-style building through the hook's `waUrl(kind, due?)` (also returned).

- [ ] Step 1: Write a unit test for any pure piece you extract, e.g. `cardStatusOptions(role, o, memberId)` deciding the disabled state. It must cover: owner → enabled; karigar on own or unassigned order → enabled; karigar on someone else's order → disabled; karigar on a closed order → disabled. Run it and see it fail.
- [ ] Step 2: Implement the hook and switch the ticket to it. Behaviour must stay the same.
- [ ] Step 3: Run `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] Step 4: Commit `refactor: share status and WhatsApp actions in useOrderActions`.

### Task 2: Card and list row UI + e2e

**Files:**
- Modify: `src/components/OrderCard.tsx`, `src/components/ListRow.tsx`, `src/components/BoardColumns.tsx`, `src/app/(app)/page.tsx` (pass `stages`, the member and `load` down), `src/lib/i18n/en.ts`, `src/lib/i18n/hi.ts`
- Test: `tests/e2e/phone-whatsapp.spec.ts` (extend), `tests/e2e/smoke.spec.ts` (adjust selectors only if needed)

**Interfaces:**
- Consumes: `useOrderActions` (Task 1), `StatusMenu`, `Lozenge`, `Avatar`, `DeadlineChip`, `paymentSummary`, `statusLabelKey`, `targetTone`.
- Layout, per the spec sketch:
  - **Top row:** a `<Link>` containing `name · garments`, then the WhatsApp `<a>` (owner, `comm_kind !== null`, icon plus ✓ when `communicated`, `aria-label` "Send on WhatsApp" / "Sent on WhatsApp", ≥ 44 px), then the `Avatar`.
  - **Second row** (inside the same Link or a second Link): `#slip · Rack B3` (amber "No rack" when empty) `· due chip`.
  - **Third row:** the `StatusMenu`, disabled per `canAct`/closed, and `₹X due` (owner, balance > 0).
- Ready with an empty rack from a card: `router.push('/orders/<id>?rack=1')`.
- `onChanged` = the board's `load`.
- Remove the green-dot rendering and `board.wa_pending` if it's unused. Add i18n keys: `card.no_rack`, `card.due` (`₹{n} due` / `₹{n} बाकी`), `order.whatsapp_sent`.
- The list row gets the same three pieces in a compact layout.

- [ ] Step 1: Extend `phone-whatsapp.spec.ts` (Pixel 7):
  1. Create an order with rack A1.
  2. On the board card: the status dropdown shows Unstarted.
  3. Pick Ready from the card's dropdown. Assert no new page opens, the URL is still `/`, and the card later shows the "Sent on WhatsApp" ✓ (icon `aria-label`).
  4. Create a second order with no rack. Pick Ready from its card and assert the URL becomes `/orders/<id>?rack=1` and the Rack input is in edit mode.
  5. Tapping the card's WhatsApp icon keeps the URL at `/`.
- [ ] Step 2: Implement the UI.
- [ ] Step 3: Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run e2e` (all 3 specs). Port 3000 must be free; if the user's server is running, report it.
- [ ] Step 4: Manual checks for the user:
  - 360 px card fits on one screen width;
  - karigar card dropdown disabled on others' orders;
  - no money shown to karigars.
- [ ] Step 5: Commit `feat(ui): status, rack, money due and WhatsApp on cards`.
