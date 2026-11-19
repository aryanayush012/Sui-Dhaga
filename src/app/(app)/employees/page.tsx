'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT, type Key } from '@/lib/i18n'
import { en } from '@/lib/i18n/en'
import { addEmployee, resetEmployeePin } from './actions'

type Emp = { id: string; name: string; mobile: string; is_active: boolean }
const input = 'min-h-12 w-full rounded-lg border border-line bg-white px-3 text-lg'
const btn = 'min-h-12 rounded-lg border border-line bg-white px-4 text-lg disabled:opacity-50'

export default function EmployeesPage() {
  const { supabase, member } = useSession()
  const { t } = useT()
  const router = useRouter()
  const [list, setList] = useState<Emp[]>([])
  const [form, setForm] = useState({ name: '', mobile: '', pin: '' })
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPin, setResetPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [shown, setShown] = useState<{ name: string; pin: string } | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('members').select('id,name,mobile,is_active').eq('role', 'employee').order('created_at')
    setList(data ?? [])
  }, [supabase])
  useEffect(() => {
    if (member.role !== 'owner') router.replace('/')
    else load()
  }, [member.role, router, load])
  if (member.role !== 'owner') return null

  const msg = (e: string) => t((`emp.err.${e}` in en ? `emp.err.${e}` : 'emp.err.failed') as Key)

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

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('emp.title')}</h1>
      {shown && (
        <p role="status" className="rounded-lg border border-accent bg-white p-3 text-lg font-semibold">
          {t('emp.pinshown', { pin: shown.pin, name: shown.name })}
        </p>
      )}
      {err && <p role="alert" className="text-red-600">{msg(err)}</p>}
      <ul className="flex flex-col gap-3">
        {list.length === 0 && <li className="text-muted">{t('emp.empty')}</li>}
        {list.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 rounded-lg border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div><div className="font-semibold">{e.name}</div><div className="text-muted">{e.mobile}</div></div>
              <button disabled={busy} onClick={() => toggle(e)} aria-pressed={e.is_active}
                className={`${btn} ${e.is_active ? 'border-accent bg-accent text-white' : ''}`}>
                {e.is_active ? t('emp.active') : t('emp.inactive')}
              </button>
            </div>
            {resetId === e.id ? (
              <form className="flex gap-2" onSubmit={(ev) => {
                ev.preventDefault()
                const pin = resetPin
                run(() => resetEmployeePin(e.id, pin), () => { setShown({ name: e.name, pin }); setResetId(null); setResetPin('') })
              }}>
                <input className={input} inputMode="numeric" maxLength={6} required value={resetPin}
                  placeholder={t('emp.newpin')} aria-label={t('emp.newpin')} onChange={(x) => setResetPin(x.target.value.replace(/\D/g, ''))} />
                <button disabled={busy || resetPin.length !== 6} className={btn}>{t('emp.save')}</button>
              </form>
            ) : (
              <button disabled={busy} onClick={() => { setResetId(e.id); setResetPin('') }} className={`${btn} self-start`}>{t('emp.reset')}</button>
            )}
          </li>
        ))}
      </ul>
      <form className="flex flex-col gap-3" onSubmit={(ev) => {
        ev.preventDefault()
        const f = form
        run(() => addEmployee(f), () => { setShown({ name: f.name.trim(), pin: f.pin }); setForm({ name: '', mobile: '', pin: '' }) })
      }}>
        <h2 className="font-semibold">{t('emp.add')}</h2>
        <input className={input} required value={form.name} placeholder={t('emp.name')} aria-label={t('emp.name')}
          onChange={(x) => setForm((s) => ({ ...s, name: x.target.value }))} />
        <input className={input} required inputMode="tel" value={form.mobile} placeholder={t('emp.mobile')} aria-label={t('emp.mobile')}
          onChange={(x) => setForm((s) => ({ ...s, mobile: x.target.value }))} />
        <input className={input} required inputMode="numeric" maxLength={6} value={form.pin} placeholder={t('emp.pin')} aria-label={t('emp.pin')}
          onChange={(x) => setForm((s) => ({ ...s, pin: x.target.value.replace(/\D/g, '') }))} />
        <button disabled={busy} className={`${btn} border-accent bg-accent text-white`}>{t('emp.save')}</button>
      </form>
    </main>
  )
}
