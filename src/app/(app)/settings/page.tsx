'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { clearDeviceData } from '@/lib/board'
import { useT } from '@/lib/i18n'
import { PhotoInput } from '@/components/PhotoInput'

export default function SettingsPage() {
  const { supabase, member, shop } = useSession()
  const { t, lang, setLang } = useT()
  const router = useRouter()
  const [f, setF] = useState({ name: shop.name, address: shop.address ?? '', logo: shop.logo_url, language: shop.language })
  const [busy, setBusy] = useState(false)
  const [upl, setUpl] = useState(false)
  const [status, setStatus] = useState<'saved' | 'failed' | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setStatus(null)
    const { error } = await supabase.from('shops')
      .update({ name: f.name.trim(), address: f.address.trim() || null, logo_url: f.logo, language: f.language }).eq('id', shop.id)
    setBusy(false)
    setStatus(error ? 'failed' : 'saved')
    if (!error) router.refresh()
  }

  const input = 'min-h-12 w-full rounded-lg border border-line bg-white px-3 text-lg'
  const btn = 'min-h-12 flex-1 rounded-lg border px-4 text-lg'
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      <p className="text-muted">{member.name}</p>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('settings.language')}</h2>
        <div className="flex gap-2">
          {(['hi', 'en'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
              className={`${btn} ${lang === l ? 'border-accent bg-accent text-white' : 'border-line bg-white'}`}>
              {l === 'hi' ? 'हिन्दी' : 'English'}
            </button>
          ))}
        </div>
      </section>
      {member.role === 'owner' && (
        <form onSubmit={save} className="flex flex-col gap-3">
          <h2 className="font-semibold">{t('settings.shop')}</h2>
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
          <button disabled={busy || upl} className={`${btn} flex-none border-accent bg-accent text-white disabled:opacity-50`}>{t('settings.save')}</button>
          {status && (
            <p role={status === 'failed' ? 'alert' : 'status'} className={status === 'failed' ? 'text-red-600' : 'text-muted'}>
              {t(status === 'failed' ? 'settings.failed' : 'settings.saved')}
            </p>
          )}
        </form>
      )}
      <button
        onClick={async () => { await clearDeviceData(); await supabase.auth.signOut(); router.replace('/login'); router.refresh() }}
        className={`${btn} border-line bg-white`}>
        {t('settings.logout')}
      </button>
    </main>
  )
}
