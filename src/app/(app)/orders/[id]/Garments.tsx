'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/lib/session'
import { useT, type Key } from '@/lib/i18n'
import { en } from '@/lib/i18n/en'
import { errorKey } from '@/lib/ui'
import type { GarmentInput } from '@/lib/types'
import { GarmentForm } from '@/components/GarmentForm'
import { Sheet } from '@/components/Sheet'

export type Garment = GarmentInput & { id: string }
type Call = (fn: string, args: Record<string, unknown>) => Promise<string | null>

function Thumb({ path, label, onOpen }: { path: string; label: string; onOpen: (url: string, label: string) => void }) {
  const { supabase } = useSession()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    supabase.storage.from('photos').createSignedUrl(path, 3600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null) })
    return () => { live = false }
  }, [path, supabase])
  if (!url) return <div className="size-20 rounded bg-[#F4F5F7]" />
  return (
    <button type="button" aria-label={label} onClick={() => onOpen(url, label)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="size-20 rounded object-cover" />
    </button>
  )
}

export function Garments({ orderId, garments, editable, call }: { orderId: string; garments: Garment[]; editable: boolean; call?: Call }) {
  const { t } = useT()
  const [full, setFull] = useState<{ url: string; label: string } | null>(null)
  const [edit, setEdit] = useState<GarmentInput | null>(null)
  const [gBusy, setGBusy] = useState(0) // counter: two PhotoInputs can upload at once
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const open = (g: GarmentInput) => { setEdit(g); setErr('') }
  const close = () => setEdit(null)

  async function run(fn: string, args: Record<string, unknown>) {
    if (!call) return
    setBusy(true); setErr('')
    const code = await call(fn, args)
    setBusy(false)
    if (code) setErr(code); else close()
  }
  const save = () => edit && run('save_garment', { p_order_id: orderId, p: {
    ...edit, measurements: Object.fromEntries(Object.entries(edit.measurements ?? {}).filter(([, v]) => v.trim() !== '')),
  } })
  const remove = () => edit?.id && window.confirm(t('od.confirm_delete')) && run('delete_garment', { p_garment_id: edit.id })

  return (
    <section className="space-y-2">
      {garments.map((g) => (
        <div key={g.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-sm font-semibold text-[#172B4D]">{g.qty} × {t(`garment.${g.type}` as Key)}</span>
          {g.cloth_photo_path && <Thumb path={g.cloth_photo_path} label={t('garment.cloth')} onOpen={(url, label) => setFull({ url, label })} />}
          {g.measurement_photo_path && <Thumb path={g.measurement_photo_path} label={t('garment.slip_label')} onOpen={(url, label) => setFull({ url, label })} />}
          {editable && call && (
            <button type="button" aria-label={t('od.edit')} className="h-11 w-11 rounded text-[#42526E] hover:bg-[#F4F5F7]"
              onClick={() => open({ ...g, measurements: g.measurements ?? {} })}>✎</button>
          )}
        </div>
      ))}
      {editable && call && (
        <button type="button" className="min-h-11 px-1 text-sm font-semibold text-[#0052CC]"
          onClick={() => open({ type: 'pant', qty: 1, measurements: {} })}>{t('order.add_garment')}</button>
      )}

      <Sheet open={!!full} onClose={() => setFull(null)} title={full?.label ?? ''}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {full && <img src={full.url} alt={full.label} className="w-full rounded" />}
      </Sheet>
      <Sheet open={!!edit} onClose={close} title={t('order.garments')}>
        {edit && (
          <div className="space-y-3">
            <GarmentForm value={edit} onBusy={(b) => setGBusy((n) => n + (b ? 1 : -1))} onChange={(p) => setEdit((prev) => (prev ? { ...prev, ...p } : prev))} />
            {err && <p role="alert" className="text-sm text-[#BF2600]">{t(errorKey(err, en) as Key)}</p>}
            <button type="button" className="min-h-11 w-full rounded bg-[#0052CC] font-semibold text-white disabled:opacity-50" disabled={busy || gBusy > 0} onClick={save}>
              {gBusy > 0 ? t('photo.uploading') : t('od.save')}
            </button>
            {edit.id && garments.length > 1 && (
              <button type="button" className="min-h-11 w-full rounded bg-[#FFEBE6] font-semibold text-[#BF2600] disabled:opacity-50" disabled={busy} onClick={remove}>{t('od.delete')}</button>
            )}
          </div>
        )}
      </Sheet>
    </section>
  )
}

export function Measurements({ garments }: { garments: Garment[] }) {
  const { t } = useT()
  return (
    <div className="space-y-2">
      {garments.map((g) => {
        const m = Object.entries(g.measurements ?? {}).filter(([, v]) => v)
        return (
          <div key={g.id} className="text-sm text-[#172B4D]">
            <p className="font-semibold">{g.qty} × {t(`garment.${g.type}` as Key)}</p>
            <p>{m.length ? m.map(([k, v]) => `${t(`field.${k}` as Key)} ${v}`).join(' · ') : '—'}</p>
            {g.instructions && <p className="text-[#5E6C84]">{g.instructions}</p>}
          </div>
        )
      })}
    </div>
  )
}
