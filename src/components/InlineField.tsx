'use client'
import { useState } from 'react'
import { en } from '@/lib/i18n/en'
import { useT, type Key } from '@/lib/i18n'
import { errorKey } from '@/lib/ui'

type Props = {
  label: string; value: string; display?: string; editable: boolean
  input: 'text' | 'tel' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  onSave: (v: string) => Promise<string | null>
  before?: () => void
}

export function InlineField({ label, value, display, editable, input, options, onSave, before }: Props) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const close = () => { setEditing(false); setErr(null) }
  const save = async () => {
    if (saving) return
    before?.() // sync, inside the click/keypress, so window.open stays in the user gesture
    setSaving(true)
    const code = await onSave(draft)
    setSaving(false)
    if (code) setErr(code); else close()
  }
  const btn = 'h-11 w-11 shrink-0 rounded text-lg font-bold disabled:opacity-40'
  const cls = 'h-11 min-w-0 flex-1 rounded border border-[#0052CC] px-2 text-base'

  return (
    <div className="py-2">
      <div className="text-[11px] font-bold uppercase text-[#5E6C84]">{label}</div>
      {editing ? (
        <div className="flex items-center gap-1">
          {input === 'select' ? (
            <select autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className={cls}>
              {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input autoFocus type={input} inputMode={input === 'tel' ? 'tel' : undefined} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); else if (e.key === 'Escape') close() }} className={cls} />
          )}
          <button type="button" aria-label={t('ui.save')} disabled={saving} onClick={save} className={`${btn} bg-[#0052CC] text-white`}>✓</button>
          <button type="button" aria-label={t('ui.cancel')} onClick={close} className={`${btn} bg-[#F4F5F7] text-[#42526E]`}>✕</button>
        </div>
      ) : (
        <button type="button" disabled={!editable} onClick={() => { setDraft(value); setEditing(true) }}
          className="min-h-11 w-full rounded px-1 text-left text-base enabled:hover:bg-[#F4F5F7]">
          {display ?? (value || '—')}
        </button>
      )}
      {err && <p role="alert" className="text-sm text-[#BF2600]">{t(errorKey(err, en) as Key)}</p>}
    </div>
  )
}
