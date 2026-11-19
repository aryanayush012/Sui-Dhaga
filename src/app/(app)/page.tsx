'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/session'
import { useT, stageLabel, type Key } from '@/lib/i18n'
import { todayIST } from '@/lib/deadline'
import { loadCache, matchesSearch, nextStage, saveCache, searchFilter, type Stage } from '@/lib/board'
import type { BoardOrder } from '@/lib/types'
import { OrderCard } from '@/components/OrderCard'
import { SearchBar } from '@/components/SearchBar'
import { StageTabs } from '@/components/StageTabs'

const HOLD = 'on_hold'
const KNOWN = ['forbidden', 'order_closed', 'not_found', 'not_member', 'invalid_input']

export default function BoardPage() {
  const { member, supabase } = useSession()
  const { t } = useT()
  const isOwner = member.role === 'owner'
  const [rows, setRows] = useState<BoardOrder[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [offline, setOffline] = useState(false)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<string | null>(null)
  const [mine, setMine] = useState(false)
  const [err, setErr] = useState('')
  const [rackFor, setRackFor] = useState<{ o: BoardOrder; stage: Stage } | null>(null)
  const [rackVal, setRackVal] = useState('')
  const [busy, setBusy] = useState(false)
  const qRef = useRef(q)
  qRef.current = q
  const reqId = useRef(0)
  const today = todayIST()

  const load = useCallback(async () => {
    const id = ++reqId.current
    const f = searchFilter(qRef.current, isOwner)
    let query = supabase.from('board_orders').select('*').or('special_state.is.null,special_state.eq.on_hold')
    if (f) query = f.op === 'eq' ? query.eq(f.col, f.value) : query.ilike(f.col, String(f.value))
    const [o, s] = await Promise.all([
      query.order('slip_no', { ascending: false }),
      supabase.from('stages').select('id,name,position').order('position'),
    ])
    if (id !== reqId.current) return // a newer load superseded this one
    if (o.error || s.error) {
      const c = loadCache(member.id)
      if (c) {
        setStages(c.stages)
        setRows(f ? c.rows.filter((r) => matchesSearch(r, f)) : c.rows)
      }
      setOffline(true)
    } else {
      const rs = (o.data ?? []) as unknown as BoardOrder[]
      setRows(rs); setStages(s.data); setOffline(false)
      if (!f) saveCache(member.id, { rows: rs, stages: s.data, savedAt: Date.now() })
    }
    setLoaded(true)
  }, [supabase, member.id, isOwner])

  // Debounce typing; the first load is immediate.
  useEffect(() => {
    const h = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(h)
  }, [q, load])

  useEffect(() => {
    let h: ReturnType<typeof setTimeout>
    const ch = supabase.channel('board-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events' },
        () => { clearTimeout(h); h = setTimeout(load, 300) })
      .subscribe()
    return () => { clearTimeout(h); supabase.removeChannel(ch) }
  }, [supabase, load])

  const searching = q.trim() !== ''
  const active = tab ?? stages[0]?.id ?? ''
  const base = mine ? rows.filter((r) => r.assignee_id === member.id) : rows
  const inTab = (r: BoardOrder, id: string) => (id === HOLD ? r.special_state === HOLD : r.special_state === null && r.stage_id === id)
  const tabs = [
    ...stages.map((s) => ({ id: s.id, label: stageLabel(s.name, t), count: base.filter((r) => inTab(r, s.id)).length })),
    { id: HOLD, label: t('board.hold'), count: base.filter((r) => inTab(r, HOLD)).length },
  ]
  const shown = searching ? base : base.filter((r) => inTab(r, active))

  const showErr = (m: string) => setErr(t(KNOWN.includes(m) ? (`error.${m}` as Key) : 'error.generic'))
  async function doMove(o: BoardOrder, stage: Stage, rack?: string) {
    setBusy(true); setErr('')
    if (rack !== undefined) {
      const r = await supabase.rpc('set_rack', { p_order_id: o.id, p_rack: rack })
      if (r.error) { setBusy(false); return showErr(r.error.message) }
    }
    const m = await supabase.rpc('move_order', { p_order_id: o.id, p_stage_id: stage.id })
    setBusy(false)
    if (m.error) return showErr(m.error.message)
    setRackFor(null); setRackVal('')
    load()
  }
  function onMove(o: BoardOrder) {
    const n = nextStage(stages, o)
    if (!n) return
    const intoLast = !nextStage(stages, { stage_position: n.position })
    if (intoLast && !o.rack?.trim()) { setRackFor({ o, stage: n }); setRackVal(''); return }
    doMove(o, n)
  }

  return (
    <main className="space-y-3">
      {offline && <p role="status" className="rounded-lg bg-amber-100 p-2 text-amber-900">{t('board.offline')}</p>}
      <SearchBar value={q} onChange={setQ} />
      {!isOwner && (
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="size-5" />
          {t('board.mine')}
        </label>
      )}
      {!searching && <StageTabs tabs={tabs} active={active} onChange={setTab} />}
      {err && !rackFor && <p role="alert" className="text-red-600">{err}</p>}
      {loaded && shown.length === 0 && <p className="text-muted">{t('board.empty')}</p>}
      <div className="space-y-3">
        {shown.map((o) => (
          <OrderCard key={o.id} o={o} today={today} onMove={() => onMove(o)}
            canMove={!offline && !busy && o.special_state === null && !!nextStage(stages, o)
              && (isOwner || o.assignee_id === null || o.assignee_id === member.id)} />
        ))}
      </div>
      {rackFor && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40" role="dialog" aria-modal="true">
          <form className="w-full space-y-3 rounded-t-2xl bg-white p-4 pb-8"
            onSubmit={(e) => { e.preventDefault(); if (rackVal.trim()) doMove(rackFor.o, rackFor.stage, rackVal.trim()) }}>
            <p className="font-bold">#{rackFor.o.slip_no} — {t('board.rack_prompt')}</p>
            <input autoFocus value={rackVal} onChange={(e) => setRackVal(e.target.value)} aria-label={t('board.rack')}
              className="min-h-11 w-full rounded-lg border border-line px-3" />
            {err && <p role="alert" className="text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setRackFor(null); setErr('') }} className="min-h-11 flex-1 rounded-lg border border-line">{t('board.cancel')}</button>
              <button type="submit" disabled={busy || !rackVal.trim()} className="min-h-11 flex-1 rounded-lg bg-accent font-bold text-white disabled:opacity-50">{t('board.rack_save')}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
