'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { clearDeviceData } from '@/lib/board'
import { useT, type Key } from '@/lib/i18n'
import { en } from '@/lib/i18n/en'
import { PhotoInput } from '@/components/PhotoInput'
import { Sheet } from '@/components/Sheet'
import { Avatar } from '@/components/Avatar'
import { addEmployee, resetEmployeePin } from './actions'

type Emp = { id: string; name: string; mobile: string; is_active: boolean }
type SheetState = 'add' | 'shop' | { reset: Emp } | null
const input = 'min-h-12 w-full rounded-lg border border-line bg-white px-3 text-lg'
const btn = 'min-h-12 rounded-lg border border-line bg-white px-4 text-lg disabled:opacity-50'
const primary = `${btn} border-[#0052CC] bg-[#0052CC] text-white`
const card = 'rounded-lg border border-line bg-white p-3'
const digits = (s: string) => s.replace(/\D/g, '')

export default function SettingsPage() {
  const { supabase, member, shop } = useSession()
  const { t, lang, setLang } = useT()
  const router = useRouter()
  const owner = member.role === 'owner'
  const [list, setList] = useState<Emp[]>([])
  const [sheet, setSheet] = useState<SheetState>(null)
  const [form, setForm] = useState({ name: '', mobile: '', pin: '' })
  const [pin, setPin] = useState('')
  const [f, setF] = useState({ name: shop.name, address: shop.address ?? '', logo: shop.logo_url, language: shop.language })
  const [busy, setBusy] = useState(false)
  const [upl, setUpl] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [shown, setShown] = useState<{ name: string; pin: string } | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('members').select('id,name,mobile,is_active').eq('role', 'employee').order('created_at')
    setList(data ?? [])
  }, [supabase])
  useEffect(() => { if (owner) load() }, [owner, load])

  const msg = (e: string) => t((`emp.err.${e}` in en ? `emp.err.${e}` : 'emp.err.failed') as Key)
  const open = (s: SheetState) => { setErr(null); setSheet(s) }
  const close = () => { if (!busy) setSheet(null) }

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, after: () => void) {
    setBusy(true); setErr(null)
    try {
      const r = await fn()
      if (r.ok) { after(); await load() } else setErr(r.error)
    } catch { setErr('failed') } finally { setBusy(false) }
  }

  const toggle = (e: Emp) => run(async () => {
    const { error } = await supabase.rpc('set_member_active', { p_member_id: e.id, p_active: !e.is_active })
    return error ? { ok: false as const, error: 'failed' } : { ok: true as const }
  }, () => {})

  async function saveShop(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true); setErr(null)
    try {
      const { data, error } = await supabase.from('shops')
        .update({ name: f.name.trim(), address: f.address.trim() || null, logo_url: f.logo, language: f.language })
        .eq('id', shop.id).select('id')
      if (error || !data?.length) setErr('failed')
      else { setSheet(null); router.refresh() }
    } catch { setErr('failed') } finally { setBusy(false) }
  }

  async function logout() {
    setBusy(true)
    try { await clearDeviceData(); await supabase.auth.signOut(); router.replace('/login'); router.refresh() } finally { setBusy(false) }
  }

  const error = err && <p role="alert" className="text-red-600">{msg(err)}</p>
  const resetting = typeof sheet === 'object' && sheet !== null ? sheet.reset : null

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      {shown && (
        <p role="status" className="rounded-lg border border-accent bg-white p-3 text-lg font-semibold">
          {t('emp.pinshown', { pin: shown.pin, name: shown.name })}
        </p>
      )}
      {!sheet && error}

      {owner && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('settings.staff')}</h2>
          {list.length === 0 && <p className="text-muted">{t('emp.empty')}</p>}
          <ul className="flex flex-col gap-2">
            {list.map((e) => (
              <li key={e.id} className={`${card} flex items-center gap-3`}>
                <Avatar name={e.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{e.name}</div>
                  <div className="text-muted">{e.mobile}</div>
                </div>
                <button disabled={busy} onClick={() => toggle(e)} aria-pressed={e.is_active}
                  aria-label={`${e.name}: ${t(e.is_active ? 'emp.active' : 'emp.inactive')}`}
                  className={`${btn} ${e.is_active ? 'border-accent bg-accent text-white' : ''}`}>
                  {e.is_active ? t('emp.active') : t('emp.inactive')}
                </button>
                <button disabled={busy} aria-label={`${t('emp.reset')}: ${e.name}`}
                  onClick={() => { setPin(''); setShown(null); open({ reset: e }) }} className={`${btn} w-12 px-0`}>⋯</button>
              </li>
            ))}
          </ul>
          <button onClick={() => { setForm({ name: '', mobile: '', pin: '' }); setShown(null); open('add') }} className={btn}>+ {t('emp.add')}</button>
        </section>
      )}

      {owner && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('settings.shop')}</h2>
          <button onClick={() => open('shop')} className={`${card} flex min-h-12 items-center justify-between text-lg`}>
            <span className="truncate font-semibold">{shop.name}</span>
            <span className="text-[#0052CC]">{t('settings.edit')}</span>
          </button>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('settings.app')}</h2>
        <p className="text-muted">{member.name}</p>
        <div className="flex gap-2" role="group" aria-label={t('settings.language')}>
          {(['hi', 'en'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
              className={`${btn} flex-1 ${lang === l ? 'border-accent bg-accent text-white' : ''}`}>
              {l === 'hi' ? 'हिन्दी' : 'English'}
            </button>
          ))}
        </div>
        <button disabled={busy} onClick={logout} className={btn}>{t('settings.logout')}</button>
      </section>

      <Sheet open={sheet === 'add'} onClose={close} title={t('emp.add')}>
        <form className="flex flex-col gap-3" onSubmit={(ev) => {
          ev.preventDefault()
          const x = form
          // explicit fields only: the server action must never receive spread client state
          run(() => addEmployee({ name: x.name, mobile: x.mobile, pin: x.pin }), () => { setShown({ name: x.name.trim(), pin: x.pin }); setSheet(null) })
        }}>
          <input className={input} required value={form.name} placeholder={t('emp.name')} aria-label={t('emp.name')}
            onChange={(x) => setForm((s) => ({ ...s, name: x.target.value }))} />
          <input className={input} required inputMode="tel" value={form.mobile} placeholder={t('emp.mobile')} aria-label={t('emp.mobile')}
            onChange={(x) => setForm((s) => ({ ...s, mobile: x.target.value }))} />
          <input className={input} required inputMode="numeric" maxLength={6} value={form.pin} placeholder={t('emp.pin')} aria-label={t('emp.pin')}
            onChange={(x) => setForm((s) => ({ ...s, pin: digits(x.target.value) }))} />
          {error}
          <button disabled={busy || form.pin.length !== 6} className={primary}>{t('emp.save')}</button>
        </form>
      </Sheet>

      <Sheet open={!!resetting} onClose={close} title={resetting ? `${t('emp.reset')}: ${resetting.name}` : ''}>
        {resetting && (
          <form className="flex flex-col gap-3" onSubmit={(ev) => {
            ev.preventDefault()
            const p = pin
            run(() => resetEmployeePin(resetting.id, p), () => { setShown({ name: resetting.name, pin: p }); setSheet(null); setPin('') })
          }}>
            <input className={input} inputMode="numeric" maxLength={6} required value={pin} placeholder={t('emp.newpin')} aria-label={t('emp.newpin')}
              onChange={(x) => setPin(digits(x.target.value))} />
            {error}
            <button disabled={busy || pin.length !== 6} className={primary}>{t('emp.save')}</button>
          </form>
        )}
      </Sheet>

      <Sheet open={sheet === 'shop'} onClose={close} title={t('settings.shop')}>
        <form onSubmit={saveShop} className="flex flex-col gap-3">
          <input className={input} required value={f.name} aria-label={t('settings.shopname')} placeholder={t('settings.shopname')}
            onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />
          <input className={input} value={f.address} aria-label={t('settings.address')} placeholder={t('settings.address')}
            onChange={(e) => setF((s) => ({ ...s, address: e.target.value }))} />
          <PhotoInput label={t('settings.logo')} value={f.logo} onBusy={setUpl} onChange={(p) => setF((s) => ({ ...s, logo: p }))} />
          <select className={input} value={f.language} aria-label={t('settings.defaultlang')}
            onChange={(e) => setF((s) => ({ ...s, language: e.target.value }))}>
            <option value="hi">हिन्दी</option>
            <option value="en">English</option>
          </select>
          {error}
          <button disabled={busy || upl} className={primary}>{t('settings.save')}</button>
        </form>
      </Sheet>
    </main>
  )
}
