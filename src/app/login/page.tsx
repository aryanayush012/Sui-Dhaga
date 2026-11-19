'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { mobileToEmail, normalizeMobile } from '@/lib/mobile'
import { useT } from '@/lib/i18n'
import { clearDeviceData } from '@/lib/board'

const field = 'block w-full min-h-12 rounded-lg border border-line bg-white px-3 text-lg'

function LoginForm() {
  const { t, lang, setLang } = useT()
  const router = useRouter()
  const inactive = useSearchParams().get('inactive') === '1'
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<'login.failed' | 'login.inactive' | null>(inactive ? 'login.inactive' : null)
  const [busy, setBusy] = useState(false)

  // Session without an active member row: the layout sent us here; drop the session.
  useEffect(() => {
    if (inactive) void clearDeviceData().then(() => createBrowserSupabase().auth.signOut())
  }, [inactive])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const m = normalizeMobile(mobile)
    const { error: err } = m
      ? await createBrowserSupabase().auth.signInWithPassword({ email: mobileToEmail(m), password })
      : { error: true }
    if (err) {
      setError('login.failed')
      setBusy(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <button
        type="button"
        onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
        className="self-end min-h-11 min-w-11 rounded-lg border border-line px-4"
      >
        {lang === 'hi' ? 'English' : 'हिन्दी'}
      </button>
      <h1 className="text-3xl font-bold text-accent">{t('app.name')}</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t('login.title')}</h2>
        <label className="flex flex-col gap-1">
          {t('login.mobile')}
          <input className={field} type="tel" inputMode="numeric" autoComplete="username" required
            value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          {t('login.password')}
          <input className={field} type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{t(error)}</p>}
        <button disabled={busy} className="min-h-12 rounded-lg bg-accent px-4 text-lg font-semibold text-white disabled:opacity-60">
          {busy ? t('login.wait') : t('login.submit')}
        </button>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
