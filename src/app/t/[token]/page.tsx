import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { translate, stageLabel, type Lang, type Key } from '@/lib/i18n/translate'
import { paymentSummary } from '@/lib/money'
import { fmtDate } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

type Tracking = {
  shop_name: string; slip_no: number; garment_summary: string; stage_name: string; stage_names: string[]
  is_ready: boolean; special_state: 'cancelled' | 'delivered' | null
  due_date: string; total_amount: number | null; paid_amount: number
}

// Anon client: get_tracking is the only thing anon may call.
const load = cache(async (token: string): Promise<Tracking | null> => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data, error } = await db.rpc('get_tracking', { p_token: token })
  if (error) throw error
  return (data as Tracking | null) ?? null
})

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const o = await load((await params).token)
  return o ? { title: `${o.shop_name} · Order #${o.slip_no} · ${o.stage_name}` } : {}
}

const STATE_KEY = { cancelled: 'status.rejected', delivered: 'status.delivered' } as const

function View({ o, lang }: { o: Tracking; lang: Lang }) {
  const t = (k: Key, v?: Record<string, string | number>) => translate(lang, k, v)
  const cur = o.stage_names.indexOf(o.stage_name)
  const { balance } = paymentSummary(o.total_amount, o.paid_amount)
  const state = o.special_state
  const headline = state ? t(STATE_KEY[state]) : o.is_ready ? t('track.ready') : stageLabel(o.stage_name, (k) => t(k))
  const tone = state === 'cancelled' ? 'bg-red-100 text-red-800'
    : o.is_ready || state === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
  return (
    <section lang={lang} className="space-y-4">
      <p className="text-lg font-semibold text-gray-600">{t('track.order', { n: o.slip_no })}</p>
      <p className="text-xl">{o.garment_summary}</p>
      <p className={`rounded-2xl px-4 py-4 text-center text-2xl font-bold ${tone}`}>{headline}</p>
      {!state && (
        <ol className="flex gap-1">
          {o.stage_names.map((n, i) => (
            <li key={n} className="flex-1 text-center">
              <div className={`h-3 rounded-full ${i <= cur ? 'bg-green-600' : 'bg-gray-200'}`} />
              <span className={`mt-1 block text-sm ${i === cur ? 'font-bold' : 'text-gray-500'}`}>
                {stageLabel(n, (k) => t(k))}
              </span>
            </li>
          ))}
        </ol>
      )}
      {!state && !o.is_ready && <p className="text-lg">{t('track.expected', { date: fmtDate(o.due_date) })}</p>}
      {state !== 'cancelled' && balance !== null && (
        <p className="text-xl font-semibold">{t('track.money', { paid: o.paid_amount, n: balance })}</p>
      )}
    </section>
  )
}

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const o = await load((await params).token)
  if (!o) notFound()
  return (
    <main className="mx-auto max-w-md space-y-8 p-4">
      <h1 className="text-3xl font-bold">{o.shop_name}</h1>
      <View o={o} lang="hi" />
      <hr />
      <View o={o} lang="en" />
    </main>
  )
}
