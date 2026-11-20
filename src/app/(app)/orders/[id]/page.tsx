'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT, type Key } from '@/lib/i18n'
import { en } from '@/lib/i18n/en'
import { errorKey } from '@/lib/ui'
import { paymentSummary } from '@/lib/money'
import { normalizeMobile } from '@/lib/mobile'
import { openWhatsApp } from '@/lib/whatsapp'
import { dueAutoOpen, parseAmount, parseTotal, type EventRow } from '@/lib/orderDetail'
import { currentStatus, statusLabelKey, targetTone, type StatusTarget } from '@/lib/status'
import type { Stage } from '@/lib/board'
import { uid } from '@/lib/uid'
import type { BoardOrder } from '@/lib/types'
import { useOrderActions } from '@/lib/useOrderActions'
import { StatusMenu } from '@/components/StatusMenu'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { InlineField } from '@/components/InlineField'
import { Garments, Measurements, type Garment } from './Garments'
import { History } from './History'

type Member = { id: string; name: string; is_active: boolean }
type Res = PromiseLike<{ error: { message: string } | null }>

export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const { supabase, member } = useSession()
  const { t } = useT()
  const isOwner = member.role === 'owner'
  const [o, setO] = useState<BoardOrder | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)
  const [garments, setGarments] = useState<Garment[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const sentRef = useRef(false) // due-date popup opened in the last save click
  const [rackEdit, setRackEdit] = useState(0) // bump to open the Rack field for editing
  const [tab, setTab] = useState<'m' | 'h'>('m')

  const load = useCallback(async () => {
    const [b, g, m, s, e, n] = await Promise.all([
      supabase.from('board_orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('garments').select('*').eq('order_id', id).order('id'),
      supabase.from('members').select('id,name,is_active'),
      supabase.from('stages').select('id,name,position').order('position'),
      // Owner only: employees never query events or notes.
      isOwner ? supabase.from('order_events').select('id,action,from_value,to_value,actor_id,created_at').eq('order_id', id).order('created_at', { ascending: false }) : null,
      isOwner ? supabase.from('orders').select('notes').eq('id', id).maybeSingle() : null,
    ])
    setO((b.data ?? null) as unknown as BoardOrder | null)
    setGarments((g.data ?? []) as unknown as Garment[])
    setMembers(m.data ?? [])
    setStages(s.data ?? [])
    setEvents((e?.data ?? []) as EventRow[])
    setNotes(n?.data?.notes ?? null)
    setLoaded(true)
  }, [supabase, id, isOwner])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    let h: ReturnType<typeof setTimeout>
    const refetch = () => { clearTimeout(h); h = setTimeout(load, 300) }
    const ch = supabase.channel(`order-${uid()}`) // unique per mount (StrictMode)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${id}` }, refetch)
      .subscribe()
    return () => { clearTimeout(h); supabase.removeChannel(ch) }
  }, [supabase, load, id])

  // The generated RPC types don't allow null args (unassign, clear total); the DB does.
  const rpc = (fn: string, args: Record<string, unknown>) =>
    (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Res)(fn, args)
  // For InlineField/Garments: error code or null; reloads on success.
  const call = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await rpc(fn, args)
    if (error) return error.message
    await load()
    return null
  }

  const act = useOrderActions(o, stages, load, { onNeedsRack: () => setRackEdit((n) => n + 1) })
  // Arriving from a card's "Ready" with no rack: open the Rack field with the hint.
  const params = useSearchParams()
  useEffect(() => {
    if (loaded && params.get('rack') === '1') { act.setErr('set_rack_first'); setRackEdit((n) => n + 1) }
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <main><p className="text-[#5E6C84]">{t('od.loading')}</p></main>
  if (!o) return <main><p role="alert" className="text-[#BF2600]">{t('error.not_found')}</p></main>

  const closed = o.special_state !== null
  const canAct = isOwner || o.assignee_id === null || o.assignee_id === member.id
  const { balance } = paymentSummary(o.total_amount, o.paid_amount)
  const label = (s: StatusTarget) => { const k = statusLabelKey(s, stages); return (t(k as Key) as string | undefined) ?? k }
  const info = (p: { name?: string; mobile?: string | null; notes?: string | null }) => call('update_order_info', {
    p_order_id: o.id, p_name: p.name ?? o.customer_name, p_mobile: p.mobile ?? o.customer_mobile, p_notes: p.notes === undefined ? notes : p.notes,
  })
  const ed = isOwner && !closed
  const wa = isOwner && o.comm_kind !== null && o.customer_mobile

  return (
    <main className="space-y-3 pb-6">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-[#5E6C84]">#{o.slip_no}</span>
        {wa && <WhatsAppButton href={act.waHref} sent={o.communicated} onClick={act.sendWhatsApp} />}
        <Link href="/" aria-label={t('od.close')} className="flex size-11 items-center justify-center rounded text-xl text-[#42526E] hover:bg-[#F4F5F7]">✕</Link>
      </div>
      <h1 className="text-lg font-bold text-[#172B4D]">{o.customer_name} · {o.garment_summary}</h1>
      <StatusMenu options={act.options} current={currentStatus(o)} labelOf={label} toneOf={(s) => targetTone(s, stages)}
        disabled={act.menuDisabled} onPick={act.pick} />
      {act.err && <p role="alert" className="text-sm text-[#BF2600]">{t(errorKey(act.err, en) as Key)}</p>}

      <div className="divide-y divide-[#EBECF0]">
        {isOwner && (
          <InlineField label={t('field.karigar')} input="select" editable={ed} value={o.assignee_id ?? ''} display={o.assignee_name ?? '—'}
            options={[{ value: '', label: '—' }, ...members.filter((m) => m.is_active || m.id === o.assignee_id).map((m) => ({ value: m.id, label: m.name }))]}
            onSave={(v) => call('assign_order', { p_order_id: o.id, p_member_id: v || null })} />
        )}
        <InlineField label={t('field.rack')} input="text" startEditing={rackEdit} editable={!closed && canAct} value={o.rack ?? ''}
          onSave={(v) => (v.trim() === (o.rack ?? '') ? Promise.resolve(null) : call('set_rack', { p_order_id: o.id, p_rack: v.trim() }))} />
        <InlineField label={t('field.due')} input="date" editable={ed} value={o.due_date}
          before={(v) => { const u = dueAutoOpen(o, v) ? act.waUrl('date_changed', v) : ''; sentRef.current = u ? openWhatsApp(u) : false }}
          onSave={async (v) => {
            if (!v || v === o.due_date) return v ? null : 'invalid_input'
            const code = await call('change_due_date', { p_order_id: o.id, p_due: v })
            if (!code && sentRef.current) await act.recordSend('date_changed') // after the due_date event, so it counts
            return code
          }} />
        {isOwner && (
          <>
            <InlineField label={t('field.mobile')} input="tel" editable={ed} value={o.customer_mobile ?? ''} link={o.customer_mobile ? `tel:${o.customer_mobile}` : undefined}
              onSave={(v) => { const m = normalizeMobile(v); return m ? info({ mobile: m }) : Promise.resolve('invalid_mobile') }} />
            <InlineField label={t('field.name')} input="text" editable={ed} value={o.customer_name} onSave={(v) => info({ name: v.trim() })} />
            <InlineField label={t('field.notes')} input="text" editable={ed} value={notes ?? ''} onSave={(v) => info({ notes: v.trim() || null })} />
            <InlineField label={t('field.total')} input="number" editable value={o.total_amount?.toString() ?? ''}
              display={o.total_amount === null ? '—' : `₹${o.total_amount}`}
              onSave={(v) => {
                if (!v.trim()) return call('set_total', { p_order_id: o.id, p_total: null })
                const r = parseTotal(v); return r.ok ? call('set_total', { p_order_id: o.id, p_total: r.value }) : Promise.resolve(r.error)
              }} />
            <InlineField label={t('field.paid')} input="number" editable value={String(o.paid_amount)}
              display={`₹${o.paid_amount}${balance !== null ? ` · ${t('board.balance_due', { n: balance })}` : ''}`}
              onSave={(v) => { const r = parseAmount(v); return r.ok ? call('set_paid', { p_order_id: o.id, p_paid: r.value }) : Promise.resolve(r.error) }} />
          </>
        )}
      </div>

      <Garments orderId={o.id} garments={garments} editable={ed} call={isOwner ? call : undefined} />

      {isOwner ? (
        <section>
          <div role="tablist" className="flex border-b border-[#DFE1E6]">
            {(['m', 'h'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`min-h-11 flex-1 text-sm font-semibold ${tab === k ? 'border-b-2 border-[#0052CC] text-[#0052CC]' : 'text-[#5E6C84]'}`}>
                {t(k === 'm' ? 'tab.measurements' : 'tab.history')}
              </button>
            ))}
          </div>
          <div className="pt-3">{tab === 'm' ? <Measurements garments={garments} /> : <History events={events} stages={stages} members={members} />}</div>
        </section>
      ) : (
        <section>
          <h2 className="mb-2 text-[11px] font-bold uppercase text-[#5E6C84]">{t('tab.measurements')}</h2>
          <Measurements garments={garments} />
        </section>
      )}
    </main>
  )
}
