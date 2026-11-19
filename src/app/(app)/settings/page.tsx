'use client'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT } from '@/lib/i18n'

// Minimal for now: language + logout (all an employee sees). Owner shop fields come later.
export default function SettingsPage() {
  const { supabase, member } = useSession()
  const { t, lang, setLang } = useT()
  const router = useRouter()
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
      <button
        onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); router.refresh() }}
        className={`${btn} border-line bg-white`}>
        {t('settings.logout')}
      </button>
    </main>
  )
}
