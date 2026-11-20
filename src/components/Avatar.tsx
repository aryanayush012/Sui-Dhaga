import { avatarStyle } from '@/lib/ui'

export function Avatar({ name }: { name: string | null }) {
  const a = name?.trim() ? avatarStyle(name) : null
  return (
    <span
      title={name ?? undefined}
      style={{ background: a?.color ?? '#DFE1E6' }}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${a ? 'text-white' : 'text-[#42526E]'}`}
    >
      {a?.initial ?? '—'}
    </span>
  )
}
