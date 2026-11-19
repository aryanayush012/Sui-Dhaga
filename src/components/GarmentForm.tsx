'use client'
import { useState } from 'react'
import { useT, type Key } from '@/lib/i18n'
import { GARMENT_FIELDS, GARMENT_TYPES } from '@/lib/garments'
import type { GarmentInput } from '@/lib/types'
import { PhotoInput } from './PhotoInput'

type Props = { value: GarmentInput; onChange: (patch: Partial<GarmentInput>) => void; onRemove?: () => void; onBusy?: (busy: boolean) => void }

export function GarmentForm({ value: g, onChange, onRemove, onBusy }: Props) {
  const { t } = useT()
  const [mode, setMode] = useState<'photo' | 'type'>('photo')
  const set = onChange
  const fields = GARMENT_FIELDS[g.type]
  const seg = (on: boolean) => `min-h-12 flex-1 rounded-lg border px-3 text-lg ${on ? 'border-accent bg-accent text-white' : 'border-line bg-white'}`
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3">
      <div className="flex flex-wrap gap-2">
        {GARMENT_TYPES.map((ty) => (
          <button key={ty} type="button" aria-pressed={g.type === ty} className={seg(g.type === ty)}
            onClick={() => {
              if (ty === g.type) return
              const keep = GARMENT_FIELDS[ty]
              set({ type: ty, measurements: Object.fromEntries(Object.entries(g.measurements ?? {}).filter(([k]) => keep.includes(k))) })
            }}>{t(`garment.${ty}` as Key)}</button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span>{t('garment.qty')}</span>
        <button type="button" aria-label="-" className="size-12 rounded-lg border border-line text-2xl" onClick={() => set({ qty: Math.max(1, g.qty - 1) })}>-</button>
        <span className="w-8 text-center text-xl">{g.qty}</span>
        <button type="button" aria-label="+" className="size-12 rounded-lg border border-line text-2xl" onClick={() => set({ qty: g.qty + 1 })}>+</button>
        {onRemove && <button type="button" onClick={onRemove} className="ml-auto min-h-12 px-2 text-red-600 underline">{t('order.remove')}</button>}
      </div>
      <PhotoInput label={t('garment.cloth')} value={g.cloth_photo_path ?? null} onBusy={onBusy} onChange={(p) => set({ cloth_photo_path: p })} />
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">{t('garment.measurements')}</span>
        <div className="flex gap-2">
          <button type="button" className={seg(mode === 'photo')} onClick={() => setMode('photo')}>{t('garment.slip_photo')}</button>
          <button type="button" className={seg(mode === 'type')} onClick={() => setMode('type')}>{t('garment.type_in')}</button>
        </div>
        {mode === 'photo' ? (
          <PhotoInput label={t('garment.slip_label')} value={g.measurement_photo_path ?? null} onBusy={onBusy} onChange={(p) => set({ measurement_photo_path: p })} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => (
              <label key={f} className="flex flex-col text-sm text-muted">
                {t(`field.${f}` as Key)}
                <input inputMode="decimal" className="min-h-12 rounded-lg border border-line px-3 text-lg text-black"
                  value={g.measurements?.[f] ?? ''} onChange={(e) => set({ measurements: { ...g.measurements, [f]: e.target.value } })} />
              </label>
            ))}
          </div>
        )}
      </div>
      <label className="flex flex-col text-sm text-muted">
        {t('garment.instructions')}
        <textarea rows={2} className="rounded-lg border border-line p-3 text-lg text-black" value={g.instructions ?? ''} onChange={(e) => set({ instructions: e.target.value })} />
      </label>
    </div>
  )
}
