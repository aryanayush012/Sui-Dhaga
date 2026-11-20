'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT, type Key } from '@/lib/i18n'
import { normalizeMobile } from '@/lib/mobile'
import { todayIST } from '@/lib/deadline'
import { whatsappLink, whatsappMessage } from '@/lib/whatsapp'
import { siteUrl } from '@/lib/site'
import { parseAmount } from '@/lib/orderDetail'
import { paymentSummary } from '@/lib/money'
import { GARMENT_TYPES } from '@/lib/garments'
import { addChip, addDays, attachPhoto, buildPayload, garmentSummary, removeChip, type Row } from '@/lib/newOrder'
import { GarmentForm } from '@/components/GarmentForm'
import { PhotoInput } from '@/components/PhotoInput'

const input = 'min-h-12 w-full rounded-lg border border-line bg-white px-3 text-lg'
const KNOWN_ERRORS = ['error.invalid_mobile', 'error.invalid_input', 'error.exceeds_total', 'error.not_owner']

export default function NewOrderPage() {
  const { supabase, member, shop } = useSession()
  const { t, lang } = useT()
  const router = useRouter()
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [due, setDue] = useState(() => addDays(todayIST(), 7))
  const [rack, setRack] = useState('')
  const [garments, setGarments] = useState<Row[]>([])
  const [assignee, setAssignee] = useState('')
  const [total, setTotal] = useState('')
  const [paid, setPaid] = useState('')
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState(0)
  const [saving, setSaving] = useState(false)
  const [mobileErr, setMobileErr] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isOwner = member.role === 'owner'
  useEffect(() => { if (!isOwner) router.replace('/') }, [isOwner, router])
  useEffect(() => {
    if (!isOwner) return
    supabase.from('members').select('id,name').eq('is_active', true).then(({ data }) => setStaff(data ?? []))
  }, [isOwner, supabase])
  if (!isOwner) return null

  const onBusy = (b: boolean) => setBusy((n) => n + (b ? 1 : -1))

  function create() {
    setErr(null)
    const m = normalizeMobile(mobile)
    setMobileErr(!m)
    const tot = total === '' ? null : parseAmount(total), adv = paid === '' ? null : parseAmount(paid)
    if (!m || name.trim() === '' || due === '' || (tot && !tot.ok) || (adv && !adv.ok)) return
    const totalN = tot?.ok ? tot.value : null, advN = adv?.ok ? adv.value : null
    if (totalN !== null && advN !== null && advN > totalN) { setErr(t('error.exceeds_total')); return }
    const payload = buildPayload({ name, mobile: m, due, rack, assignee, total: totalN, advance: advN, notes: '', garments: garments.length ? garments : addChip([], 'other') })
    // Must be opened synchronously in the click, before any await.
    const w = window.open('', '_blank')
    setSaving(true)
    supabase.rpc('create_order', { p: payload }).then(({ data, error }) => {
      if (error) {
        w?.close()
        setSaving(false)
        const k = `error.${error.message}`
        setErr(t(KNOWN_ERRORS.includes(k) ? (k as Key) : 'error.generic'))
        return
      }
      const r = data as { id: string; slip_no: number; tracking_token: string }
      const text = whatsappMessage('created', lang, {
        shopName: shop.name, slipNo: r.slip_no, customerName: payload.customer_name, garmentSummary: garmentSummary(payload.garments),
        dueDate: due, paid: advN ?? 0, balance: paymentSummary(totalN, advN ?? 0).balance, trackingUrl: `${siteUrl()}/t/${r.tracking_token}`,
      })
      const link = whatsappLink(m, text)
      if (w) w.location.href = link
      return supabase.rpc('record_whatsapp_send', { p_order_id: r.id, p_kind: 'created' }).then(({ error: e }) => {
        if (e) console.warn('record_whatsapp_send', e.message)
      }).then(() => router.push(`/?created=${r.slip_no}${w ? '' : `&wa=${encodeURIComponent(link)}`}`))
    }, () => { w?.close(); setSaving(false); setErr(t('error.generic')) })
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
      <div className="flex gap-2">
        <label className="flex min-w-0 flex-[3] flex-col text-sm text-muted">{t('order.due')}
          <input className={`${input} text-black`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="flex min-w-0 flex-[2] flex-col text-sm text-muted">{t('order.rack')}
          <input className={`${input} text-black`} value={rack} onChange={(e) => setRack(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('order.garments')}>
        {GARMENT_TYPES.map((ty) => {
          const g = garments.find((x) => x.type === ty)
          return (
            <span key={ty} className={`flex min-h-12 items-center rounded-full border ${g ? 'border-accent bg-accent text-white' : 'border-line bg-white'}`}>
              <button type="button" aria-pressed={!!g} className="min-h-12 pl-4 pr-3 text-lg" onClick={() => setGarments((p) => addChip(p, ty))}>
                {t(`garment.${ty}` as Key)}{g && g.qty > 1 ? ` × ${g.qty}` : ''}
              </button>
              {g && <button type="button" aria-label={`${t('order.remove')} ${t(`garment.${ty}` as Key)}`} className="min-h-12 min-w-11 pr-2 text-lg"
                onClick={() => setGarments((p) => removeChip(p, ty))}>✕</button>}
            </span>
          )
        })}
      </div>

      <div className="flex gap-4">
        <PhotoInput label={t('garment.cloth')} value={garments[0]?.cloth_photo_path ?? null} onBusy={onBusy}
          onChange={(p) => setGarments((prev) => attachPhoto(prev, 'cloth_photo_path', p))} />
        <PhotoInput label={t('garment.slip_label')} value={garments[0]?.measurement_photo_path ?? null} onBusy={onBusy}
          onChange={(p) => setGarments((prev) => attachPhoto(prev, 'measurement_photo_path', p))} />
      </div>

      <details className="rounded-xl border border-line bg-white p-3">
        <summary className="min-h-12 cursor-pointer py-2 text-lg">{t('order.more')}</summary>
        <div className="flex flex-col gap-3 pt-2">
          <select className={input} aria-label={t('order.assignee')} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{t('order.assignee')}: {t('order.nobody')}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className={input} inputMode="numeric" placeholder={t('order.total')} aria-label={t('order.total')} value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))} />
            <input className={input} inputMode="numeric" placeholder={t('field.paid')} aria-label={t('field.paid')} value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ''))} />
          </div>
          {garments.map((g) => (
            <GarmentForm key={g.key} value={g} onBusy={onBusy}
              onChange={(p) => setGarments((prev) => prev.map((x) => (x.key === g.key ? { ...x, ...p } : x)))}
              onRemove={() => setGarments((prev) => prev.filter((x) => x.key !== g.key))} />
          ))}
        </div>
      </details>

      {err && <p role="alert" className="text-red-600">{err}</p>}
      <button onClick={create} disabled={!ready} className="min-h-14 rounded-lg bg-accent text-xl text-white disabled:opacity-50">
        {saving ? t('order.saving') : busy ? t('photo.uploading') : t('order.save')}
      </button>
    </main>
  )
}
