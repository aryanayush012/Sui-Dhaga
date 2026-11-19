'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT, type Key } from '@/lib/i18n'
import { normalizeMobile } from '@/lib/mobile'
import { todayIST } from '@/lib/deadline'
import { whatsappLink, whatsappMessage } from '@/lib/whatsapp'
import type { GarmentInput, NewOrderInput, PaymentMethod } from '@/lib/types'
import { GarmentForm } from '@/components/GarmentForm'

const newGarment = (): GarmentInput => ({ type: 'pant', qty: 1, measurements: {} })
const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
const toInt = (s: string) => (s.trim() === '' ? null : Math.max(0, Math.floor(Number(s)) || 0))
// Same format as board_orders.garment_summary: qty summed per type, ordered by type.
const summary = (gs: GarmentInput[]) => {
  const m = new Map<string, number>()
  gs.forEach((g) => m.set(g.type, (m.get(g.type) ?? 0) + g.qty))
  return [...m].sort(([a], [b]) => (a < b ? -1 : 1)).map(([ty, q]) => `${q} ${ty}`).join(', ')
}
const input = 'min-h-12 w-full rounded-lg border border-line bg-white px-3 text-lg'
const KNOWN_ERRORS = ['error.invalid_mobile', 'error.invalid_input', 'error.exceeds_total', 'error.not_owner']

type Done = { id: string; slip_no: number; tracking_token: string; mobile: string; name: string; due: string; gs: string; balance: number | null }

export default function NewOrderPage() {
  const { supabase, member, shop } = useSession()
  const { t, lang } = useT()
  const router = useRouter()
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [due, setDue] = useState(() => addDays(todayIST(), 7))
  const [rack, setRack] = useState('')
  const [garments, setGarments] = useState<GarmentInput[]>([newGarment()])
  const [assignee, setAssignee] = useState('')
  const [total, setTotal] = useState('')
  const [advance, setAdvance] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState(0)
  const [saving, setSaving] = useState(false)
  const [mobileErr, setMobileErr] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)

  const isOwner = member.role === 'owner'
  useEffect(() => { if (!isOwner) router.replace('/') }, [isOwner, router])
  useEffect(() => {
    if (!isOwner) return
    supabase.from('members').select('id,name').eq('is_active', true).then(({ data }) => setStaff(data ?? []))
  }, [isOwner, supabase])
  if (!isOwner) return null

  const onBusy = (b: boolean) => setBusy((n) => n + (b ? 1 : -1))

  async function save() {
    const m = normalizeMobile(mobile)
    setMobileErr(!m); setErr(null)
    if (!m) return
    const adv = toInt(advance), tot = toInt(total)
    const payload: NewOrderInput = {
      customer_name: name.trim(), customer_mobile: m, due_date: due,
      rack: rack.trim() || null, assignee_id: assignee || null, total_amount: tot, notes: notes.trim() || null,
      garments: garments.map((g) => ({
        ...g, measurements: Object.fromEntries(Object.entries(g.measurements ?? {}).filter(([, v]) => v.trim() !== '')),
      })),
      advance: adv ? { amount: adv, method } : null,
    }
    setSaving(true)
    const { data, error } = await supabase.rpc('create_order', { p: payload })
    setSaving(false)
    if (error) {
      const k = `error.${error.message}`
      setErr(t(KNOWN_ERRORS.includes(k) ? (k as Key) : 'error.generic'))
      return
    }
    const r = data as { id: string; slip_no: number; tracking_token: string }
    setDone({ ...r, mobile: m, name: payload.customer_name, due, gs: summary(garments), balance: tot === null ? null : tot - (adv ?? 0) })
  }

  async function sendWhatsapp() {
    if (!done) return
    await supabase.rpc('record_whatsapp_send', { p_order_id: done.id, p_kind: 'created' })
    const text = whatsappMessage('created', lang, {
      shopName: shop.name, slipNo: done.slip_no, customerName: done.name, garmentSummary: done.gs, dueDate: done.due,
      balance: done.balance, trackingUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/t/${done.tracking_token}`,
    })
    window.open(whatsappLink(done.mobile, text), '_blank')
    router.push('/')
  }

  if (done) {
    return (
      <main className="flex flex-col items-center gap-6 pt-12 text-center">
        <p className="text-muted">{t('order.saved')}</p>
        <p className="text-sm text-muted">{t('order.slip')}</p>
        <p className="text-7xl font-bold">#{done.slip_no}</p>
        <button onClick={sendWhatsapp} className="min-h-14 w-full rounded-lg bg-accent text-xl text-white">{t('order.whatsapp')}</button>
        <button onClick={() => router.push('/')} className="min-h-12 w-full rounded-lg border border-line bg-white text-lg">{t('order.skip')}</button>
      </main>
    )
  }

  const ready = name.trim() !== '' && mobile !== '' && due !== '' && busy === 0 && !saving
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('order.title')}</h1>
      <input className={input} placeholder={t('order.name')} aria-label={t('order.name')} value={name} onChange={(e) => setName(e.target.value)} />
      <div>
        <input className={input} type="tel" inputMode="numeric" placeholder={t('order.mobile')} aria-label={t('order.mobile')}
          value={mobile} onChange={(e) => { setMobile(e.target.value); setMobileErr(false) }} />
        {mobileErr && <p role="alert" className="text-sm text-red-600">{t('error.invalid_mobile')}</p>}
      </div>
      <label className="flex flex-col text-sm text-muted">{t('order.due')}
        <input className={`${input} text-black`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <input className={input} placeholder={t('order.rack')} aria-label={t('order.rack')} value={rack} onChange={(e) => setRack(e.target.value)} />

      <h2 className="font-semibold">{t('order.garments')}</h2>
      {garments.map((g, i) => (
        <GarmentForm key={i} value={g} onBusy={onBusy}
          onChange={(v) => setGarments(garments.map((x, j) => (j === i ? v : x)))}
          onRemove={garments.length > 1 ? () => setGarments(garments.filter((_, j) => j !== i)) : undefined} />
      ))}
      <button type="button" onClick={() => setGarments([...garments, newGarment()])} className="min-h-12 rounded-lg border border-line bg-white text-lg">{t('order.add_garment')}</button>

      <details className="rounded-xl border border-line bg-white p-3">
        <summary className="min-h-12 cursor-pointer py-2 text-lg">{t('order.more')}</summary>
        <div className="flex flex-col gap-3 pt-2">
          <select className={input} aria-label={t('order.assignee')} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{t('order.assignee')}: {t('order.nobody')}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className={input} inputMode="numeric" placeholder={t('order.total')} aria-label={t('order.total')} value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))} />
          <div className="flex gap-2">
            <input className={input} inputMode="numeric" placeholder={t('order.advance')} aria-label={t('order.advance')} value={advance} onChange={(e) => setAdvance(e.target.value.replace(/\D/g, ''))} />
            <select className={input} aria-label="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {(['cash', 'upi', 'other'] as const).map((m) => <option key={m} value={m}>{t(`pay.${m}` as Key)}</option>)}
            </select>
          </div>
          <textarea className="rounded-lg border border-line p-3 text-lg" rows={2} placeholder={t('order.notes')} aria-label={t('order.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </details>

      {err && <p role="alert" className="text-red-600">{err}</p>}
      <button onClick={save} disabled={!ready} className="min-h-14 rounded-lg bg-accent text-xl text-white disabled:opacity-50">
        {saving ? t('order.saving') : busy ? t('photo.uploading') : t('order.save')}
      </button>
    </main>
  )
}
