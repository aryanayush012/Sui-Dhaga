'use client'
import { useState } from 'react'
import { Lozenge } from './Lozenge'
import type { StatusTarget } from '@/lib/status'
import type { Tone } from '@/lib/ui'

type Props = {
  options: StatusTarget[]; current: StatusTarget
  labelOf: (t: StatusTarget) => string; toneOf: (t: StatusTarget) => Tone
  disabled?: boolean; onPick: (t: StatusTarget) => void
}
const same = (a: StatusTarget, b: StatusTarget) => JSON.stringify(a) === JSON.stringify(b)

export function StatusMenu({ options, current, labelOf, toneOf, disabled, onPick }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 disabled:opacity-50">
        <Lozenge tone={toneOf(current)}>{labelOf(current)}</Lozenge><span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul role="menu" className="absolute left-0 z-50 mt-1 min-w-40 rounded bg-white py-1 shadow-lg ring-1 ring-black/10">
            {options.map((o, i) => (
              <li key={i} role="none">
                <button type="button" role="menuitem" disabled={disabled} aria-current={same(o, current)}
                  onClick={() => { setOpen(false); onPick(o) }} // sync: callers open WhatsApp in this click
                  className="flex min-h-11 w-full items-center px-3 text-left hover:bg-[#F4F5F7]">
                  <Lozenge tone={toneOf(o)}>{labelOf(o)}</Lozenge>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
