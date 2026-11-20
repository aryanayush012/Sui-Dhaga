'use client'
import { useEffect, useState } from 'react'
import { en } from '@/lib/i18n/en'
import { useT, type Key } from '@/lib/i18n'
import { errorKey } from '@/lib/ui'

type Props = {
  label: string; value: string; display?: string; editable: boolean
  input: 'text' | 'tel' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  onSave: (v: string) => Promise<string | null>
  before?: (v: string) => void
  startEditing?: number // bump to open edit mode from outside
  link?: string // display becomes this link (e.g. tel:) and a ✎ button starts editing
}

export function InlineField({ label, value, display, editable, input, options, onSave, before, link, startEditing = 0 }: Props) {
  const { t } = useT()
  const [draft, setDraft] = useState<string | null>(null) // null = not editing; input falls back to live value
  useEffect(() => { if (startEditing) setDraft((d) => d ?? value) }, [startEditing]) // eslint-disable-line react-hooks/exhaustive-deps
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const editing = draft !== null
  const close = () => { setDraft(null); setErr(null) }
  const save = async () => {
    if (saving) return
    before?.(draft ?? value) // sync, inside the click/keypress, so window.open stays in the user gesture
    setErr(null)
    setSaving(true)
    let code: string | null
    try { code = await onSave(draft ?? value) } catch { code = 'generic' } finally { setSaving(false) }
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
            <select autoFocus value={draft ?? value} onChange={(e) => setDraft(e.target.value)} className={cls}>
              {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input autoFocus type={input} inputMode={input === 'tel' ? 'tel' : undefined} value={draft ?? value} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); else if (e.key === 'Escape') close() }} className={cls} />
          )}
          <button type="button" aria-label={t('ui.save')} disabled={saving} onClick={save} className={`${btn} bg-[#0052CC] text-white`}>✓</button>
          <button type="button" aria-label={t('ui.cancel')} onClick={close} className={`${btn} bg-[#F4F5F7] text-[#42526E]`}>✕</button>
        </div>
      ) : link ? (
        <div className="flex items-center">
          <a href={link} className="flex min-h-11 flex-1 items-center px-1 text-base text-[#0052CC] underline">{display ?? (value || '—')}</a>
          {editable && <button type="button" aria-label={`${t('od.edit')} ${label}`} onClick={() => setDraft(value)} className="h-11 w-11 rounded text-[#42526E] hover:bg-[#F4F5F7]">✎</button>}
        </div>
      ) : (
        <button type="button" disabled={!editable} onClick={() => setDraft(value)}
          className="min-h-11 w-full rounded px-1 text-left text-base enabled:hover:bg-[#F4F5F7]">
          {display ?? (value || '—')}
        </button>
      )}
      {err && <p role="alert" className="text-sm text-[#BF2600]">{t(errorKey(err, en) as Key)}</p>}
    </div>
  )
}
