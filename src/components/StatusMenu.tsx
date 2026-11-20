'use client'
import { useRef, useState } from 'react'
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
  const [right, setRight] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const toggle = () => {
    const r = trigger.current?.getBoundingClientRect()
    setRight(!!r && r.right > window.innerWidth / 2) // keep the menu on-screen at 360px
    setOpen((o) => !o)
  }
  return (
    <div className="relative inline-block" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button ref={trigger} type="button" disabled={disabled} aria-haspopup="true" aria-expanded={open} onClick={toggle}
        className="inline-flex min-h-11 items-center gap-1 disabled:opacity-50">
        <Lozenge tone={toneOf(current)}>{labelOf(current)}</Lozenge><span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className={`absolute ${right ? 'right-0' : 'left-0'} z-50 mt-1 min-w-40 max-w-[calc(100vw-24px)] rounded bg-white py-1 shadow-lg ring-1 ring-black/10`}>
            {options.map((o, i) => (
              <li key={i}>
                <button type="button" disabled={disabled} aria-current={same(o, current) || undefined}
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
