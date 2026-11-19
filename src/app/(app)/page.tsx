'use client'
import { useSession } from '@/lib/session'
import { useT } from '@/lib/i18n'

// Placeholder; the real board comes in a later task.
export default function BoardPage() {
  const { shop } = useSession()
  const { t } = useT()
  return (
    <main>
      <h1 className="text-2xl font-bold">{shop.name}</h1>
      <p className="text-muted">{t('board.title')}</p>
    </main>
  )
}
