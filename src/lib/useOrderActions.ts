'use client'
import { useState, type MouseEvent } from 'react'
import { useSession } from '@/lib/session'
import { useT } from '@/lib/i18n'
import { paymentSummary } from '@/lib/money'
import { isPhone, openWhatsApp, whatsappLink, whatsappMessage } from '@/lib/whatsapp'
import { waData } from '@/lib/orderDetail'
import { currentStatus, readyStageId, statusEffects, statusMenuDisabled, statusOptions, statusParam, type StatusTarget } from '@/lib/status'
import { siteUrl } from '@/lib/site'
import type { Stage } from '@/lib/board'
import type { BoardOrder, CommKind } from '@/lib/types'

type Res = PromiseLike<{ error: { message: string } | null }>

// One place for the status-change and WhatsApp rules, shared by the ticket, board card and list row.
export function useOrderActions(o: BoardOrder | null, stages: Stage[], onChanged: () => unknown, opts?: { onNeedsRack?: () => void }) {
  const { supabase, member, shop } = useSession()
  const { t, lang } = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // The generated RPC types don't allow null args; the DB does.
  const rpc = (fn: string, args: Record<string, unknown>) =>
    (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Res)(fn, args)
  const waUrl = (kind: CommKind, due?: string) =>
    o?.customer_mobile ? whatsappLink(o.customer_mobile, whatsappMessage(kind, lang, waData(o, shop.name, siteUrl(), due))) : ''
  // Lazy builder: must be .then-ed or the request never fires.
  const recordSend = (kind: CommKind) => rpc('record_whatsapp_send', { p_order_id: o!.id, p_kind: kind })
    .then(({ error }) => { if (error) console.warn('record_whatsapp_send', error.message); return onChanged() })

  // Runs synchronously in the menu click so WhatsApp opens within the user gesture.
  function pick(target: StatusTarget) {
    if (!o || busy || statusParam(target) === statusParam(currentStatus(o))) return
    const fx = statusEffects(target, o, member.role, readyStageId(stages))
    if (fx.needsRack) { setErr('set_rack_first'); opts?.onNeedsRack?.(); return }
    const { balance } = paymentSummary(o.total_amount, o.paid_amount)
    if (fx.confirm && !window.confirm(fx.confirm === 'rejected' ? t('confirm.rejected')
      : balance ? t('confirm.delivered_due', { due: balance }) : t('confirm.delivered'))) return
    const wa = fx.openWhatsApp ? waUrl('ready') : ''
    const opened = wa ? openWhatsApp(wa) : false
    setBusy(true); setErr('')
    rpc('set_status', { p_order_id: o.id, p_target: statusParam(target) })
      // Record after the move: "communicated" compares the send time with the stage event.
      .then(({ error }) => { if (error) setErr(error.message); return opened && !error ? recordSend('ready') : onChanged() })
      .then(() => setBusy(false), () => setBusy(false))
  }

  // WhatsApp anchor click: same tab on phones (see openWhatsApp); never opens the card's ticket link.
  function sendWhatsApp(e: MouseEvent<HTMLAnchorElement>) {
    e.stopPropagation()
    if (!o?.comm_kind) return
    if (isPhone()) { e.preventDefault(); openWhatsApp(e.currentTarget.href, true) }
    recordSend(o.comm_kind)
  }

  return {
    pick, waUrl, recordSend, sendWhatsApp, busy, err, setErr,
    waHref: o?.comm_kind ? waUrl(o.comm_kind) : '',
    menuDisabled: !o || busy || statusMenuDisabled(member.role, o, member.id),
    options: statusOptions(stages, member.role),
  }
}
