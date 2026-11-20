import type { ReactNode } from 'react'
import { TONES, type Tone } from '@/lib/ui'

export function Lozenge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold uppercase leading-4 ${TONES[tone]}`}>
      {children}
    </span>
  )
}
