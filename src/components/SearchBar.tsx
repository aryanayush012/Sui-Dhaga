'use client'
import { useT } from '@/lib/i18n'

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT()
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={t('board.search')} aria-label={t('board.search')}
      className="min-h-11 w-full rounded-lg border border-line bg-white px-3" />
  )
}
