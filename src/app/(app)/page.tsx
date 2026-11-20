'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT } from '@/lib/i18n'
import { todayIST } from '@/lib/deadline'
import { applyBoardFilter, loadCache, matchesSearch, saveCache, searchFilter, type Stage } from '@/lib/board'
import { uid } from '@/lib/uid'
import type { BoardOrder } from '@/lib/types'
import { parseCreated, readView, sortByDue, writeView, type View } from '@/lib/home'
import { BoardColumns } from '@/components/BoardColumns'
import { ListRow } from '@/components/ListRow'

export default function BoardPage() {
  return <Suspense><Home /></Suspense> // useSearchParams needs a boundary for static prerender
}

function Home() {
  const { member, shop, supabase } = useSession()
  const router = useRouter()
  const created = parseCreated(useSearchParams())
  const { t } = useT()
  const isOwner = member.role === 'owner'
  const [rows, setRows] = useState<BoardOrder[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [offline, setOffline] = useState(false)
  const [q, setQ] = useState('')
  const [view, setView] = useState<View>('board')
  const [mine, setMine] = useState(false)
  const qRef = useRef(q)
  qRef.current = q
  const reqId = useRef(0)
  const today = todayIST()
  useEffect(() => setView(readView()), []) // after mount: SSR renders the default
  const pick = (v: View) => { setView(v); writeView(v) }

  const load = useCallback(async () => {
    const id = ++reqId.current
    const f = searchFilter(qRef.current, isOwner)
    const query = applyBoardFilter(supabase.from('board_orders').select('*'), f)
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
    const refetch = () => { clearTimeout(h); h = setTimeout(load, 300) }
    // Unique name per mount: a closing channel with the same name could be reused under StrictMode.
    const ch = supabase.channel(`board-${uid()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events' }, refetch)
      .subscribe((status) => { if (status === 'SUBSCRIBED') refetch() })
    const onVisible = () => { if (document.visibilityState === 'visible') refetch() }
    window.addEventListener('online', refetch)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(h)
      window.removeEventListener('online', refetch)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(ch)
    }
  }, [supabase, load])

  const searching = q.trim() !== ''
  const shown = mine ? rows.filter((r) => r.assignee_id === member.id) : rows

  const seg = (v: View) => `min-h-11 flex-1 px-3 text-sm font-semibold ${view === v ? 'bg-[#0052CC] text-white' : 'bg-white text-[#42526E]'}`
  return (
    <main className="space-y-3">
      {created && (
        <div role="status" className="flex items-center justify-between gap-2 rounded bg-[#E3FCEF] p-2 text-[#006644]">
          <span className="font-semibold">{t('banner.created', { n: created.slip })}</span>
          <span className="flex items-center gap-1">
            {created.wa && <a href={created.wa} target={created.wa.startsWith('https:') ? '_blank' : undefined} rel="noopener noreferrer" aria-label={t('banner.whatsapp')}
              className="flex min-h-11 min-w-11 items-center justify-center text-lg">💬</a>}
            <button onClick={() => router.replace('/')} aria-label={t('banner.dismiss')} className="min-h-11 min-w-11 text-lg">✕</button>
          </span>
        </div>
      )}
      {offline && <p role="status" className="rounded-lg bg-amber-100 p-2 text-amber-900">{t('board.offline')}</p>}
      <div className="flex items-center justify-between gap-2">
        <h1 className="truncate text-lg font-bold text-[#172B4D]">{shop.name}</h1>
        <div role="group" className="flex shrink-0 overflow-hidden rounded border border-[#DFE1E6]">
          <button aria-pressed={view === 'board'} onClick={() => pick('board')} className={seg('board')}>{t('home.board')}</button>
          <button aria-pressed={view === 'list'} onClick={() => pick('list')} className={seg('list')}>{t('home.list')}</button>
        </div>
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t('board.search')} aria-label={t('board.search')}
        className="min-h-11 w-full rounded-lg border border-line bg-white px-3" />
      {!isOwner && (
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="size-5" />
          {t('board.mine')}
        </label>
      )}
      {loaded && (searching || view === 'list') && shown.length === 0 && <p className="text-muted">{t('board.empty')}</p>}
      {searching || view === 'list'
        ? <div className="overflow-hidden rounded border border-[#DFE1E6]">
            {sortByDue(shown).map((o) => <ListRow key={o.id} o={o} today={today} isOwner={isOwner} stages={stages} onChanged={load} />)}
          </div>
        : <BoardColumns rows={shown} stages={stages} today={today} isOwner={isOwner} onChanged={load} />}
    </main>
  )
}
