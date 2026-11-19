import { translate } from '@/lib/i18n/translate'

export default function NotActive() {
  return (
    <main className="mx-auto max-w-md space-y-6 p-4 pt-16 text-center">
      {(['hi', 'en'] as const).map((l) => (
        <section key={l} lang={l}>
          <h1 className="text-2xl font-bold">{translate(l, 'track.inactive')}</h1>
          <p className="mt-2 text-lg text-gray-600">{translate(l, 'track.inactive_hint')}</p>
        </section>
      ))}
    </main>
  )
}
