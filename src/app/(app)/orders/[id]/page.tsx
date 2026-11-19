'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT, stageLabel, type Key } from '@/lib/i18n'
import { todayIST, deadlineChip } from '@/lib/deadline'
import { paymentSummary } from '@/lib/money'
import { normalizeMobile } from '@/lib/mobile'
import { whatsappLink, whatsappMessage } from '@/lib/whatsapp'
import { eventText, parsePayment, parseTotal, type EventRow } from '@/lib/orderDetail'
import type { Stage } from '@/lib/board'
import type { BoardOrder, CommKind, GarmentInput, PaymentMethod } from '@/lib/types'
import { DeadlineChip } from '@/components/DeadlineChip'
import { GarmentForm } from '@/components/GarmentForm'

type Garment = GarmentInput & { id: string }
type Payment = { id: string; amount: number; method: PaymentMethod; note: string | null; created_at: string; recorded_by: string }
type Member = { id: string; name: string; is_active: boolean }
type Sheet = 'info' | 'garment' | 'payment' | 'total' | 'date' | 'dateOffer' | null
type Res = PromiseLike<{ error: { message: string } | null }>

const KNOWN = ['not_member', 'not_owner', 'forbidden', 'invalid_mobile', 'invalid_input', 'exceeds_total', 'below_paid',
  'negative_balance', 'note_required', 'not_found', 'order_closed']
const input = 'min-h-12 w-full rounded-lg border border-line bg-white px-3 text-lg'
const btn = 'flex min-h-12 items-center justify-center rounded-lg border border-line bg-white px-4 text-lg disabled:opacity-50'
const primary = 'flex min-h-12 items-center justify-center rounded-lg bg-accent px-4 text-lg text-white disabled:opacity-50'
const sec = 'space-y-2 rounded-xl border border-line bg-white p-3'
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

function SheetBox({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useT()
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full space-y-3 overflow-y-auto rounded-t-2xl bg-white p-4 pb-8">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">{title}</p>
          <button type="button" onClick={onClose} className="min-h-12 px-3 text-muted underline">{t('od.close')}</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Thumb({ path, label }: { path: string; label: string }) {
  const { supabase } = useSession()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    supabase.storage.from('photos').createSignedUrl(path, 3600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null) })
    return () => { live = false }
  }, [path, supabase])
  if (!url) return <div className="size-20 rounded-lg bg-gray-100" />
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="size-20 rounded-lg object-cover" />
    </a>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { supabase, member, shop } = useSession()
  const { t, lang } = useT()
  const isOwner = member.role === 'owner'

  const [o, setO] = useState<BoardOrder | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)
  const [garments, setGarments] = useState<Garment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [msg, setMsg] = useState('')
  const [rack, setRack] = useState('')
  const [dueNew, setDueNew] = useState('')
  const [dateOffer, setDateOffer] = useState<string | null>(null)
  const [info, setInfo] = useState({ name: '', mobile: '', notes: '' })
  const [payAmt, setPayAmt] = useState('')
  const [payNeg, setPayNeg] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [payNote, setPayNote] = useState('')
  const [totalIn, setTotalIn] = useState('')
  const [editG, setEditG] = useState<GarmentInput | null>(null)
  const [gBusy, setGBusy] = useState(false)

  const load = useCallback(async () => {
    const [b, g, e, m, s, n, p] = await Promise.all([
      supabase.from('board_orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('garments').select('*').eq('order_id', id).order('id'),
      supabase.from('order_events').select('id,action,from_value,to_value,actor_id,created_at').eq('order_id', id).order('created_at', { ascending: false }),
      supabase.from('members').select('id,name,is_active'),
      supabase.from('stages').select('id,name,position').order('position'),
      // Owner only: RLS returns nothing for employees, so don't ask.
      isOwner ? supabase.from('orders').select('notes').eq('id', id).maybeSingle() : Promise.resolve(null),
      isOwner ? supabase.from('payments').select('id,amount,method,note,created_at,recorded_by').eq('order_id', id).order('created_at') : Promise.resolve(null),
    ])
    setO((b.data ?? null) as unknown as BoardOrder | null)
    setGarments((g.data ?? []) as unknown as Garment[])
    setEvents((e.data ?? []) as EventRow[])
    setMembers(m.data ?? [])
    setStages(s.data ?? [])
    setNotes(n?.data?.notes ?? null)
    setPayments((p?.data ?? []) as Payment[])
    setLoaded(true)
  }, [supabase, id, isOwner])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    let h: ReturnType<typeof setTimeout>
    const refetch = () => { clearTimeout(h); h = setTimeout(load, 300) }
    // Unique name per mount (same reason as the board).
    const ch = supabase.channel(`order-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${id}` }, refetch)
      .subscribe()
    return () => { clearTimeout(h); supabase.removeChannel(ch) }
  }, [supabase, load, id])
  const serverRack = o?.rack ?? ''
  useEffect(() => { setRack(serverRack) }, [serverRack])

  const showErr = (m: string) => setErr(t(KNOWN.includes(m) ? (`error.${m}` as Key) : 'error.generic'))
  // One RPC at a time; reloads on success.
  async function run(p: Res): Promise<boolean> {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await p
    if (error) { setBusy(false); showErr(error.message); return false }
    await load()
    setBusy(false)
    return true
  }
  // The generated RPC types don't allow null args (e.g. unassign / resume); the DB does.
  const rpc = (fn: string, args: Record<string, unknown>) =>
    (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Res)(fn, args)

  if (!loaded) return <main><p className="text-muted">{t('od.loading')}</p></main>
  if (!o) return <main><p role="alert" className="text-red-600">{t('error.not_found')}</p></main>

  const stageName = (sid: string | null) => { const s = stages.find((x) => x.id === sid); return s ? stageLabel(s.name, t) : '—' }
  const memberName = (mid: string | null) => members.find((x) => x.id === mid)?.name ?? t('order.nobody')
  const closed = o.special_state === 'cancelled' || o.special_state === 'delivered'
  // Same rule as the board: owner always; employee only if assigned to them or unassigned.
  const canAct = isOwner || o.assignee_id === null || o.assignee_id === member.id
  const { status, balance } = paymentSummary(o.total_amount, o.paid_amount)
  const next = stages.find((s) => s.position > o.stage_position) ?? null
  const lastPos = Math.max(...stages.map((s) => s.position))
  const trackingUrl = o.tracking_token ? `${siteUrl()}/t/${o.tracking_token}` : ''

  async function moveTo(s: Stage) {
    if (!o) return
    const r = rack.trim()
    if (s.position === lastPos && !o.rack?.trim() && !r) return setErr(t('od.rack_needed'))
    if (r && r !== (o.rack ?? '') && !(await run(rpc('set_rack', { p_order_id: o.id, p_rack: r })))) return
    await run(rpc('move_order', { p_order_id: o.id, p_stage_id: s.id }))
  }

  const waText = (kind: CommKind, due = o.due_date) => whatsappMessage(kind, lang, {
    shopName: shop.name, slipNo: o.slip_no, customerName: o.customer_name, garmentSummary: o.garment_summary,
    dueDate: due, balance, trackingUrl,
  })
  // Plain link so WhatsApp opens inside the tap; the send is logged fire-and-forget.
  const waLink = (kind: CommKind, label: string, due?: string) => o.customer_mobile && o.tracking_token && (
    <a href={whatsappLink(o.customer_mobile, waText(kind, due))} target="_blank" rel="noopener noreferrer"
      onClick={() => { void rpc('record_whatsapp_send', { p_order_id: o.id, p_kind: kind }) }}
      className={primary}>
      {label}{o.communicated && o.comm_kind === kind ? ' ✓' : ''}
    </a>
  )

  async function saveDate() {
    if (!o || !dueNew) return
    if (await run(rpc('change_due_date', { p_order_id: o.id, p_due: dueNew }))) { setDateOffer(dueNew); setSheet('dateOffer') }
  }
  async function saveInfo() {
    if (!o) return
    const m = normalizeMobile(info.mobile)
    if (!m) return setErr(t('error.invalid_mobile'))
    if (await run(rpc('update_order_info', { p_order_id: o.id, p_name: info.name.trim(), p_mobile: m, p_notes: info.notes.trim() || null }))) setSheet(null)
  }
  async function savePayment() {
    if (!o) return
    const r = parsePayment(payAmt, payNeg, payNote)
    if (!r.ok) return setErr(t(`error.${r.error}` as Key))
    if (await run(rpc('add_payment', { p_order_id: o.id, p_amount: r.value.amount, p_method: payMethod, p_note: r.value.note }))) {
      setSheet(null); setPayAmt(''); setPayNote(''); setPayNeg(false)
    }
  }
  async function saveTotal() {
    if (!o) return
    const r = parseTotal(totalIn)
    if (!r.ok) return setErr(t('error.invalid_input'))
    if (await run(rpc('set_total', { p_order_id: o.id, p_total: r.value }))) setSheet(null)
  }
  async function saveGarment() {
    if (!o || !editG) return
    const p = { ...editG, measurements: Object.fromEntries(Object.entries(editG.measurements ?? {}).filter(([, v]) => v.trim() !== '')) }
    if (await run(rpc('save_garment', { p_order_id: o.id, p }))) { setSheet(null); setEditG(null) }
  }
  async function deleteGarment() {
    if (!editG?.id || !window.confirm(t('od.confirm_delete'))) return
    if (await run(rpc('delete_garment', { p_garment_id: editG.id }))) { setSheet(null); setEditG(null) }
  }
  async function setState(s: 'on_hold' | 'cancelled' | 'delivered' | null) {
    if (!o) return
    if (s === 'cancelled' && !window.confirm(t('od.confirm_cancel'))) return
    if (s === 'delivered' && !window.confirm(t('od.confirm_deliver'))) return
    if ((await run(rpc('set_special_state', { p_order_id: o.id, p_state: s }))) && s === 'delivered') router.push('/')
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(trackingUrl); setMsg(t('od.copied')) } catch { setMsg(trackingUrl) }
  }
  const visibleEvents = isOwner ? events : events.filter((e) => e.action !== 'payment' && e.action !== 'total')
  const measures = (g: Garment) => Object.entries(g.measurements ?? {}).filter(([, v]) => v)

  return (
    <main className="space-y-3 pb-6">
      <div className={sec}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-3xl font-bold">#{o.slip_no}</span>
            <span className="ml-2 font-semibold">{o.customer_name}</span>
          </div>
          <div className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xl font-bold text-white" aria-label={t('board.rack')}>{o.rack || '—'}</div>
        </div>
        {isOwner && o.customer_mobile && (
          <a href={`tel:${o.customer_mobile}`} className="flex min-h-12 items-center text-lg text-accent underline">{t('od.call')}: {o.customer_mobile}</a>
        )}
        <p className="text-muted">{o.garment_summary}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span>{t('board.due', { date: o.due_date })}</span>
          <DeadlineChip kind={deadlineChip(o, todayIST())} />
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-semibold">
            {o.special_state ? t(`od.state_${o.special_state}` as Key) : stageLabel(o.stage_name, t)}
          </span>
          {o.assignee_name && <span className="text-muted">{o.assignee_name}</span>}
        </div>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 text-base">
            <span className="font-semibold">{o.total_amount === null ? t('board.paid_only', { n: o.paid_amount }) : t('board.balance_due', { n: balance ?? 0 })}</span>
            {status && <span className="text-muted">{t(status === 'paid' ? 'od.paid_full' : status === 'partial' ? 'od.partial' : 'od.unpaid')}</span>}
          </div>
        )}
        {isOwner && notes && <p className="whitespace-pre-wrap border-t border-line pt-2"><span className="text-sm text-muted">{t('od.notes')}: </span>{notes}</p>}
      </div>

      {err && !sheet && <p role="alert" className="text-red-600">{err}</p>}
      {msg && <p role="status" className="text-accent">{msg}</p>}

      <div className={sec}>
        <h2 className="font-semibold">{t('order.garments')}</h2>
        {garments.map((g) => (
          <div key={g.id} className="space-y-1 border-t border-line pt-2 first:border-0 first:pt-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{g.qty} × {t(`garment.${g.type}` as Key)}</span>
              {isOwner && !closed && (
                <button className="min-h-12 px-3 text-accent underline" onClick={() => { setEditG({ ...g, measurements: g.measurements ?? {} }); setErr(''); setSheet('garment') }}>{t('od.edit')}</button>
              )}
            </div>
            <div className="flex gap-2">
              {g.cloth_photo_path && <Thumb path={g.cloth_photo_path} label={t('garment.cloth')} />}
              {g.measurement_photo_path && <Thumb path={g.measurement_photo_path} label={t('garment.slip_label')} />}
            </div>
            {measures(g).length > 0 && <p className="text-sm">{measures(g).map(([k, v]) => `${t(`field.${k}` as Key)} ${v}`).join(' · ')}</p>}
            {g.instructions && <p className="text-sm text-muted">{g.instructions}</p>}
          </div>
        ))}
        {isOwner && !closed && (
          <button className={`${btn} w-full`} onClick={() => { setEditG({ type: 'pant', qty: 1, measurements: {} }); setErr(''); setSheet('garment') }}>{t('order.add_garment')}</button>
        )}
      </div>

      {canAct && o.special_state === null && (
        <div className={sec}>
          <h2 className="font-semibold">{t('od.stage')}</h2>
          <div className="flex gap-2">
            <input className={input} aria-label={t('board.rack')} placeholder={t('order.rack')} value={rack} onChange={(e) => setRack(e.target.value)} />
            <button className={btn} disabled={busy || !rack.trim() || rack.trim() === (o.rack ?? '')}
              onClick={() => run(rpc('set_rack', { p_order_id: o.id, p_rack: rack.trim() }))}>{t('od.rack_set')}</button>
          </div>
          {isOwner ? (
            <select className={input} aria-label={t('od.move_to')} value={o.stage_id} disabled={busy}
              onChange={(e) => { const s = stages.find((x) => x.id === e.target.value); if (s && s.id !== o.stage_id) moveTo(s) }}>
              {stages.map((s) => <option key={s.id} value={s.id}>{stageLabel(s.name, t)}</option>)}
            </select>
          ) : next && (
            <button className={`${primary} w-full`} disabled={busy} onClick={() => moveTo(next)}>{t('od.next', { stage: stageLabel(next.name, t) })}</button>
          )}
        </div>
      )}

      {isOwner && (
        <div className={sec}>
          <h2 className="font-semibold">{t('od.payments')}</h2>
          <p>{t('od.total')}: {o.total_amount === null ? '—' : `₹${o.total_amount}`} · {t('od.paid')}: ₹{o.paid_amount}{balance !== null ? ` · ${t('od.balance')}: ₹${balance}` : ''}</p>
          {payments.length === 0 && <p className="text-muted">{t('od.empty_payments')}</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between gap-2 border-t border-line pt-1 text-sm">
              <span>{new Date(p.created_at).toLocaleDateString()} · {t(`pay.${p.method}` as Key)}{p.note ? ` · ${p.note}` : ''}<span className="text-muted"> · {memberName(p.recorded_by)}</span></span>
              <span className={`font-semibold ${p.amount < 0 ? 'text-red-600' : ''}`}>{p.amount < 0 ? `-₹${-p.amount}` : `₹${p.amount}`}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <button className={`${btn} flex-1`} onClick={() => { setErr(''); setSheet('payment') }}>{t('od.add_payment')}</button>
            <button className={`${btn} flex-1`} onClick={() => { setTotalIn(o.total_amount?.toString() ?? ''); setErr(''); setSheet('total') }}>{t('od.set_total')}</button>
          </div>
        </div>
      )}

      {isOwner && (
        <div className={`${sec} flex flex-col`}>
          {!closed && (
            <>
              <label className="flex flex-col text-sm text-muted">{t('order.assignee')}
                <select className={`${input} text-black`} value={o.assignee_id ?? ''} disabled={busy}
                  onChange={(e) => run(rpc('assign_order', { p_order_id: o.id, p_member_id: e.target.value || null }))}>
                  <option value="">{t('order.nobody')}</option>
                  {members.filter((m) => m.is_active || m.id === o.assignee_id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <button className={btn} onClick={() => { setDueNew(o.due_date); setErr(''); setSheet('date') }}>{t('od.change_date')}</button>
              <button className={btn} onClick={() => {
                setInfo({ name: o.customer_name, mobile: o.customer_mobile ?? '', notes: notes ?? '' }); setErr(''); setSheet('info')
              }}>{t('od.edit_info')}</button>
            </>
          )}
          {o.comm_kind && waLink(o.comm_kind, `${t('order.whatsapp')} (${t(`wa.${o.comm_kind}` as Key)})`)}
          <div className="flex gap-2">
            <button className={`${btn} flex-1`} disabled={!trackingUrl} onClick={copyLink}>{t('od.copy_link')}</button>
            <label className="flex min-h-12 items-center gap-2">
              <input type="checkbox" className="size-6" checked={o.tracking_enabled} disabled={busy}
                onChange={(e) => run(rpc('set_tracking_enabled', { p_order_id: o.id, p_enabled: e.target.checked }))} />
              {t('od.tracking')}
            </label>
          </div>
          {!closed && (
            <div className="flex flex-wrap gap-2">
              {o.special_state === 'on_hold'
                ? <button className={`${btn} flex-1`} disabled={busy} onClick={() => setState(null)}>{t('od.resume')}</button>
                : <button className={`${btn} flex-1`} disabled={busy} onClick={() => setState('on_hold')}>{t('od.hold')}</button>}
              <button className={`${btn} flex-1 text-red-600`} disabled={busy} onClick={() => setState('cancelled')}>{t('od.cancel_order')}</button>
              <button className={`${primary} w-full`} disabled={busy} onClick={() => setState('delivered')}>{t('od.deliver')}</button>
            </div>
          )}
        </div>
      )}

      <div className={sec}>
        <h2 className="font-semibold">{t('od.activity')}</h2>
        {visibleEvents.map((e) => (
          <div key={e.id} className="border-t border-line pt-1 text-sm">
            <p>{eventText(e, { t, stage: stageName, member: memberName })}</p>
            <p className="text-muted">{memberName(e.actor_id)} · {new Date(e.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {sheet === 'date' && (
        <SheetBox title={t('od.change_date')} onClose={() => setSheet(null)}>
          <input type="date" className={input} value={dueNew} onChange={(e) => setDueNew(e.target.value)} />
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <button className={`${primary} w-full`} disabled={busy || !dueNew || dueNew === o.due_date} onClick={saveDate}>{t('od.save')}</button>
        </SheetBox>
      )}
      {sheet === 'dateOffer' && dateOffer && (
        <SheetBox title={t('od.date_saved')} onClose={() => setSheet(null)}>
          {waLink('date_changed', t('order.whatsapp'), dateOffer)}
        </SheetBox>
      )}
      {sheet === 'info' && (
        <SheetBox title={t('od.edit_info')} onClose={() => setSheet(null)}>
          <input className={input} aria-label={t('order.name')} value={info.name} onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))} />
          <input className={input} type="tel" inputMode="numeric" aria-label={t('order.mobile')} value={info.mobile} onChange={(e) => setInfo((p) => ({ ...p, mobile: e.target.value }))} />
          <textarea className="w-full rounded-lg border border-line p-3 text-lg" rows={3} aria-label={t('order.notes')} value={info.notes} onChange={(e) => setInfo((p) => ({ ...p, notes: e.target.value }))} />
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <button className={`${primary} w-full`} disabled={busy || !info.name.trim()} onClick={saveInfo}>{t('od.save')}</button>
        </SheetBox>
      )}
      {sheet === 'payment' && (
        <SheetBox title={t('od.add_payment')} onClose={() => setSheet(null)}>
          <input className={input} inputMode="numeric" placeholder={t('od.amount')} aria-label={t('od.amount')} value={payAmt} onChange={(e) => setPayAmt(e.target.value.replace(/\D/g, ''))} />
          <select className={input} aria-label={t('od.method')} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
            {(['cash', 'upi', 'other'] as const).map((m) => <option key={m} value={m}>{t(`pay.${m}` as Key)}</option>)}
          </select>
          <label className="flex min-h-12 items-center gap-2"><input type="checkbox" className="size-6" checked={payNeg} onChange={(e) => setPayNeg(e.target.checked)} />{t('od.refund')}</label>
          <input className={input} placeholder={t('od.note')} aria-label={t('od.note')} value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <button className={`${primary} w-full`} disabled={busy} onClick={savePayment}>{t('od.save')}</button>
        </SheetBox>
      )}
      {sheet === 'total' && (
        <SheetBox title={t('od.set_total')} onClose={() => setSheet(null)}>
          <input className={input} inputMode="numeric" aria-label={t('od.total')} value={totalIn} onChange={(e) => setTotalIn(e.target.value.replace(/\D/g, ''))} />
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <button className={`${primary} w-full`} disabled={busy} onClick={saveTotal}>{t('od.save')}</button>
        </SheetBox>
      )}
      {sheet === 'garment' && editG && (
        <SheetBox title={t('order.garments')} onClose={() => { setSheet(null); setEditG(null) }}>
          <GarmentForm value={editG} onBusy={setGBusy} onChange={(p) => setEditG((prev) => (prev ? { ...prev, ...p } : prev))} />
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <button className={`${primary} w-full`} disabled={busy || gBusy} onClick={saveGarment}>{gBusy ? t('photo.uploading') : t('od.save')}</button>
          {editG.id && garments.length > 1 && <button className={`${btn} w-full text-red-600`} disabled={busy} onClick={deleteGarment}>{t('od.delete')}</button>}
        </SheetBox>
      )}
    </main>
  )
}
